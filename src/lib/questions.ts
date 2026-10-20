import "server-only";
import { evaluateFact, rankContacts, type Claim, type Context, type Feedback, type KnowledgeBase, type Person } from "@/trust-engine";
import { allFeedback, now, saveFeedback } from "@/lib/trust-server";
import { liveKb, recordChange, reporterOf, unconfirmedReport, type LedgerEntry } from "@/lib/live";
import { canReadClaim, canUseContext } from "@/lib/access";
import { store } from "@/lib/store";

// "Ask Jan to confirm": a question to one person about one claim.
// Asking is a signal of doubt, never evidence: it does not move a score. The answer does:
// ✓ and ✗ go through the same feedback as any vote, "not my area" teaches the brain whom not to ask.

const DAY = 86_400_000;
export const BUDGET_PER_WEEK = 3; // questions one person can receive per week: attention is scarce
export const FORWARD_AFTER_MS = 2 * DAY; // no answer in two days: ask the next person
const MAX_QUESTIONS = 2000;

export type QuestionStatus = "open" | "confirmed" | "wrong" | "not_mine" | "forwarded";
export type Question = {
  id: string;
  claimId: string;
  factKey: string;
  factLabel: string;
  value: string;
  quote: string;
  source: string;
  context: Context;
  from: string; // who asked: always the session user
  to: string; // who is asked: picked by the server, never by the browser
  askedAt: string;
  status: QuestionStatus;
  answeredAt?: string;
  forwardedTo?: string; // the next question, when this one was declined or went unanswered
};

export async function allQuestions(): Promise<Question[]> {
  return (await store.hvals("questions")).map((v) => JSON.parse(v) as Question);
}
const save = (q: Question) => store.hset("questions", q.id, JSON.stringify(q));

// Everyone who already declined or was already asked about this claim, so a question never goes round in circles.
const askedAbout = (qs: Question[], claimId: string) => new Set(qs.filter((q) => q.claimId === claimId).map((q) => q.to));
export const declinedFor = (qs: Question[], factKey: string) => new Set(qs.filter((q) => q.factKey === factKey && q.status === "not_mine").map((q) => q.to));

// The best person to ask: the top of "who to contact" for this case, minus the asker, the claim's own
// reporter, people already asked, people who said "not my area", and people over their weekly budget.
async function pickRecipient(claim: Claim, ctx: Context, from: string, k: KnowledgeBase, fb: Feedback[], qs: Question[]): Promise<Person | null> {
  const fact = k.facts.find((f) => f.key === claim.factKey);
  if (!fact) return null;
  const result = evaluateFact(fact, k, ctx, fb, now());
  const vouched = { ...k, claims: k.claims.filter((c) => !unconfirmedReport(c, fb, k.people)) };
  const { ranked } = rankContacts(result, ctx, vouched, fb, now(), { declined: declinedFor(qs, claim.factKey) });
  const skip = new Set([from, reporterOf(claim), ...askedAbout(qs, claim.id)]);
  const weekAgo = Date.now() - 7 * DAY;
  // Something said in a meeting is best confirmed by the person who said it.
  const speaker = claim.source.type === "meeting" && claim.author ? k.people.find((p) => p.id === claim.author && !p.left) : undefined;
  const candidates = [...(speaker ? [{ person: speaker }] : []), ...ranked];
  for (const c of candidates) {
    if (skip.has(c.person.id)) continue;
    if (!canReadClaim(c.person, claim, k) || !canUseContext(c.person, ctx, k)) continue;
    const load = qs.filter((q) => q.to === c.person.id && Date.parse(q.askedAt) > weekAgo).length;
    if (load >= BUDGET_PER_WEEK) continue;
    return c.person;
  }
  return null;
}

// Who a question about this claim would go to right now, so the button can name them before anyone clicks.
export async function previewRecipient(user: Person, claimId: string, ctx: Context): Promise<Person | null> {
  const [k, fb, qs] = await Promise.all([liveKb(), allFeedback(), allQuestions()]);
  const claim = k.claims.find((c) => c.id === claimId);
  if (!claim || !canReadClaim(user, claim, k)) return null;
  return pickRecipient(claim, ctx, user.id, k, fb, qs);
}

export type AskOutcome = { ok: true; question: Question } | { ok: false; status: number; error: string };

export async function askToConfirm(user: Person, claimId: string, ctx: Context, forwardedFrom?: Question): Promise<AskOutcome> {
  const [k, fb, qs] = await Promise.all([liveKb(), allFeedback(), allQuestions()]);
  const claim = k.claims.find((c) => c.id === claimId);
  // Unknown claim or a claim this user may not see: same answer, so ids cannot be probed.
  if (!claim || !canReadClaim(user, claim, k)) return { ok: false, status: 404, error: "Not found" };
  if (!canUseContext(user, ctx, k)) return { ok: false, status: 403, error: "You do not work on this case" };

  // One question per asker per claim: asking again shows the same question.
  const existing = qs.find((q) => q.from === user.id && q.claimId === claimId && !forwardedFrom);
  if (existing) return { ok: true, question: existing };
  if (qs.length >= MAX_QUESTIONS) return { ok: false, status: 429, error: "Too many open questions right now" };

  const to = await pickRecipient(claim, ctx, forwardedFrom?.from ?? user.id, k, fb, qs);
  if (!to) return { ok: false, status: 409, error: "Nobody is available to confirm this right now" };
  const fact = k.facts.find((f) => f.key === claim.factKey)!;
  const question: Question = {
    id: `${forwardedFrom?.from ?? user.id}:${claimId}:${to.id}`,
    claimId,
    factKey: claim.factKey,
    factLabel: fact.label,
    value: claim.value,
    quote: claim.source.type === "meeting" ? "" : claim.text, // meetings: never the words, only the value
    source: claim.source.title,
    context: ctx,
    from: forwardedFrom?.from ?? user.id,
    to: to.id,
    askedAt: new Date().toISOString(),
    status: "open",
  };
  await save(question);
  return { ok: true, question };
}

// Unanswered for too long: hand it to the next person. Run lazily whenever questions are read.
export async function forwardStale(): Promise<void> {
  const qs = await allQuestions();
  for (const q of qs.filter((x) => x.status === "open" && Date.now() - Date.parse(x.askedAt) > FORWARD_AFTER_MS)) {
    await forward(q);
  }
}

async function forward(q: Question) {
  const k = await liveKb();
  const asker = k.people.find((p) => p.id === q.from);
  const next = asker ? await askToConfirm(asker, q.claimId, q.context, q) : null;
  await save({ ...q, status: q.status === "open" ? "forwarded" : q.status, forwardedTo: next?.ok ? next.question.to : undefined });
}

export type AnswerKind = "correct" | "wrong" | "not_mine";

export async function answerQuestion(user: Person, id: string, answer: AnswerKind): Promise<{ ok: true; question: Question; entry: LedgerEntry | null } | { ok: false; status: number; error: string }> {
  const qs = await allQuestions();
  const q = qs.find((x) => x.id === id);
  // Only the person asked can answer. Anyone else gets the same 404 as a question that does not exist.
  if (!q || q.to !== user.id) return { ok: false, status: 404, error: "Not found" };
  if (q.status !== "open") return { ok: false, status: 409, error: "This question was already answered" };

  const answeredAt = new Date().toISOString();
  if (answer === "not_mine") {
    const done: Question = { ...q, status: "not_mine", answeredAt };
    await save(done);
    await forward(done);
    return { ok: true, question: (await allQuestions()).find((x) => x.id === id)!, entry: null };
  }

  const k = await liveKb();
  const claim = k.claims.find((c) => c.id === q.claimId);
  if (!claim) return { ok: false, status: 404, error: "Not found" };
  // Same rule as voting: nobody confirms what they put in themselves.
  if (answer === "correct" && reporterOf(claim) === user.id) return { ok: false, status: 403, error: "You put this in yourself: someone else has to confirm it" };

  const feedbackBefore = await allFeedback();
  const vote: Feedback = { claimId: claim.id, userId: user.id, kind: answer, context: q.context, date: now().toISOString() };
  await saveFeedback(vote);
  const entry = await recordChange({ kind: answer === "correct" ? "confirmed" : "rejected", actor: user.id, claim, before: k, after: k, feedbackBefore, now: now() });
  const done: Question = { ...q, status: answer === "correct" ? "confirmed" : "wrong", answeredAt };
  await save(done);
  return { ok: true, question: done, entry };
}

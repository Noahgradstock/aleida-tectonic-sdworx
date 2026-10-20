import "server-only";
import { evaluateFact, parseValue, unitOf, type Claim, type Feedback, type KnowledgeBase, type Person } from "@/trust-engine";
import { allFeedback, now, saveFeedback } from "@/lib/trust-server";
import { ctxOf, fullKb, liveKb, recordChange, reporterOf, retractions, saveLiveClaim, type Retraction } from "@/lib/live";
import { allQuestions } from "@/lib/questions";
import { store } from "@/lib/store";

// A person's own trail in the brain: what they said, what was added in their name, what they confirmed.
// One inbox ("waiting for you") and one log. Everyone only ever sees and changes their own.

export type MineItem = {
  id: string; // claim id, or "vote:<claimId>"
  kind: "said" | "added" | "confirmed" | "rejected";
  channel: Claim["source"]["type"];
  source: string;
  factKey: string;
  factLabel: string;
  value: string;
  quote: string;
  speaker: string | null; // for "added": whose words they were
  reportedBy: string | null;
  date: string;
  scope: string; // "Brouwerij De Kroon NV" or "BE"
  state: "counts" | "waiting" | "removed";
  score: number | null; // today, in the claim's own case
  isAnswer: boolean; // this claim is the answer people get right now
  can: { confirm: boolean; correct: boolean; remove: boolean; restore: boolean; undo: boolean };
  correctedTo?: string | null;
};

const scopeName = (c: Claim, k: KnowledgeBase) => (c.scope.client ? (k.clients.find((x) => x.id === c.scope.client)?.name ?? c.scope.client) : [c.scope.country, c.scope.pc && `PC ${c.scope.pc}`].filter(Boolean).join(", "));
const isExpert = (k: KnowledgeBase, id: string) => k.people.find((p) => p.id === id)?.role === "expert";

// Said in a meeting, put in by someone else, and not yet confirmed by the speaker or an expert.
function waiting(c: Claim, fb: Feedback[], k: KnowledgeBase) {
  if (c.source.type !== "meeting" || !c.id.startsWith("live-") || reporterOf(c) === c.author) return false;
  return !fb.some((f) => f.claimId === c.id && f.kind === "correct" && (f.userId === c.author || isExpert(k, f.userId)));
}

export async function buildMine(user: Person) {
  const [all, live, fb, gone, qs] = await Promise.all([fullKb(), liveKb(), allFeedback(), retractions(), allQuestions()]);
  const removed = new Map(gone.map((r) => [r.claimId, r]));
  const factOf = (key: string) => all.facts.find((f) => f.key === key);
  const scored = (c: Claim) => {
    const fact = factOf(c.factKey);
    if (!fact || removed.has(c.id)) return { score: null, isAnswer: false };
    const r = evaluateFact(fact, live, ctxOf(c), fb, now());
    return { score: r.claims.find((s) => s.claim.id === c.id)?.score ?? null, isAnswer: r.best?.claim.id === c.id };
  };

  const items: MineItem[] = [];
  for (const c of all.claims) {
    const mineAsSpeaker = c.author === user.id;
    const mineAsReporter = !mineAsSpeaker && c.id.startsWith("live-") && reporterOf(c) === user.id;
    if (!mineAsSpeaker && !mineAsReporter) continue;
    const gone = removed.get(c.id);
    const state = gone ? "removed" : mineAsSpeaker && waiting(c, fb, all) ? "waiting" : "counts";
    items.push({
      id: c.id,
      kind: mineAsSpeaker ? "said" : "added",
      channel: c.source.type,
      source: c.source.title,
      factKey: c.factKey,
      factLabel: factOf(c.factKey)?.label ?? c.factKey,
      value: c.value,
      quote: c.text,
      speaker: c.author,
      reportedBy: reporterOf(c),
      date: gone?.at ?? c.date,
      scope: scopeName(c, all),
      state,
      ...scored(c),
      can: {
        confirm: state === "waiting",
        correct: mineAsSpeaker && !gone,
        remove: !gone,
        restore: !!gone && gone.by === user.id && !gone.correctedTo,
        undo: false,
      },
      correctedTo: gone?.correctedTo ?? null,
    });
  }
  for (const f of fb.filter((x) => x.userId === user.id && (x.kind === "correct" || x.kind === "wrong"))) {
    const c = all.claims.find((x) => x.id === f.claimId);
    if (!c || c.author === user.id) continue; // confirming your own words is already shown on that line
    items.push({
      id: `vote:${c.id}`,
      kind: f.kind === "correct" ? "confirmed" : "rejected",
      channel: c.source.type,
      source: c.source.title,
      factKey: c.factKey,
      factLabel: factOf(c.factKey)?.label ?? c.factKey,
      value: c.value,
      quote: c.source.type === "meeting" ? "" : c.text, // someone else's meeting words stay with them
      speaker: c.author,
      reportedBy: reporterOf(c),
      date: f.date,
      scope: scopeName(c, all),
      state: removed.has(c.id) ? "removed" : "counts",
      ...scored(c),
      can: { confirm: false, correct: false, remove: false, restore: false, undo: true },
    });
  }

  items.sort((a, b) => b.date.localeCompare(a.date));
  const questions = qs.filter((q) => q.to === user.id && q.status === "open");
  return { waiting: items.filter((i) => i.state === "waiting"), questions, log: items.filter((i) => i.state !== "waiting").slice(0, 40) };
}

export type MineAction = "confirm" | "remove" | "restore" | "correct" | "undo";
type Outcome = { ok: true; explain: string } | { ok: false; status: number; error: string };

const fix = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

export async function act(user: Person, action: MineAction, id: string, value?: string): Promise<Outcome> {
  const [all, live, fb, gone] = await Promise.all([fullKb(), liveKb(), allFeedback(), retractions()]);
  const claim = all.claims.find((c) => c.id === id);
  // Not yours, or not there: the same answer, so nobody can probe other people's claims.
  const notFound = { ok: false as const, status: 404, error: "Not found" };
  if (!claim) return notFound;
  const speaker = claim.author === user.id;
  const reporter = claim.id.startsWith("live-") && reporterOf(claim) === user.id;
  const retraction = gone.find((r) => r.claimId === id);
  const first = user.name.split(" ")[0];

  if (action === "undo") {
    const vote = fb.find((f) => f.userId === user.id && f.claimId === id);
    if (!vote) return notFound;
    await store.hdel("votes", `${user.id}:${id}`);
    await recordChange({ kind: "removed", actor: user.id, claim, before: live, after: live, feedbackBefore: fb, now: now(), explain: `${first} withdrew their ${vote.kind === "correct" ? "confirmation" : "objection"}.` });
    return { ok: true, explain: "Withdrawn. It no longer counts." };
  }
  if (!speaker && !reporter) return notFound;

  if (action === "confirm") {
    if (!speaker || !waiting(claim, fb, all) || retraction) return { ok: false, status: 409, error: "Nothing to confirm here" };
    const vote: Feedback = { claimId: id, userId: user.id, kind: "correct", context: ctxOf(claim), date: now().toISOString() };
    await saveFeedback(vote);
    const entry = await recordChange({ kind: "confirmed", actor: user.id, claim, before: live, after: live, feedbackBefore: fb, now: now() });
    return { ok: true, explain: entry.explain };
  }

  if (action === "remove") {
    if (retraction) return { ok: false, status: 409, error: "Already taken back" };
    const r: Retraction = { claimId: id, by: user.id, at: new Date().toISOString() };
    await store.hset("retractions", id, JSON.stringify(r));
    const after = { ...live, claims: live.claims.filter((c) => c.id !== id) };
    const entry = await recordChange({ kind: "removed", actor: user.id, claim, before: live, after, now: now(), explain: `${first} took this back: it no longer counts anywhere.` });
    return { ok: true, explain: entry.explain };
  }

  if (action === "restore") {
    if (!retraction || retraction.by !== user.id || retraction.correctedTo) return notFound;
    await store.hdel("retractions", id);
    const after = { ...live, claims: [...live.claims, claim] };
    await recordChange({ kind: "restored", actor: user.id, claim, before: live, after, now: now(), explain: `${first} put this back.` });
    return { ok: true, explain: "Put back. It counts again." };
  }

  if (action === "correct") {
    if (!speaker || retraction) return notFound;
    const parsed = typeof value === "string" ? parseValue(value.slice(0, 60)) : null;
    if (!parsed) return { ok: false, status: 400, error: "Write the value with its unit, e.g. 22 days or €8.91" };
    if (unitOf(parsed) !== unitOf(claim.value)) return { ok: false, status: 400, error: `Use the same unit as before (${claim.value})` };
    if (parsed === claim.value) return { ok: false, status: 400, error: "That is the same value" };
    // The correction is a new claim in the same place, written by the speaker today. The old one is taken back.
    const fixed: Claim = {
      ...claim,
      id: `live-fix-${fix(`${claim.id}|${parsed}`)}`,
      value: parsed,
      source: { type: claim.source.type, title: `${claim.source.title} (corrected)` },
      date: now().toISOString().slice(0, 10),
      text: `${user.name} corrected this to ${parsed} (it said ${claim.value}).`,
      corrects: claim.id,
      reactions: [],
    };
    await saveLiveClaim(fixed, user.id);
    // Writing your own correction is confirming it: no 50% "said in a meeting" cap on your own written fix.
    if (fixed.source.type === "meeting") await saveFeedback({ claimId: fixed.id, userId: user.id, kind: "correct", context: ctxOf(fixed), date: now().toISOString() });
    await store.hset("retractions", claim.id, JSON.stringify({ claimId: claim.id, by: user.id, at: new Date().toISOString(), correctedTo: fixed.id } satisfies Retraction));
    const after = { ...live, claims: [...live.claims.filter((c) => c.id !== claim.id), fixed] };
    const entry = await recordChange({ kind: "corrected", actor: user.id, claim: fixed, before: live, after, now: now(), replaces: claim.id, explain: `${first} corrected ${claim.value} to ${parsed}.` });
    return { ok: true, explain: entry.explain };
  }
  return { ok: false, status: 400, error: "Unknown action" };
}

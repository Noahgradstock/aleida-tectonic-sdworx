import "server-only";
import { evaluateFact, type Claim, type Context, type Evidence, type FactStatus, type Feedback, type KnowledgeBase, type Person } from "@/trust-engine";
import { allFeedback, kb } from "@/lib/trust-server";
import { store } from "@/lib/store";

// The living part of the brain: claims learned from everyday work, and a ledger of every score change.
// Both live in the shared store (Upstash Redis in production, memory locally).

const DAY = 86_400_000;

// Caps so a script (or a stuck client) cannot grow the store without limit.
export const LIVE_MAX_TOTAL = 2000; // learned claims in total
export const LIVE_MAX_PER_USER_PER_DAY = 100; // learned claims per reporter per day
const LEDGER_SIZE = 1000; // the ledger keeps the latest entries only

// A learned claim remembers who fed it in. For meetings that can be someone else than the speaker,
// so a reporter can never confirm what they reported (see reporterOf).
export type LiveClaim = Claim & { reportedBy: string };

export async function liveClaims(): Promise<LiveClaim[]> {
  return (await store.hvals("live-claims")).map((v) => JSON.parse(v) as LiveClaim);
}

// The static knowledge base plus everything learned since. Same claim id = same claim, so feeding
// the same sentence twice never counts twice.
export async function liveKb(): Promise<KnowledgeBase> {
  const live = await liveClaims();
  const ids = new Set(kb.claims.map((c) => c.id));
  return { ...kb, claims: [...kb.claims, ...live.filter((c) => !ids.has(c.id))] };
}

export const liveCount = (k: KnowledgeBase) => k.claims.length - kb.claims.length;

export async function saveLiveClaim(claim: Claim, reporter: string): Promise<LiveClaim> {
  const live: LiveClaim = { ...claim, reportedBy: reporter };
  await store.hset("live-claims", claim.id, JSON.stringify(live));
  return live;
}

// Atomic guard for two requests learning the same sentence at the same moment: only the first one wins.
export async function firstToLearn(claimId: string): Promise<boolean> {
  return (await store.count(`learning:${claimId}`, 60_000)) === 1;
}

// Who put this claim into the brain: the reporter for learned claims, the author for curated sources.
// null for learned claims stored before the reporter was recorded.
export function reporterOf(claim: Claim): string | null {
  if ("reportedBy" in claim && typeof claim.reportedBy === "string") return claim.reportedBy;
  return kb.claims.some((c) => c.id === claim.id) ? claim.author : null;
}

// A learned meeting claim put in by someone else than the speaker, that neither the speaker nor an expert
// has confirmed yet. Until then it is hearsay: it must not shape anyone's track record or who to contact.
export function unconfirmedReport(claim: Claim, feedback: Feedback[], people: Person[]): boolean {
  if (claim.source.type !== "meeting" || kb.claims.some((c) => c.id === claim.id)) return false;
  const reporter = reporterOf(claim);
  if (reporter !== null && reporter === claim.author) return false;
  const role = (id: string) => people.find((p) => p.id === id)?.role;
  return !feedback.some(
    (f) => f.claimId === claim.id && f.kind === "correct" && f.userId !== reporter && (f.userId === claim.author || role(f.userId) === "expert"),
  );
}

type Snapshot = { value: string | null; score: number | null; status: FactStatus };

export type LedgerEntry = {
  id: string;
  at: string; // wall-clock time of the change
  kind: "learned" | "confirmed" | "rejected" | "outdated";
  actor: string; // signed-in user who caused it (reporter, voter)
  channel: string;
  factKey: string;
  factLabel: string;
  claimId: string;
  value: string;
  quote: string;
  speaker: string | null;
  reportedBy: string | null; // who fed the claim in; differs from speaker for meeting transcripts
  scope: Claim["scope"];
  claimScore: { before: number | null; after: number };
  answer: { before: Snapshot; after: Snapshot }; // the answer for the claim's own scope
  evidence: Evidence[];
  caps: string[];
};

// The claim's own scope as a case, for scoring and for access checks.
export const ctxOf = (c: Claim): Context => ({ country: c.scope.country, pc: c.scope.pc, client: c.scope.client });

function snapshot(k: KnowledgeBase, claim: Claim, feedback: Feedback[], now: Date) {
  const fact = k.facts.find((f) => f.key === claim.factKey);
  if (!fact) throw new Error(`unknown fact ${claim.factKey}`);
  const r = evaluateFact(fact, k, ctxOf(claim), feedback, now);
  const mine = r.claims.find((c) => c.claim.id === claim.id) ?? null;
  return { fact, answer: { value: r.best?.claim.value ?? null, score: r.best?.score ?? null, status: r.status } as Snapshot, mine };
}

// Applies a change (new claim or new vote) and records exactly how the scores moved.
export async function recordChange(opts: {
  kind: LedgerEntry["kind"];
  actor: string;
  claim: Claim;
  before: KnowledgeBase;
  after: KnowledgeBase;
  feedbackBefore?: Feedback[];
  now: Date;
}): Promise<LedgerEntry> {
  const fbAfter = await allFeedback();
  const fbBefore = opts.feedbackBefore ?? fbAfter;
  const b = snapshot(opts.before, opts.claim, fbBefore, opts.now);
  const a = snapshot(opts.after, opts.claim, fbAfter, opts.now);
  const at = new Date().toISOString();
  const entry: LedgerEntry = {
    id: `${at}-${opts.claim.id}-${opts.kind}`,
    at,
    kind: opts.kind,
    actor: opts.actor,
    channel: opts.claim.source.type,
    factKey: opts.claim.factKey,
    factLabel: a.fact.label,
    claimId: opts.claim.id,
    value: opts.claim.value,
    quote: opts.claim.text,
    speaker: opts.claim.author,
    reportedBy: reporterOf(opts.claim),
    scope: opts.claim.scope,
    claimScore: { before: b.mine?.score ?? null, after: a.mine?.score ?? 0 },
    answer: { before: b.answer, after: a.answer },
    evidence: a.mine?.evidence ?? [],
    caps: a.mine?.caps ?? [],
  };
  // Ring buffer: slot = sequence number modulo the size, so the newest entry overwrites the oldest
  // and the ledger never grows beyond LEDGER_SIZE fields.
  const seq = await store.count("ledger-seq", 10 * 365 * DAY);
  await store.hset("ledger", `slot-${seq % LEDGER_SIZE}`, JSON.stringify(entry));
  return entry;
}

export async function ledger(): Promise<LedgerEntry[]> {
  return (await store.hvals("ledger")).map((v) => JSON.parse(v) as LedgerEntry).sort((x, y) => y.at.localeCompare(x.at));
}

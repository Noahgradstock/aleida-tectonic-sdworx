import { evaluateFact, type Claim, type Context, type Evidence, type FactStatus, type KnowledgeBase } from "@/trust-engine";
import { allFeedback, kb } from "@/lib/trust-server";
import { store } from "@/lib/store";

// The living part of the brain: claims learned from everyday work, and a ledger of every score change.
// Both live in the shared store (Upstash Redis in production, memory locally).

export async function liveClaims(): Promise<Claim[]> {
  return (await store.hvals("live-claims")).map((v) => JSON.parse(v) as Claim);
}

// The static knowledge base plus everything learned since. Same claim id = same claim, so feeding
// the same sentence twice never counts twice.
export async function liveKb(): Promise<KnowledgeBase> {
  const live = await liveClaims();
  const ids = new Set(kb.claims.map((c) => c.id));
  return { ...kb, claims: [...kb.claims, ...live.filter((c) => !ids.has(c.id))] };
}

export async function saveLiveClaim(claim: Claim) {
  await store.hset("live-claims", claim.id, JSON.stringify(claim));
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
  scope: Claim["scope"];
  claimScore: { before: number | null; after: number };
  answer: { before: Snapshot; after: Snapshot }; // the answer for the claim's own scope
  evidence: Evidence[];
  caps: string[];
};

const ctxOf = (c: Claim): Context => ({ country: c.scope.country, pc: c.scope.pc, client: c.scope.client });

function snapshot(k: KnowledgeBase, claim: Claim, feedback: Awaited<ReturnType<typeof allFeedback>>, now: Date) {
  const fact = k.facts.find((f) => f.key === claim.factKey)!;
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
  feedbackBefore?: Awaited<ReturnType<typeof allFeedback>>;
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
    scope: opts.claim.scope,
    claimScore: { before: b.mine?.score ?? null, after: a.mine?.score ?? 0 },
    answer: { before: b.answer, after: a.answer },
    evidence: a.mine?.evidence ?? [],
    caps: a.mine?.caps ?? [],
  };
  await store.hset("ledger", entry.id, JSON.stringify(entry));
  return entry;
}

export async function ledger(): Promise<LedgerEntry[]> {
  return (await store.hvals("ledger")).map((v) => JSON.parse(v) as LedgerEntry).sort((x, y) => y.at.localeCompare(x.at));
}

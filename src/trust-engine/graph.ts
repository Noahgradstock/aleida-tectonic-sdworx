import { evaluateFact, sameValue } from "./score";
import type { Claim, Context, Feedback, KnowledgeBase, ScoredClaim, SourceType } from "./types";

// "Who knows what": a knowledge graph built only from traces of everyday work (claims people wrote or said,
// answers they confirmed). Nobody maintains it. Every person gets a knowledge CV; every edge has a reason.

export type NodeKind = "person" | "concept" | "document" | "client";

// Topics are grouped into a few domains, so the web has regions you can name and zoom into.
export const DOMAINS = [
  { id: "pay", label: "Pay" },
  { id: "benefits", label: "Benefits" },
  { id: "leave", label: "Leave & absence" },
  { id: "time", label: "Working time" },
  { id: "contracts", label: "Contracts" },
] as const;
export type DomainId = (typeof DOMAINS)[number]["id"];
const DOMAIN_OF: Record<string, DomainId> = {
  indexation: "pay",
  bonus: "pay",
  "payroll-process": "pay",
  "meal-vouchers": "benefits",
  benefits: "benefits",
  "company-car": "benefits",
  "sick-leave": "leave",
  "holiday-pay": "leave",
  leave: "leave",
  "working-time": "time",
  "student-work": "time",
  dismissal: "contracts",
};
export const domainOf = (topic: string): DomainId => DOMAIN_OF[topic] ?? "pay";

export type GraphNode = {
  id: string; // "person:anna", "concept:meal-voucher-max", "doc:<title>", "client:<id>"
  kind: NodeKind;
  label: string;
  group: string; // team for people, topic for concepts, channel for documents, country for clients
  weight: number; // drives node size
  meta: Record<string, string | number | boolean | null>;
};

export type GraphEdge = {
  source: string;
  target: string;
  kind: "knows" | "wrote" | "states" | "about" | "works-with";
  weight: number; // 0..1, drives thickness
  label: string; // why the edge exists, in plain words
};

export type CvEntry = {
  factKey: string;
  label: string;
  topic: string;
  strength: number; // 0..1
  right: number; // statements that match today's trusted answer for their own scope
  total: number;
  confirmations: number; // colleagues' answers this person confirmed
  lastSeen: { date: string; channel: SourceType; quote: string; source: string } | null;
};

export type PersonCv = {
  id: string;
  name: string;
  team: string;
  role: string;
  left: boolean;
  knownFor: string[]; // top concept labels
  entries: CvEntry[]; // strongest first
  clients: string[]; // client ids they dealt with
  colleagues: { id: string; shared: number }[]; // people who know the same concepts
  summary: string; // one sentence for the panel
};

export type KnowledgeGraph = { nodes: GraphNode[]; edges: GraphEdge[]; cvs: Record<string, PersonCv> };

const DAY = 86_400_000;
const RECENCY_HALF_LIFE_DAYS = 120;
const ctxOf = (c: Claim): Context => ({ country: c.scope.country, pc: c.scope.pc, client: c.scope.client });
const scopeKey = (c: Claim) => `${c.scope.country}|${c.scope.pc ?? ""}|${c.scope.client ?? ""}`;
const round = (n: number) => Math.round(n * 100) / 100;
const daysAgo = (date: string, now: Date) => Math.max(0, (now.getTime() - Date.parse(date)) / DAY);

// Spoken claims only count for someone's expertise once confirmed, or when they match the trusted answer:
// otherwise anyone could put words in an expert's mouth in a transcript.
function counts(claim: Claim, scored: ScoredClaim | undefined, matches: boolean, feedback: Feedback[], kb: KnowledgeBase) {
  if (claim.source.type !== "meeting" || matches) return true;
  const people = new Map(kb.people.map((p) => [p.id, p]));
  return (
    (scored?.score ?? 0) >= 0.75 ||
    feedback.some((f) => f.claimId === claim.id && f.kind === "correct" && (f.userId === claim.author || people.get(f.userId)?.role === "expert"))
  );
}

export function buildKnowledgeGraph(
  kb: KnowledgeBase,
  feedback: Feedback[],
  now: Date,
  opts: { canSee?: (c: Claim) => boolean; isHearsay?: (c: Claim) => boolean } = {},
): KnowledgeGraph {
  const claims = kb.claims.filter(opts.canSee ?? (() => true));
  const factByKey = new Map(kb.facts.map((f) => [f.key, f]));

  // Score every claim once, in its own scope, and remember the trusted answer for that scope.
  const scoreOf = new Map<string, ScoredClaim>();
  const answerOf = new Map<string, string | null>();
  for (const claim of claims) {
    const key = `${claim.factKey}#${scopeKey(claim)}`;
    if (answerOf.has(key) && scoreOf.has(claim.id)) continue;
    const fact = factByKey.get(claim.factKey);
    if (!fact) continue;
    const r = evaluateFact(fact, kb, ctxOf(claim), feedback, now);
    answerOf.set(key, r.status === "trusted" ? (r.best?.claim.value ?? null) : null);
    for (const s of r.claims) if (!scoreOf.has(s.claim.id) && s.claim.id === claim.id) scoreOf.set(s.claim.id, s);
    const own = r.claims.find((s) => s.claim.id === claim.id);
    if (own) scoreOf.set(claim.id, own);
  }

  // Per person × concept: statements, how many held up, confirmations given, most recent trace.
  type Acc = { right: number; total: number; confirmations: number; recency: number; last: CvEntry["lastSeen"]; trust: number };
  const acc = new Map<string, Map<string, Acc>>();
  const get = (person: string, fact: string) => {
    const byFact = acc.get(person) ?? acc.set(person, new Map()).get(person)!;
    return byFact.get(fact) ?? byFact.set(fact, { right: 0, total: 0, confirmations: 0, recency: 0, last: null, trust: 0 }).get(fact)!;
  };
  const clientsOf = new Map<string, Set<string>>();

  for (const claim of claims) {
    if (!claim.author || claim.source.type === "official") continue;
    const scored = scoreOf.get(claim.id);
    const answer = answerOf.get(`${claim.factKey}#${scopeKey(claim)}`);
    const matches = !!answer && sameValue(claim.value, answer);
    if (opts.isHearsay?.(claim) || !counts(claim, scored, matches, feedback, kb)) continue;
    const a = get(claim.author, claim.factKey);
    a.total++;
    if (matches) a.right++;
    a.trust = Math.max(a.trust, scored?.score ?? 0);
    a.recency = Math.max(a.recency, 0.5 ** (daysAgo(claim.date, now) / RECENCY_HALF_LIFE_DAYS));
    if (!a.last || claim.date > a.last.date) a.last = { date: claim.date, channel: claim.source.type, quote: claim.text, source: claim.source.title };
    if (claim.scope.client) (clientsOf.get(claim.author) ?? clientsOf.set(claim.author, new Set()).get(claim.author)!).add(claim.scope.client);
  }
  // Thumbs-up and "still right" clicks are knowledge too: you only confirm what you know.
  const confirm = (person: string, claim: Claim, date: string) => {
    const a = get(person, claim.factKey);
    a.confirmations++;
    a.recency = Math.max(a.recency, 0.5 ** (daysAgo(date, now) / RECENCY_HALF_LIFE_DAYS));
  };
  for (const claim of claims) for (const r of claim.reactions ?? []) confirm(r, claim, claim.date);
  for (const f of feedback) {
    const claim = f.kind === "correct" ? claims.find((c) => c.id === f.claimId) : undefined;
    if (claim) confirm(f.userId, claim, f.date.slice(0, 10));
  }

  // Strength 0..1: track record (Beta prior, so one statement is not proof), confirmations and recency.
  const strengthOf = (a: Acc) => {
    const record = (1 + a.right) / (2 + a.total);
    const raw = 0.45 * record + 0.2 * Math.min(a.confirmations, 3) / 3 + 0.2 * a.recency + 0.15 * Math.min(a.total, 3) / 3;
    return round(Math.min(1, raw));
  };

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const cvs: Record<string, PersonCv> = {};

  // Concepts
  const conceptWeight = new Map<string, number>();
  for (const c of claims) conceptWeight.set(c.factKey, (conceptWeight.get(c.factKey) ?? 0) + 1);
  for (const [key, n] of conceptWeight) {
    const fact = factByKey.get(key);
    if (!fact) continue;
    nodes.push({ id: `concept:${key}`, kind: "concept", label: fact.label, group: fact.topic, weight: n, meta: { topic: fact.topic, domain: domainOf(fact.topic) } });
  }

  // Documents (one node per source title), each stating one or more concepts.
  const docs = new Map<string, { claims: Claim[] }>();
  for (const c of claims) (docs.get(c.source.title) ?? docs.set(c.source.title, { claims: [] }).get(c.source.title)!).claims.push(c);
  for (const [title, d] of docs) {
    const first = d.claims[0];
    const latest = d.claims.reduce((m, c) => (c.date > m ? c.date : m), first.date);
    nodes.push({
      id: `doc:${title}`,
      kind: "document",
      label: title,
      group: first.source.type,
      weight: d.claims.length,
      meta: { channel: first.source.type, date: latest, file: first.file ?? null, live: first.id.startsWith("live-") },
    });
    for (const key of new Set(d.claims.map((c) => c.factKey))) {
      const best = Math.max(...d.claims.filter((c) => c.factKey === key).map((c) => scoreOf.get(c.id)?.score ?? 0));
      edges.push({ source: `doc:${title}`, target: `concept:${key}`, kind: "states", weight: round(Math.max(0.15, best)), label: `States it (${Math.round(best * 100)}% trusted)` });
    }
    for (const author of new Set(d.claims.map((c) => c.author).filter(Boolean) as string[])) {
      edges.push({ source: `person:${author}`, target: `doc:${title}`, kind: "wrote", weight: 0.3, label: first.source.type === "meeting" ? "Said it in this meeting" : "Wrote it" });
    }
  }

  // Clients
  for (const client of kb.clients) {
    const about = claims.filter((c) => c.scope.client === client.id);
    if (!about.length) continue;
    nodes.push({ id: `client:${client.id}`, kind: "client", label: client.name, group: client.country, weight: about.length, meta: { country: client.country, pc: client.pc ?? null } });
    for (const key of new Set(about.map((c) => c.factKey))) {
      edges.push({ source: `client:${client.id}`, target: `concept:${key}`, kind: "about", weight: 0.5, label: "Client-specific agreement" });
    }
  }

  // People and their CVs
  const conceptsOf = new Map<string, Set<string>>();
  for (const person of kb.people) {
    const byFact = acc.get(person.id);
    if (!byFact?.size) continue;
    const entries: CvEntry[] = [...byFact]
      .filter(([key]) => factByKey.has(key))
      .map(([key, a]) => {
        const fact = factByKey.get(key)!;
        return { factKey: key, label: fact.label, topic: fact.topic, strength: strengthOf(a), right: a.right, total: a.total, confirmations: a.confirmations, lastSeen: a.last };
      })
      .sort((x, y) => y.strength - x.strength);
    conceptsOf.set(person.id, new Set(entries.map((e) => e.factKey)));

    const country = person.team.match(/\b[A-Z]{2}\b/)?.[0] ?? null;
    nodes.push({
      id: `person:${person.id}`,
      kind: "person",
      label: person.name,
      group: person.team,
      weight: entries.reduce((s, e) => s + e.strength, 0),
      meta: { role: person.role, left: !!person.left, country },
    });
    for (const e of entries) {
      edges.push({
        source: `person:${person.id}`,
        target: `concept:${e.factKey}`,
        kind: "knows",
        weight: e.strength,
        label: [
          e.total ? `Right ${e.right} of ${e.total}` : null,
          e.confirmations ? `confirmed ${e.confirmations}×` : null,
          e.lastSeen ? `last ${e.lastSeen.date} in ${e.lastSeen.channel}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }

    // Known for: topics where they were proven right or confirmed someone, strongest first.
    const top = entries.filter((e) => e.right > 0 || e.confirmations > 0).slice(0, 3);
    cvs[person.id] = {
      id: person.id,
      name: person.name,
      team: person.team,
      role: person.role,
      left: !!person.left,
      knownFor: top.map((e) => e.label),
      entries,
      clients: [...(clientsOf.get(person.id) ?? [])],
      colleagues: [],
      summary: person.left
        ? `${person.name} has left. What they knew lives on only where someone else confirmed it.`
        : top.length
          ? `${person.name} (${person.team}) is the one to ask about ${top.map((e) => e.label.charAt(0).toLowerCase() + e.label.slice(1)).join(", ")}.`
          : `${person.name} (${person.team}) has touched ${entries.length} topic${entries.length === 1 ? "" : "s"}, but was not proven right on any yet.`,
    };
  }

  // People who know the same things are linked: that is where a newcomer finds a second opinion.
  const ids = [...conceptsOf.keys()];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const shared = [...conceptsOf.get(ids[i])!].filter((k) => conceptsOf.get(ids[j])!.has(k)).length;
      if (!shared) continue;
      cvs[ids[i]].colleagues.push({ id: ids[j], shared });
      cvs[ids[j]].colleagues.push({ id: ids[i], shared });
      edges.push({ source: `person:${ids[i]}`, target: `person:${ids[j]}`, kind: "works-with", weight: Math.min(1, shared / 4), label: `${shared} topic${shared > 1 ? "s" : ""} in common` });
    }
  }
  for (const cv of Object.values(cvs)) cv.colleagues.sort((a, b) => b.shared - a.shared);

  return { nodes, edges, cvs };
}

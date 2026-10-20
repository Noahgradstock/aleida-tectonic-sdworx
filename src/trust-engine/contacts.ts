import { matchScope } from "./scope";
import { sameValue } from "./score";
import type { Claim, Context, FactResult, Feedback, KnowledgeBase, Person } from "./types";

// "Who should I contact first?" Computed from work that already happened, never from a maintained list.
// Three signals, all visible: does this person work on your case (scope), were they right before
// on this topic (track record), and how recently did they deal with it (recency).

export type Contact = {
  person: Person;
  points: number;
  reasons: string[];
  lastSeen: { date: string; channel: string; quote: string } | null;
};

export type ContactRanking = { ranked: Contact[]; setAside: { person: Person; reason: string }[] };

const DAY = 86_400_000;
const RECENCY_HALF_LIFE_DAYS = 60;
const CHANNEL: Record<string, string> = { official: "an official notice", sharepoint: "a document", teams: "Teams", email: "an email", meeting: "a meeting" };

export function rankContacts(result: FactResult, ctx: Context, kb: KnowledgeBase, feedback: Feedback[], now: Date): ContactRanking {
  const people = new Map(kb.people.map((p) => [p.id, p]));
  const trustedValue = result.status === "trusted" || result.status === "conflict" ? result.best?.claim.value : undefined;
  const all: Claim[] = kb.claims.filter((c) => c.factKey === result.fact.key);

  // Everyone who left a trace on this topic: wrote a claim, reacted to one, or confirmed one.
  const touched = new Map<string, { claims: Claim[]; confirms: number }>();
  const touch = (id: string) => touched.get(id) ?? touched.set(id, { claims: [], confirms: 0 }).get(id)!;
  for (const c of all) {
    if (c.author) touch(c.author).claims.push(c);
    for (const r of c.reactions ?? []) touch(r).confirms++;
  }
  for (const f of feedback) if (f.kind === "correct" && all.some((c) => c.id === f.claimId)) touch(f.userId).confirms++;

  const ranked: Contact[] = [];
  const setAside: ContactRanking["setAside"] = [];

  for (const [id, trace] of touched) {
    const person = people.get(id);
    if (!person) continue;
    if (person.left) {
      setAside.push({ person, reason: "Has left the company" });
      continue;
    }
    const inScope = trace.claims.filter((c) => matchScope(c, ctx, feedback).ok);
    const latest = [...trace.claims].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
    if (trace.claims.length && !inScope.length && !trace.confirms) {
      const days = Math.round((now.getTime() - Date.parse(latest.date)) / DAY);
      setAside.push({
        person,
        reason: `Spoke about it ${days <= 1 ? "yesterday" : `${days} days ago`} in ${CHANNEL[latest.source.type]}, but about ${latest.scope.country}, not ${ctx.country}`,
      });
      continue;
    }

    const reasons: string[] = [];
    let points = 0;

    // Track record: Beta(1,1) prior, so one right answer is not proof.
    if (trustedValue && inScope.length) {
      const right = inScope.filter((c) => sameValue(c.value, trustedValue)).length;
      const r = (1 + right) / (2 + inScope.length);
      points += 2 * Math.log(r / (1 - r));
      reasons.push(`Right ${right} of ${inScope.length} time${inScope.length > 1 ? "s" : ""} on this topic`);
    }
    if (trace.confirms) {
      points += Math.min(trace.confirms, 3) * 0.4;
      reasons.push(`Confirmed colleagues' answers ${trace.confirms}×`);
    }
    if (person.role === "expert") {
      points += 1;
      reasons.push(`Expert, ${person.team}`);
    } else if (person.role === "new") {
      points -= 0.5;
      reasons.push("New in the team");
    }
    const recent = [...inScope].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
    if (recent) {
      const days = Math.max(0, Math.round((now.getTime() - Date.parse(recent.date)) / DAY));
      points += 1.5 * 0.5 ** (days / RECENCY_HALF_LIFE_DAYS);
      reasons.push(`Dealt with it ${days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`} in ${CHANNEL[recent.source.type]}`);
    }

    ranked.push({
      person,
      points: Math.round(points * 100) / 100,
      reasons,
      lastSeen: recent ? { date: recent.date, channel: recent.source.type, quote: recent.text } : null,
    });
  }

  ranked.sort((a, b) => b.points - a.points);
  return { ranked, setAside };
}

// When did the brain last learn something about this fact, and from where.
export function lastUpdated(result: FactResult): { date: string; source: string; by: string | null } | null {
  const claims = [...result.claims.map((c) => c.claim), ...result.excluded.map((e) => e.claim)];
  const latest = claims.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  return latest ? { date: latest.date, source: latest.source.title, by: latest.author } : null;
}

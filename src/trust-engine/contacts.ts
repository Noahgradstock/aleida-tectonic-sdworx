import { matchScope } from "./scope";
import { sameValue } from "./score";
import type { Claim, Context, FactResult, Feedback, KnowledgeBase, Person } from "./types";

// "Who should I contact first?" Computed from work that already happened, never from a maintained list.
// Three signals, all visible: does this person work on your case (scope), were they right before
// on this topic (track record), and how recently did they deal with it (recency).

export type Contact = {
  person: Person;
  points: number;
  reasons: string[]; // short chips for the UI: "Right 3 of 3 times", "Confirmed 2 colleagues"
  lastSeen: { date: string; channel: string; quote: string } | null;
  why: string; // one sentence: "Anna: expert in Payroll BE, right every time on this topic, last answered 21 days ago in Teams."
};

export type ContactRanking = {
  ranked: Contact[];
  setAside: { person: Person; reason: string }[];
  why: string | null; // the top contact's sentence, for a voice answer or a one-line card
};

const DAY = 86_400_000;
const RECENCY_HALF_LIFE_DAYS = 60;
const CHANNEL: Record<string, string> = { official: "an official notice", sharepoint: "a document", teams: "Teams", email: "an email", meeting: "a meeting" };

// Calendar days, so something said this morning is "today", not "yesterday" by the afternoon.
const daysAgo = (date: string, now: Date) => Math.max(0, Math.round((Date.parse(now.toISOString().slice(0, 10)) - Date.parse(date.slice(0, 10))) / DAY));
const when = (days: number) => (days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const newest = (claims: Claim[]) => [...claims].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];

// Copies do not count: the same value from the same person in the same source on the same day is one answer.
function once(claims: Claim[]): Claim[] {
  const key = (c: Claim) => `${c.source.type}|${c.source.title}|${c.date}|${c.value.toLowerCase().replace(/\s+/g, "").replace(",", ".")}`;
  return claims.filter((c, i) => claims.findIndex((o) => key(o) === key(c)) === i);
}

// Why someone is not on the list although they spoke about it: say what their answer was about.
function otherScope(c: Claim, ctx: Context): string {
  if (c.scope.country !== ctx.country) return `${c.scope.country}, not ${ctx.country}`;
  if (c.scope.pc && ctx.pc && c.scope.pc !== ctx.pc) return `PC ${c.scope.pc}, not PC ${ctx.pc}`;
  return "another client";
}

export function rankContacts(result: FactResult, ctx: Context, kb: KnowledgeBase, feedback: Feedback[], now: Date): ContactRanking {
  const people = new Map(kb.people.map((p) => [p.id, p]));
  const trustedValue = result.status === "trusted" || result.status === "conflict" ? result.best?.claim.value : undefined;
  const all: Claim[] = kb.claims.filter((c) => c.factKey === result.fact.key);
  const inScope = (c: Claim) => matchScope(c, ctx, feedback).ok;
  const isExpert = (id: string) => people.get(id)?.role === "expert";

  // Same rule as score.ts: confirmed by an expert's 👍, or a ✓ from the speaker or an expert.
  const confirmed = (c: Claim) =>
    (c.reactions ?? []).some((id) => id !== c.author && isExpert(id)) ||
    feedback.some((f) => f.claimId === c.id && f.kind === "correct" && (f.userId === c.author || isExpert(f.userId)));
  // A transcript's speaker label is just text: anyone can type "Anna: 25 days". A learned meeting line
  // reported by someone else than the speaker only counts for the speaker once confirmed, or when it says
  // the trusted value; it can never hurt them. Curated transcripts and self-reports count as written.
  const selfReported = (c: Claim) => "reportedBy" in c && c.reportedBy === c.author;
  const hearsay = (c: Claim) => c.source.type === "meeting" && c.id.startsWith("live-") && !selfReported(c) && !confirmed(c);
  const counts = (c: Claim) => !hearsay(c) || (!!trustedValue && sameValue(c.value, trustedValue));

  // Everyone who left a trace on this topic: wrote a claim, or confirmed someone else's in your scope.
  // Confirming an answer that turned out wrong earns nothing.
  const touched = new Map<string, { claims: Claim[]; confirmed: Set<string> }>();
  const touch = (id: string) => touched.get(id) ?? touched.set(id, { claims: [], confirmed: new Set() }).get(id)!;
  const confirmedBy = (id: string, c: Claim) => {
    if (id === c.author || !inScope(c) || (trustedValue && !sameValue(c.value, trustedValue))) return;
    touch(id).confirmed.add(c.author ?? c.id); // per colleague: three 👍 on one person's messages is one colleague
  };
  for (const c of all) {
    if (c.author) touch(c.author).claims.push(c);
    for (const r of c.reactions ?? []) confirmedBy(r, c);
  }
  for (const f of feedback) {
    const c = f.kind === "correct" ? all.find((x) => x.id === f.claimId) : undefined;
    if (c) confirmedBy(f.userId, c);
  }

  const ranked: Contact[] = [];
  const setAside: ContactRanking["setAside"] = [];

  for (const [id, trace] of touched) {
    const person = people.get(id);
    if (!person) continue;
    if (person.left) {
      setAside.push({ person, reason: "Has left the company" });
      continue;
    }
    const mine = trace.claims.filter(inScope);
    const counted = once(mine.filter(counts));
    const confirms = trace.confirmed.size;
    if (trace.claims.length && !mine.length && !confirms) {
      const latest = newest(trace.claims);
      const days = daysAgo(latest.date, now);
      setAside.push({ person, reason: `Spoke about it ${when(days)} in ${CHANNEL[latest.source.type]}, but about ${otherScope(latest, ctx)}` });
      continue;
    }
    if (!counted.length && !confirms) {
      setAside.push({ person, reason: "Only mentioned in a meeting, not confirmed yet" });
      continue;
    }
    ranked.push(contactFor(person, counted, confirms, trustedValue, now));
  }

  ranked.sort((a, b) => b.points - a.points || a.person.name.localeCompare(b.person.name));
  return { ranked, setAside, why: ranked[0]?.why ?? null };
}

// Points, chips and one sentence for one person. Every point has a visible reason.
function contactFor(person: Person, counted: Claim[], confirms: number, trustedValue: string | undefined, now: Date): Contact {
  const reasons: string[] = [];
  const why: string[] = [];
  let points = 0;

  if (person.role === "expert") {
    points += 1;
    reasons.push(`Expert in ${person.team}`);
    why.push(`expert in ${person.team}`);
  } else if (person.role === "new") {
    points -= 0.5;
    reasons.push("New in the team");
    why.push(`new in ${person.team}`);
  } else why.push(`works in ${person.team}`);

  // Track record: Beta(1,1) prior, so one right answer is not proof.
  if (trustedValue && counted.length) {
    const n = counted.length;
    const right = counted.filter((c) => sameValue(c.value, trustedValue)).length;
    const r = (1 + right) / (2 + n);
    points += 2 * Math.log(r / (1 - r));
    reasons.push(`Right ${right} of ${plural(n, "time")}`);
    why.push(right === n ? "right every time on this topic" : `right ${right} of ${plural(n, "time")} on this topic`);
  }
  if (confirms) {
    points += Math.min(confirms, 3) * 0.4;
    reasons.push(`Confirmed ${plural(confirms, "colleague")}`);
    why.push(`confirmed ${plural(confirms, "colleague")}`);
  }
  const recent = newest(counted);
  if (recent) {
    const days = daysAgo(recent.date, now);
    points += 1.5 * 0.5 ** (days / RECENCY_HALF_LIFE_DAYS);
    reasons.push(`Dealt with it ${when(days)} in ${CHANNEL[recent.source.type]}`);
    why.push(`last answered ${when(days)} in ${CHANNEL[recent.source.type]}`);
  }

  return {
    person,
    points: Math.round(points * 100) / 100,
    reasons,
    lastSeen: recent ? { date: recent.date, channel: recent.source.type, quote: recent.text } : null,
    why: `${person.name.split(" ")[0]}: ${why.join(", ")}.`,
  };
}

// When did the brain last learn something about this fact for this case, and from where.
export function lastUpdated(result: FactResult): { date: string; source: string; by: string | null } | null {
  const latest = newest(result.claims.map((c) => c.claim));
  return latest ? { date: latest.date, source: latest.source.title, by: latest.author } : null;
}

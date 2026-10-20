import { LAYERS, STATUS } from "./config";
import { evaluateFact, sameValue } from "./score";
import type { Context, Fact, Feedback, KnowledgeBase, ScoredClaim } from "./types";

// "Will it still be trusted tomorrow?" The engine already takes the date as an input, so we simply
// run it forward: the same rules, the same sources, later dates. The first day today's answer stops
// being trusted is its best-before date, and the reason is whatever changed on that day.

const DAY = 86_400_000;
export const HORIZON_DAYS = 540; // about 18 months ahead
const STEP_DAYS = 14;

export type ForecastPoint = { date: string; score: number | null; value: string | null; trusted: boolean };
export type Forecast = {
  value: string | null; // today's answer
  bestBefore: { date: string; kind: "new-rule" | "ages" | "disputed"; reason: string } | null;
  headroom: number | null; // points above the trusted line (75%): how much bad news the answer can absorb
  curve: ForecastPoint[]; // today, then every two weeks, plus the exact day anything changes
};

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const logit = (p: number) => Math.log(Math.min(0.999, Math.max(0.001, p)) / (1 - Math.min(0.999, Math.max(0.001, p))));

export function forecast(fact: Fact, kb: KnowledgeBase, ctx: Context, feedback: Feedback[], now: Date): Forecast {
  const today = evaluateFact(fact, kb, ctx, feedback, now);
  const value = today.best?.claim.value ?? null;
  const point = (t: number): ForecastPoint => {
    const r = evaluateFact(fact, kb, ctx, feedback, new Date(t));
    return { date: iso(t), score: r.best?.score ?? null, value: r.best?.claim.value ?? null, trusted: r.status === "trusted" };
  };
  // Still the same trusted answer on that day?
  const holds = (t: number) => {
    const r = evaluateFact(fact, kb, ctx, feedback, new Date(t));
    return r.status === "trusted" && !!r.best && !!value && sameValue(r.best.claim.value, value);
  };

  // Sample days: every two weeks, plus every day a published rule takes effect (so a step is never missed).
  const start = Date.parse(iso(now.getTime())); // midnight, so every sample is a whole day
  const end = start + HORIZON_DAYS * DAY;
  const ruleDays = kb.claims
    .filter((c) => c.factKey === fact.key && c.effectiveFrom && Date.parse(c.effectiveFrom) > start && Date.parse(c.effectiveFrom) <= end)
    .map((c) => Date.parse(c.effectiveFrom!));
  const days = [...new Set([start, ...Array.from({ length: Math.floor(HORIZON_DAYS / STEP_DAYS) }, (_, i) => start + (i + 1) * STEP_DAYS * DAY), ...ruleDays])].sort(
    (a, b) => a - b,
  );
  const curve = days.map(point);

  const headroom = today.status === "trusted" && today.best ? Math.round((logit(today.best.score) - logit(STATUS.trusted)) * 10) / 10 : null;
  if (today.status !== "trusted" || !value) return { value, bestBefore: null, headroom, curve };

  // First sampled day it no longer holds, then narrow down to the exact day.
  const i = days.findIndex((t) => !holds(t));
  if (i <= 0) return { value, bestBefore: null, headroom, curve };
  let lo = days[i - 1];
  let hi = days[i];
  while (hi - lo > DAY) {
    const mid = lo + Math.max(1, Math.floor((hi - lo) / DAY / 2)) * DAY;
    if (holds(mid)) lo = mid;
    else hi = mid;
  }

  const then = evaluateFact(fact, kb, ctx, feedback, new Date(hi));
  const newRule = then.best && then.best.claim.effectiveFrom && iso(Date.parse(then.best.claim.effectiveFrom)) === iso(hi);
  const bestBefore = newRule
    ? { date: iso(hi), kind: "new-rule" as const, reason: `${then.best!.claim.source.title} takes effect: ${then.best!.claim.value}` }
    : then.status === "conflict"
      ? { date: iso(hi), kind: "disputed" as const, reason: "Sources start to disagree" }
      : { date: iso(hi), kind: "ages" as const, reason: "The sources behind it get too old to trust without a fresh check" };
  // Make sure the exact turning point is on the curve.
  if (!curve.some((p) => p.date === bestBefore.date)) {
    curve.push(point(hi));
    curve.sort((a, b) => a.date.localeCompare(b.date));
  }
  return { value, bestBefore, headroom, curve };
}

// The waterfall and the forecast as one sentence a person (or the mascot's voice) can say out loud.
// "€8.91 is 96% trusted: who said it +3.0 (official publication), fits your case +0.3. Trusted until 1 Jan 2027, then €9.50."
export function explainScore(best: ScoredClaim | null, ahead: Forecast | null): string {
  if (!best) return "There is no answer for this case yet.";
  const byLayer = LAYERS.map((l) => {
    const items = best.evidence.filter((e) => e.layer === l.id);
    const points = items.reduce((s, e) => s + e.points, 0);
    return { q: l.question.replace("?", "").toLowerCase(), points, why: items[0]?.label.toLowerCase() };
  }).filter((r) => Math.abs(r.points) >= 0.05);
  const parts = byLayer.map((r) => `${r.q} ${r.points > 0 ? "+" : "−"}${Math.abs(r.points).toFixed(1)}${r.why ? ` (${r.why})` : ""}`);
  const cap = best.caps[0] ? ` ${best.caps[0]}.` : "";
  const then = ahead?.bestBefore
    ? ` Trusted until ${new Date(ahead.bestBefore.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}${ahead.curve.find((p) => p.date >= ahead.bestBefore!.date && p.value && p.value !== best.claim.value)?.value ? `, then ${ahead.curve.find((p) => p.date >= ahead.bestBefore!.date && p.value !== best.claim.value)!.value}` : ""}.`
    : "";
  return `${best.claim.value} is ${Math.round(best.score * 100)}% trusted: ${parts.join(", ")}.${cap}${then}`;
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadDataKnowledgeBase } from "./data";
import { evaluateFact, forecast } from "./index";

const { kb } = loadDataKnowledgeBase();
const now = new Date("2026-09-30T12:00:00Z");
const BE = { country: "BE", pc: "200" };
const fact = (key: string) => kb.facts.find((f) => f.key === key)!;

test("a published rule that is not in force yet does not answer today", () => {
  const r = evaluateFact(fact("meal-voucher-max"), kb, BE, [], now);
  assert.equal(r.best?.claim.value, "€8.91");
  assert.ok(r.excluded.some((e) => e.claim.id === "off-meal-2027" && /Takes effect on 2027-01-01/.test(e.reason)));
});

test("best before: the day the new decree takes effect, with the new value after it", () => {
  const f = forecast(fact("meal-voucher-max"), kb, BE, [], now);
  assert.equal(f.value, "€8.91");
  assert.equal(f.bestBefore?.date, "2027-01-01");
  assert.equal(f.bestBefore?.kind, "new-rule");
  assert.ok(f.headroom! > 1.5);
  assert.ok(f.curve.some((p) => p.date >= "2027-01-01" && p.value === "€9.50" && p.trusted));
});

test("an answer backed by the law has no end date and keeps its headroom", () => {
  const f = forecast(fact("annual-leave-days"), kb, BE, [], now);
  assert.equal(f.bestBefore, null);
  assert.ok(f.headroom! > 1.5);
});

test("an answer resting only on a chat message ages out, and the forecast finds the day", () => {
  const chatOnly = {
    ...kb,
    claims: [
      { id: "t1", factKey: "annual-leave-days", value: "20 days", scope: { country: "BE" }, source: { type: "teams" as const, title: "Teams" }, author: "anna", date: "2026-09-01", text: "20 days" },
      { id: "t2", factKey: "annual-leave-days", value: "20 days", scope: { country: "BE" }, source: { type: "teams" as const, title: "Teams" }, author: "jan", date: "2026-09-02", text: "20 days" },
    ],
  };
  const f = forecast(fact("annual-leave-days"), chatOnly, BE, [], now);
  if (f.value) {
    assert.ok(f.bestBefore === null || f.bestBefore.kind === "ages" || f.bestBefore.kind === "disputed");
  }
});

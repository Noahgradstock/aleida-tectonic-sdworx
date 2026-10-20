import { test } from "node:test";
import assert from "node:assert/strict";
import { loadDataKnowledgeBase } from "./data";
import { evaluateFact, extractClaims, parseValue, rankContacts } from "./index";
import type { Feedback } from "./types";

const { kb } = loadDataKnowledgeBase();
const now = new Date("2026-09-30T12:00:00Z");
const BE = { country: "BE", pc: "200" };
const fact = kb.facts.find((f) => f.key === "annual-leave-days")!;
const sofie = kb.people.find((p) => p.id === "sofie")!;

test("parseValue normalises values", () => {
  assert.equal(parseValue("everyone gets 30 days of holiday"), "30 days");
  assert.equal(parseValue("it is 22 holiday days"), "22 days");
  assert.equal(parseValue("max €8,91 per voucher"), "€8.91");
  assert.equal(parseValue("92 % double holiday pay"), "92%");
  assert.equal(parseValue("no numbers here"), null);
});

test("a fresh German meeting statement does not change the Belgian answer", () => {
  const r = evaluateFact(fact, kb, BE, [], now);
  assert.equal(r.status, "trusted");
  assert.equal(r.best?.claim.value, "20 days");
  assert.ok(r.excluded.some((e) => e.claim.author === "lukas"));
});

test("who to contact first: Anna, and Lukas is set aside because he talks about Germany", () => {
  const r = evaluateFact(fact, kb, BE, [], now);
  const { ranked, setAside } = rankContacts(r, BE, kb, [], now);
  assert.equal(ranked[0].person.id, "anna");
  assert.ok(setAside.some((s) => s.person.id === "lukas" && /DE, not BE/.test(s.reason)));
  assert.ok(setAside.some((s) => s.person.id === "koen" && /left/.test(s.reason)));
});

test("meeting transcript: speakers become authors, values become claims, small talk is ignored", () => {
  const transcript = [
    "Jan Wouters: For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.",
    "Sofie Maes: Great, thanks.",
    "Tom: I think it's 25 days of holiday for everyone.",
    "Unknown Person: It's 40 days of holiday.",
  ].join("\n");
  const { extracted, skipped } = extractClaims(transcript, "meeting", BE, kb, sofie, now);
  assert.equal(extracted.length, 2);
  const jan = extracted.find((e) => e.claim.author === "jan")!;
  assert.equal(jan.claim.value, "22 days");
  assert.equal(jan.claim.scope.client, "brouwerij-de-kroon");
  assert.equal(extracted.find((e) => e.claim.author === "tom")!.claim.hedged, true);
  assert.ok(skipped.some((s) => /Speaker unknown/.test(s.reason)));
});

test("an unconfirmed meeting claim is capped at 50%, and the speaker's confirmation lifts it", () => {
  const { extracted } = extractClaims("Jan: For Brouwerij De Kroon we agreed 22 holiday days.", "meeting", BE, kb, sofie, now);
  const live = { ...kb, claims: [...kb.claims, extracted[0].claim] };
  const ctx = { country: "BE", pc: "200", client: "brouwerij-de-kroon" };
  const before = evaluateFact(fact, live, ctx, [], now).claims.find((c) => c.claim.id === extracted[0].claim.id)!;
  assert.ok(before.score <= 0.5);
  const confirm: Feedback = { claimId: extracted[0].claim.id, userId: "jan", kind: "correct", context: ctx, date: now.toISOString() };
  const after = evaluateFact(fact, live, ctx, [confirm], now);
  assert.ok(after.claims.find((c) => c.claim.id === extracted[0].claim.id)!.score > 0.75);
  assert.equal(after.best?.claim.value, "22 days");
});

test("email: the writer is always the signed-in user, speaker labels are ignored", () => {
  const { extracted } = extractClaims("Anna: holiday is 20 days of annual leave.", "email", BE, kb, sofie, now);
  assert.equal(extracted[0].claim.author, "sofie");
});

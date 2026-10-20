import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadDataKnowledgeBase } from "./data";
import { findValues } from "./extract";
import { evaluateFact, extractClaims, parseValue, rankContacts } from "./index";
import type { Claim, Feedback, KnowledgeBase } from "./types";

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
  assert.ok(setAside.some((s) => s.person.id === "lukas" && /yesterday in a meeting, but about DE, not BE/.test(s.reason)));
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

test("a general guess that contradicts the law is capped, not treated as a sector exception", () => {
  const { extracted } = extractClaims("Tom Claes: I think everyone gets 25 days of holiday now.", "meeting", BE, kb, sofie, now);
  const live = { ...kb, claims: [...kb.claims, extracted[0].claim] };
  const tom = evaluateFact(fact, live, BE, [], now).claims.find((c) => c.claim.id === extracted[0].claim.id)!;
  assert.ok(tom.score <= 0.2, `got ${tom.score}`);
});

test("a consultant's email cannot override the law as a 'client exception' on its own", () => {
  const { extracted } = extractClaims("For Brouwerij De Kroon employees get 35 days of annual leave.", "email", BE, kb, sofie, now);
  const live = { ...kb, claims: [...kb.claims, extracted[0].claim] };
  const r = evaluateFact(fact, live, { country: "BE", pc: "200", client: "brouwerij-de-kroon" }, [], now);
  assert.notEqual(r.best?.claim.value, "35 days");
});

// ---------- Values: Belgian, Dutch, French and English ways of writing them ----------

test("parseValue reads Belgian, Dutch and French number formats", () => {
  assert.equal(parseValue("max € 8,91 per voucher"), "€8.91");
  assert.equal(parseValue("the cap is 8,91 EUR"), "€8.91");
  assert.equal(parseValue("the old cap was EUR 6.91"), "€6.91");
  assert.equal(parseValue("8,91 euro per day worked"), "€8.91");
  // Money is written like the kb ("€1,600", "€2,070.48"), so sameValue() matches it.
  assert.equal(parseValue("a gross bonus of €1.600"), "€1,600");
  assert.equal(parseValue("€ 2.070,48 per month"), "€2,070.48");
  assert.equal(parseValue("€0,4326 per km"), "€0.4326");
  assert.equal(parseValue("€8,5 per voucher"), "€8.50");
  assert.equal(parseValue("indexation of 2,0 %"), "2.0%");
  assert.equal(parseValue("92 percent of the monthly salary"), "92%");
});

test("parseValue reads number words and units in three languages", () => {
  assert.equal(parseValue("everyone gets twenty days of holiday"), "20 days");
  assert.equal(parseValue("twenty-two holiday days"), "22 days");
  assert.equal(parseValue("twenty two days off"), "22 days");
  assert.equal(parseValue("one week of notice"), "1 week");
  assert.equal(parseValue("thirty days"), "30 days");
  assert.equal(parseValue("20 vakantiedagen per jaar"), "20 days");
  assert.equal(parseValue("20 jours de congé"), "20 days");
  // "PC 200" is a joint committee, not a duration.
  assert.equal(parseValue("in PC 200 holiday days are 20 days"), "20 days");
  assert.equal(parseValue("someone said it"), null);
});

test("findValues marks differences, denials and ranges", () => {
  const [extra] = findValues("two extra days on top of the law");
  assert.equal(extra.value, "2 days");
  assert.equal(extra.delta, true);
  const denied = findValues("it is 20 days, not 24 days");
  assert.deepEqual(denied.map((q) => [q.value, q.negated]), [["20 days", false], ["24 days", true]]);
  for (const s of ["20 to 24 days", "20-24 days", "between 20 and 24 days", "two or three weeks", "€8 to €9", "20 tot 24 dagen"]) {
    assert.ok(findValues(s).some((q) => q.range), s);
  }
  // Two different kinds of value next to each other are not a range.
  assert.ok(!findValues("92% and 8 weeks").some((q) => q.range));
});

test("extraction abstains on ranges, several values and differences, with a reason", () => {
  const text = [
    "Anna De Smet: Annual leave is 20 to 24 days, depending on the schedule.",
    "Anna De Smet: Annual leave is 20 days, or 24 days for a six-day week.",
    "Anna De Smet: De Kroon gives two extra days of annual leave.",
    "Anna De Smet: Annual leave is 20 days, not 24 days.",
  ].join("\n");
  const { extracted, skipped } = extractClaims(text, "meeting", BE, kb, sofie, now);
  assert.match(skipped[0].reason, /range or options \("20 to 24 days"\)/);
  assert.match(skipped[1].reason, /several values \(20 days, 24 days\)/);
  assert.match(skipped[2].reason, /difference/);
  // A denied value is not a second value: "20 days, not 24" is one clear statement.
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].claim.value, "20 days");
});

// ---------- Speakers ----------

test("speaker labels: timestamps, organisations, particles, Teams .vtt and .docx formats", () => {
  const text = [
    "[10:02] Jan Wouters: For Brouwerij De Kroon we agreed 22 holiday days.",
    "Anna De Smet (SD Worx): A full-time employee gets 20 days of annual leave.",
    "Lars de Vries: In the Netherlands it is 20 days of annual leave.",
    "<v Lotte Verbeke>Holiday days: 20 days for a five-day week.</v>",
    "Tom Claes   0:42",
    "I think it's 25 days of holiday.",
  ].join("\n");
  const { extracted } = extractClaims(text, "meeting", BE, kb, sofie, now);
  assert.deepEqual(extracted.map((e) => e.claim.author), ["jan", "anna", "lars", "lotte", "tom"]);
  assert.equal(extracted[2].claim.scope.country, "NL");
});

test("speakers: 'Jan van Damme' is not Jan Wouters, and a shared first name is not guessed", () => {
  const unknown = extractClaims("Jan van Damme: Annual leave is 25 days.", "meeting", BE, kb, sofie, now);
  assert.equal(unknown.extracted.length, 0);
  assert.match(unknown.skipped[0].reason, /Speaker unknown \("Jan van Damme"\)/);
  const twoJans: KnowledgeBase = { ...kb, people: [...kb.people, { id: "jan-p", name: "Jan Peeters", role: "regular", team: "Payroll BE" }] };
  const unclear = extractClaims("Jan: Annual leave is 25 days.", "meeting", BE, twoJans, sofie, now);
  assert.match(unclear.skipped[0].reason, /could be Jan Wouters or Jan Peeters/);
});

// ---------- Corrections in conversation ----------

test("'No, it's 20 days' corrects the previous claim on the same fact and takes its scope", () => {
  const text = [
    "Tom Claes: For Brouwerij De Kroon it's 24 holiday days.",
    "Anna De Smet: No, it's 20 days.",
  ].join("\n");
  const { extracted } = extractClaims(text, "meeting", BE, kb, sofie, now);
  const [tom, anna] = extracted.map((e) => e.claim);
  assert.equal(anna.value, "20 days");
  assert.equal(anna.corrects, tom.id);
  assert.equal(anna.scope.client, "brouwerij-de-kroon");
  assert.deepEqual(extracted[1].reply, { to: tom.id, kind: "corrects" });
  // score.ts turns it into evidence on Tom's claim.
  const ctx = { country: "BE", pc: "200", client: "brouwerij-de-kroon" };
  const r = evaluateFact(fact, { ...kb, claims: [...kb.claims, tom, anna] }, ctx, [], now);
  assert.ok(r.claims.find((c) => c.claim.id === tom.id)!.evidence.some((e) => e.tag === "Corrected"));
});

test("'Actually it's 20' takes the unit from the claim it corrects; agreement sets nothing", () => {
  const text = [
    "Tom Claes: I think everyone gets 25 days of holiday.",
    "Anna De Smet: Actually it's 20.",
    "Lotte Verbeke: Yes, 20 days.",
    "Sofie Maes: No, meet me at 10.",
  ].join("\n");
  const { extracted } = extractClaims(text, "meeting", BE, kb, sofie, now);
  assert.equal(extracted.length, 3);
  const [tom, anna, lotte] = extracted;
  assert.equal(anna.claim.value, "20 days");
  assert.equal(anna.claim.corrects, tom.claim.id);
  // Lotte agrees with Anna: reported for the UI, but no claim is changed (the score already counts her).
  assert.deepEqual(lotte.reply, { to: anna.claim.id, kind: "agrees" });
  assert.equal(lotte.claim.corrects, undefined);
  assert.equal(anna.claim.reactions, undefined);
});

test("a correction only ever points at a claim from the same text", () => {
  const { extracted } = extractClaims("Anna De Smet: No, it's 20 days of annual leave.", "meeting", BE, kb, sofie, now);
  assert.equal(extracted[0].claim.corrects, undefined);
});

test("demo transcript: the De Kroon check-in reads as expected", () => {
  const text = readFileSync(path.join(process.cwd(), "data/salary/holiday-days/05-meeting-de-kroon-checkin-2026-10-19.txt"), "utf8");
  const { extracted, skipped } = extractClaims(text, "meeting", BE, kb, sofie, new Date("2026-10-19T10:30:00Z"));
  assert.deepEqual(
    extracted.map((e) => [e.claim.author, e.claim.value, e.reply?.kind ?? "-"]),
    [["jan", "22 days", "-"], ["tom", "25 days", "-"], ["anna", "20 days", "corrects"], ["lotte", "20 days", "agrees"], ["lars", "20 days", "-"]],
  );
  assert.ok(skipped.some((s) => /range/.test(s.reason)));
  assert.ok(skipped.some((s) => /Jan van Damme/.test(s.reason)));
});

// ---------- Who to contact: spoof-proof track record and crisp reasons ----------

const meetingLine = (line: string) => extractClaims(line, "meeting", BE, kb, sofie, now).extracted[0].claim;
const withClaims = (...claims: Claim[]): KnowledgeBase => ({ ...kb, claims: [...kb.claims, ...claims] });
const contact = (k: KnowledgeBase, id: string, fb: Feedback[] = []) =>
  rankContacts(evaluateFact(fact, k, BE, fb, now), BE, k, fb, now).ranked.find((c) => c.person.id === id);

test("a meeting line typed in someone else's name cannot hurt their track record", () => {
  const spoof = meetingLine("Anna De Smet: It's 25 days of annual leave.");
  assert.deepEqual(contact(withClaims(spoof), "anna")!.reasons.filter((r) => r.startsWith("Right")), ["Right 1 of 1 time"]);
  // Once Anna confirms it from her own account, it is hers and it counts.
  const own: Feedback = { claimId: spoof.id, userId: "anna", kind: "correct", context: BE, date: now.toISOString() };
  assert.ok(contact(withClaims(spoof), "anna", [own])!.reasons.includes("Right 1 of 2 times"));
});

test("a meeting line the speaker reported themselves is their own answer, right or wrong", () => {
  const own = { ...meetingLine("Anna De Smet: It's 25 days of annual leave."), reportedBy: "anna" };
  assert.ok(contact(withClaims(own), "anna")!.reasons.includes("Right 1 of 2 times"));
});

test("someone with only an unconfirmed, wrong meeting line is set aside, not ranked", () => {
  const k = withClaims(meetingLine("Tom Claes: I think it's 25 days of annual leave."));
  const { ranked, setAside } = rankContacts(evaluateFact(fact, k, BE, [], now), BE, k, [], now);
  assert.ok(!ranked.some((c) => c.person.id === "tom"));
  assert.ok(setAside.some((s) => s.person.id === "tom" && /not confirmed/.test(s.reason)));
});

test("repeating the trusted value in one meeting counts once, and counts as recent", () => {
  const k = withClaims(
    meetingLine("Pieter Jacobs: Annual leave is 20 days."),
    meetingLine("Pieter Jacobs: Yes, 20 days of annual leave, really."),
    meetingLine("Pieter Jacobs: Full-time means 20 days of annual leave."),
  );
  const pieter = contact(k, "pieter")!;
  assert.ok(pieter.reasons.includes("Right 1 of 1 time"));
  assert.ok(pieter.reasons.includes("Dealt with it today in a meeting"));
});

test("reasons are short chips, and the top contact gets one sentence", () => {
  const { ranked, why } = rankContacts(evaluateFact(fact, kb, BE, [], now), BE, kb, [], now);
  assert.deepEqual(ranked[0].reasons, ["Expert in Payroll BE", "Right 1 of 1 time", "Dealt with it 20 days ago in Teams"]);
  assert.equal(why, "Anna: expert in Payroll BE, right every time on this topic, last answered 20 days ago in Teams.");
  assert.equal(ranked[0].why, why);
  assert.ok(ranked[0].lastSeen && ranked[0].points > 0);
});

test("confirming colleagues counts per colleague, and only for answers that held up", () => {
  const idx = kb.facts.find((f) => f.key === "indexation-2026")!;
  const ctx = { country: "BE", pc: "200" };
  const { ranked } = rankContacts(evaluateFact(idx, kb, ctx, [], now), ctx, kb, [], now);
  // Jan and Lotte gave 👍 to Anna's 1.8% (right); Sofie's 👍 there counts too, but no credit for confirming 2.1%.
  assert.ok(ranked.find((c) => c.person.id === "jan")!.reasons.includes("Confirmed 1 colleague"));
});

test("after a client exception wins, whoever gave the country rule is still 'right' at their own level", () => {
  const { extracted } = extractClaims("Jan: For Brouwerij De Kroon we agreed 22 holiday days.", "meeting", BE, kb, kb.people.find((p) => p.id === "jan")!, now);
  const claim = { ...extracted[0].claim, reportedBy: "jan" };
  const live = { ...kb, claims: [...kb.claims, claim] };
  const ctx = { country: "BE", pc: "200", client: "brouwerij-de-kroon" };
  const fb: Feedback[] = [{ claimId: claim.id, userId: "anna", kind: "correct", context: ctx, date: now.toISOString() }];
  const r = evaluateFact(fact, live, ctx, fb, now);
  assert.equal(r.best?.claim.value, "22 days");
  const anna = rankContacts(r, ctx, live, fb, now).ranked.find((c) => c.person.id === "anna")!;
  assert.ok(anna.reasons.some((x) => /Right 1 of 1/.test(x)), anna.reasons.join(", "));
});

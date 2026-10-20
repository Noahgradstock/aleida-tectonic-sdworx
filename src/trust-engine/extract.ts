import { matchFact } from "./ask";
import { sameValue } from "./score";
import type { Claim, Context, Fact, KnowledgeBase, Person, Scope, SourceType } from "./types";

// Layer 0: turns everyday text (a meeting transcript, a Teams message, an email draft) into claims.
// Deterministic: a sentence becomes a claim only if it states ONE value AND matches a known topic,
// and its unit matches what the brain already knows about that topic. Everything else is ignored
// or skipped with a reason. The quote is always the speaker's own sentence, verbatim.

export type Channel = Extract<SourceType, "meeting" | "teams" | "email">;

// reply: this sentence answers an earlier claim in the same text. "corrects" also sets claim.corrects;
// "agrees" only informs the UI (the score already counts a colleague saying the same value).
export type Extracted = { claim: Claim; quote: string; speaker: Person | null; reply?: { to: string; kind: "corrects" | "agrees" } };
export type Skipped = { sentence: string; reason: string };

// ---------- Values ----------

// One value found in a sentence. Positions let us look at the words around it.
export type Quantity = {
  value: string; // normalised: "€8.91", "92%", "20 days"
  unit: string; // as unitOf(): "€", "%", "day", "week", "month", "hour"
  text: string; // as written
  start: number;
  end: number;
  delta: boolean; // "two extra days": a difference, not the value itself
  negated: boolean; // "not 22": the value it is NOT
  range: string | null; // "20 to 24 days": the whole range as written
};

const ONES = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const NUMBER_WORDS: Record<string, number> = Object.fromEntries([
  ...ONES.map((w, i) => [w, i + 1]),
  ...TEENS.map((w, i) => [w, i + 10]),
  ["twenty", 20],
  ...ONES.map((w, i) => [`twenty-${w}`, 21 + i]),
  ["thirty", 30],
]);
// Longest first, so "twenty-two" wins over "twenty". "twenty two" (space) is accepted too.
const NUM_WORD = Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .map((w) => w.replace("-", "[-\\s]"))
  .join("|");
const DIGITS = String.raw`\d+(?:[.,]\d+)*`;
// English, Dutch and French duration words. Dutch compounds ("vakantiedagen") count as days.
const UNIT_WORD = String.raw`days?|weeks?|months?|hours?|dagen|dag|weken|maanden|maand|uren|uur|jours?|semaines?|mois|heures?|\p{L}+dagen`;

const QUANTITY = new RegExp(
  [
    String.raw`(?:€|\bEUR\b)\s?(?<m1>${DIGITS})`, // €8,91 · € 8.91 · EUR 6.91
    String.raw`\b(?<m2>${DIGITS})\s?(?:€|EUR\b|euros?\b)`, // 8,91 EUR · 8,91 € · 8.91 euro
    String.raw`\b(?<p>${DIGITS})\s?(?:%|percent\b|procent\b|pour\s?cent\b)`, // 92% · 92 % · 92 percent
    // 20 days · 22 holiday days · twenty days. Not "PC 200 holiday days": that is a joint committee.
    // The words in between may not be another number or a connector: "two or three days" is a range, not "2 days".
    String.raw`(?<!\bPC\s?)\b(?<d>${DIGITS}|${NUM_WORD})\s+(?<mid>(?:(?!(?:${NUM_WORD}|to|or|and|tot|en|of|ou)\b)\p{L}+\s+){0,2}?)(?<u>${UNIT_WORD})\b`,
  ].join("|"),
  "giu",
);
const DELTA_BETWEEN = /\b(extra|more|additional|fewer|less|meer|minder|bijkomende|supplémentaires?)\b/i;
const DELTA_AFTER = /^\s*(more|extra|less|fewer|higher|lower|on top|meer|minder|de plus)\b/i;
const NEGATED_BEFORE = /\b(not|niet|pas|instead of|rather than|in plaats van|au lieu de)\s*$/i;
// "20 to 24", "20-24", "between 20 and 24", "two or three", "20 tot 24", "20 à 24", "€8 to €9".
const RANGE_LEFT = new RegExp(
  String.raw`(?:between\s+|tussen\s+|entre\s+)?(?<!\bPC\s?)(?:€\s?|\bEUR\s?)?\b(?:${DIGITS}|${NUM_WORD})\s*(?<lu>%|€|eur(?:os?)?|${UNIT_WORD})?\s*(?:-|–|—|to|tot|till|until|à|and|en|et|or|ou)\s*$`,
  "iu",
);

function canonicalUnit(word: string): string {
  const w = word.toLowerCase();
  if (w === "%") return "%";
  if (w === "€" || w.startsWith("eur")) return "€";
  if (/^(days?|dag|dagen|jours?)$|dagen$/.test(w)) return "day";
  if (/^(weeks?|weken|semaines?)$/.test(w)) return "week";
  if (/^(months?|maand|maanden|mois)$/.test(w)) return "month";
  return "hour";
}

// Belgian, Dutch, French and English number formats to one form. The kb writes money the English way
// ("€1,600", "€8.91"), so we do too; sameValue() then matches it.
// One separator followed by exactly three digits is a thousands separator for money and durations
// ("€1.600" = 1600), except after a zero ("€0,433"). For percentages it is always a decimal.
function normaliseNumber(raw: string, kind: "money" | "percent" | "count"): string {
  const word = NUMBER_WORDS[raw.toLowerCase().replace(/[-\s]+/g, "-")];
  if (word) return String(word);
  const seps = raw.match(/[.,]/g) ?? [];
  if (!seps.length) return String(Number(raw));
  const last = Math.max(raw.lastIndexOf("."), raw.lastIndexOf(","));
  const head = raw.slice(0, last);
  const tail = raw.slice(last + 1);
  const thousands =
    (new Set(seps).size === 1 && seps.length > 1) || (seps.length === 1 && kind !== "percent" && tail.length === 3 && !/^0+$/.test(head));
  const int = String(Number((thousands ? raw : head).replace(/[.,]/g, "")));
  let frac = thousands ? "" : tail;
  if (kind !== "money") return frac ? `${int}.${frac}` : int;
  if (frac.length === 1) frac += "0"; // €8,5 is €8.50
  return `${int.replace(/\B(?=(\d{3})+$)/g, ",")}${frac ? `.${frac}` : ""}`;
}

// Every value in a sentence, in order. Callers decide what to do with zero, one or several.
export function findValues(sentence: string): Quantity[] {
  const out: Quantity[] = [];
  for (const m of sentence.matchAll(QUANTITY)) {
    const g = m.groups!;
    const start = m.index!;
    const end = start + m[0].length;
    const value =
      g.m1 || g.m2
        ? `€${normaliseNumber(g.m1 ?? g.m2, "money")}`
        : g.p
          ? `${normaliseNumber(g.p, "percent")}%`
          : count(normaliseNumber(g.d, "count"), canonicalUnit(g.u));
    // Only the words just before matter; a bounded window keeps long sentences fast.
    const from = Math.max(0, start - 60);
    const before = sentence.slice(from, start);
    const left = before.match(RANGE_LEFT);
    // A range only when both ends are the same kind of value ("92% and 8 weeks" is not a range).
    const isRange = !!left && (!left.groups?.lu || canonicalUnit(left.groups.lu) === unitOf(value));
    out.push({
      value,
      unit: unitOf(value),
      text: m[0],
      start,
      end,
      delta: (!!g.mid && DELTA_BETWEEN.test(g.mid)) || DELTA_AFTER.test(sentence.slice(end)),
      negated: NEGATED_BEFORE.test(before),
      range: isRange ? sentence.slice(from + left!.index!, end).trim() : null,
    });
  }
  return out;
}

const count = (n: string, unit: string) => `${n} ${unit}${n === "1" ? "" : "s"}`;

// The first value the sentence states (not one it denies). Kept for callers that need one value.
export function parseValue(sentence: string): string | null {
  return findValues(sentence).find((q) => !q.negated)?.value ?? null;
}

export const unitOf = (value: string) => (value.startsWith("€") ? "€" : value.endsWith("%") ? "%" : value.replace(/^[\d.,]+\s*/, "").replace(/s$/, ""));

// "Actually it's 20": a bare number, only used in a short reply to an earlier claim, which supplies
// the unit. Exactly one number, not a time or a room ("No, meet at 10"), or we do not guess.
function bareValue(sentence: string, unit: string): string | null {
  if (sentence.split(/\s+/).length > 6) return null;
  const nums = [...sentence.matchAll(new RegExp(String.raw`(?<![\p{L}\p{N}.,:])(${DIGITS}|${NUM_WORD})(?![\p{L}\p{N}:]|[.,]\d)`, "giu"))];
  if (nums.length !== 1 || /\b(at|om|à|pc|page|room|nr|number)\s*#?\s*$/i.test(sentence.slice(0, nums[0].index))) return null;
  const raw = nums[0][1];
  if (unit === "€") return `€${normaliseNumber(raw, "money")}`;
  if (unit === "%") return `${normaliseNumber(raw, "percent")}%`;
  return ["day", "week", "month", "hour"].includes(unit) ? count(normaliseNumber(raw, "count"), unit) : null;
}

// ---------- Speakers ----------

// Meeting tools write the speaker in many ways. All of these give "Jan Wouters":
//   Jan Wouters: text · [10:02] Jan Wouters: text · 10:02 - Jan Wouters: text · Jan Wouters (SD Worx): text
//   <v Jan Wouters>text</v> (Teams .vtt) · "Jan Wouters   0:42" on its own line, text below (Teams .docx)
// Names may carry particles: "Lars de Vries", "Jan van Damme", "Els Van den Bossche".
const STAMP = String.raw`[[(]?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?[\])]?`;
const PARTICLE = String.raw`(?:van|von|de|der|den|du|des|da|di|del|le|la|ter|ten|vande|vanden|vander|op|het|'t)`;
const NAME_WORD = String.raw`\p{Lu}[\p{L}'’-]*`;
const NAME = String.raw`${NAME_WORD}(?:\s+(?:${PARTICLE}\s+){0,2}${NAME_WORD}){0,3}`;
const INLINE = new RegExp(String.raw`^\s*(?:${STAMP}\s*[-–]?\s*)?(${NAME})\s*(?:\([^)]{1,40}\))?\s*(?:${STAMP}\s*)?:\s*(.+)$`, "u");
const VTT = /^\s*<v\s+([^>]{1,60})>(.*?)(?:<\/v>)?\s*$/u;
const HEADER = new RegExp(String.raw`^\s*(${NAME})\s*(?:\([^)]{1,40}\))?\s+${STAMP}\s*$`, "u");

type Who = { person: Person } | { reason: string };

const plain = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/’/g, "'").replace(/\s+/g, " ").trim().toLowerCase();

// Full name first, then first name. Two people with the same first name: we do not pick one.
function findPerson(label: string, people: Person[]): Who {
  const n = plain(label);
  for (const match of [(p: Person) => plain(p.name) === n, (p: Person) => plain(p.name).split(" ")[0] === n]) {
    const hits = people.filter(match);
    if (hits.length === 1) return { person: hits[0] };
    if (hits.length > 1) return { reason: `Speaker unclear: "${label}" could be ${hits.map((p) => p.name).join(" or ")}` };
  }
  return { reason: `Speaker unknown ("${label}"): nobody to confirm it with` };
}

// One transcript line: a new speaker label (with or without text), or text by the current speaker.
function readTurn(line: string, people: Person[]): { who?: Who; body: string } {
  const m = line.match(VTT) ?? line.match(INLINE);
  if (m) return { who: findPerson(m[1].trim(), people), body: m[2] };
  const h = line.match(HEADER);
  if (h) return { who: findPerson(h[1], people), body: "" };
  return { body: line };
}

// ---------- Conversation ----------

// A reply to what was just said. Corrections lower the corrected claim (score.ts: -1.5);
// agreements are already counted by the score as "a colleague said the same".
const CORRECTION =
  /^\W*(no|nope|nah|not quite|wrong|correction|wait|sorry|nee|neen|non)\b|\b(actually|in fact|correction|eigenlijk|en fait|that'?s not|it'?s not)\b|\bnot\s+(?:€\s?)?\d/i;
const AGREEMENT = /^\W*(yes|yeah|yep|right|correct|exactly|indeed|true|agreed|confirmed|ja|klopt|oui)\b/i;

// ---------- Extraction ----------

const COUNTRY: [RegExp, string][] = [
  [/\b(german|germany|deutschland)\b/i, "DE"],
  [/\b(dutch|netherlands|nederland)\b/i, "NL"],
  [/\b(belgian|belgium|belgi[eë])\b/i, "BE"],
];
const HEDGE = /\b(i think|i guess|probably|maybe|not sure|if i remember|i believe)\b/i;

// Small stable hash, so the same sentence fed twice becomes the same claim (no double counting).
function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const countryOfTeam = (p: Person | null) => p?.team.match(/\b[A-Z]{2}\b/)?.[0];

// What the sentence itself says about where it applies, or null when it names nothing.
function namedScope(sentence: string, kb: KnowledgeBase): Partial<Scope> | null {
  const client = kb.clients.find((c) => sentence.toLowerCase().includes(c.name.toLowerCase().replace(/\s(nv|bv)$/i, "")));
  if (client) return { country: client.country, pc: client.pc, client: client.id };
  const country = COUNTRY.find(([re]) => re.test(sentence))?.[1];
  const pc = sentence.match(/\bPC\s?(\d{3})\b/i)?.[1];
  return country || pc ? { country, pc } : null;
}

type Read = { fact: Fact; value: string; replyTo?: Claim; replyKind?: "corrects" | "agrees" } | { reason: string } | null;

// One sentence: which topic, which single value, and whether it answers the previous claim.
// null = no value at all (small talk), ignored silently.
function readSentence(sentence: string, kb: KnowledgeBase, earlier: Claim[]): Read {
  const found = findValues(sentence);
  const correcting = CORRECTION.test(sentence) || found.some((q) => q.negated);
  const isReply = correcting || AGREEMENT.test(sentence);
  const last = earlier.at(-1);
  // "No, it's 20 days" names no topic: in a reply it is about what was just said.
  const fact = matchFact(sentence, kb.facts) ?? (isReply && last ? kb.facts.find((f) => f.key === last.factKey) ?? null : null);
  const previous = fact ? earlier.filter((c) => c.factKey === fact.key).at(-1) : undefined;

  let values = found.filter((q) => !q.negated);
  if (!found.length && correcting && previous) {
    const bare = bareValue(sentence, unitOf(previous.value));
    if (bare) values = findValues(bare).map((q) => ({ ...q, text: sentence }));
  }
  if (!values.length) return found.length ? { reason: "Only says what the value is not" } : null;
  if (!fact) return { reason: "States a value, but not about a topic the brain knows" };

  const known = [...new Set(kb.claims.filter((c) => c.factKey === fact.key).map((c) => unitOf(c.value)))];
  const fitting = known.length ? values.filter((q) => known.includes(q.unit)) : values;
  if (!fitting.length) return { reason: `Unit does not fit ${fact.label.toLowerCase()} (expected ${known.join(" or ")})` };
  // A range or two options is not one value. Taking either end would be a guess.
  const range = fitting.find((q) => q.range)?.range;
  if (range) return { reason: `Gives a range or options ("${range}"), not one value` };
  const absolute = fitting.filter((q) => !q.delta);
  if (!absolute.length) return { reason: `Gives a difference ("${fitting[0].text}"), not the value itself` };
  const distinct = absolute.filter((q, i) => absolute.findIndex((o) => sameValue(o.value, q.value)) === i).map((q) => q.value);
  if (distinct.length > 1) return { reason: `Mentions several values (${distinct.join(", ")}): not guessing which one is meant` };

  const value = distinct[0];
  if (!previous || !isReply) return { fact, value };
  if (correcting && !sameValue(previous.value, value)) return { fact, value, replyTo: previous, replyKind: "corrects" };
  if (!correcting && sameValue(previous.value, value)) return { fact, value, replyTo: previous, replyKind: "agrees" };
  return { fact, value };
}

export function extractClaims(
  text: string,
  channel: Channel,
  ctx: Context,
  kb: KnowledgeBase,
  writer: Person, // the signed-in user: author of an email or Teams message, reporter of a meeting
  now: Date,
): { extracted: Extracted[]; skipped: Skipped[] } {
  const extracted: Extracted[] = [];
  const skipped: Skipped[] = [];
  const date = now.toISOString().slice(0, 10);
  // Email and Teams are always written by the signed-in user. In a meeting, the last speaker label
  // holds until the next one (multi-line turns, Teams transcripts with the name on its own line).
  let who: Who = channel === "meeting" ? { reason: "Speaker unknown: no speaker label before this line" } : { person: writer };

  for (const line of text.slice(0, 8000).split(/\n+/)) {
    const turn = channel === "meeting" ? readTurn(line, kb.people) : { body: line };
    if (turn.who) who = turn.who;

    for (const sentence of turn.body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)) {
      const read = readSentence(sentence, kb, extracted.map((e) => e.claim));
      if (!read) continue;
      if ("reason" in read) {
        skipped.push({ sentence, reason: read.reason });
        continue;
      }
      if ("reason" in who) {
        skipped.push({ sentence, reason: who.reason });
        continue;
      }
      const speaker = who.person;

      // Scope: a client named in the sentence, else a country or PC named in it. A reply that names
      // nothing is about the claim it answers. Else the speaker's own country, else the case.
      // Only what is actually said narrows the scope: a general statement is not a sector or client exception.
      const named = namedScope(sentence, kb);
      const country = named?.country ?? countryOfTeam(speaker) ?? ctx.country;
      const scope: Scope = named?.client
        ? { country, pc: named.pc, client: named.client }
        : named
          ? named.pc ? { country, pc: named.pc } : { country }
          : read.replyTo
            ? { ...read.replyTo.scope }
            : { country };

      const claim: Claim = {
        // The corrected claim is part of the id: "No, it's 20 days." in two meetings corrects two different things.
        id: `live-${channel}-${hash(`${speaker.id}|${sentence}${read.replyKind === "corrects" ? `|${read.replyTo!.id}` : ""}`)}`,
        factKey: read.fact.key,
        value: read.value,
        scope,
        source: { type: channel, title: channel === "meeting" ? "Meeting (live)" : channel === "teams" ? "Teams message (live)" : "Email draft (live)" },
        author: speaker.id,
        date,
        text: sentence,
        hedged: HEDGE.test(sentence) || undefined,
        corrects: read.replyKind === "corrects" ? read.replyTo!.id : undefined,
      };
      const reply = read.replyTo && read.replyKind ? { to: read.replyTo.id, kind: read.replyKind } : undefined;
      extracted.push({ claim, quote: sentence, speaker, ...(reply && { reply }) });
    }
  }
  return { extracted, skipped };
}

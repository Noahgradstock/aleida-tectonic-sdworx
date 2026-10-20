import { matchFact } from "./ask";
import type { Claim, Context, KnowledgeBase, Person, SourceType } from "./types";

// Layer 0: turns everyday text (a meeting transcript, a Teams message, an email draft) into claims.
// Deterministic: a sentence becomes a claim only if it states a value AND matches a known topic,
// and its unit matches what the brain already knows about that topic. Everything else is ignored.
// The quote is always the speaker's own sentence, verbatim.

export type Channel = Extract<SourceType, "meeting" | "teams" | "email">;

export type Extracted = { claim: Claim; quote: string; speaker: Person | null };
export type Skipped = { sentence: string; reason: string };

const VALUE = /(€\s?\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?\s?%)|(\d+)\s+(?:[a-z]+\s+){0,2}?(days?|weeks?|months?)\b/i;
const HEDGE = /\b(i think|i guess|probably|maybe|not sure|if i remember|i believe)\b/i;
const COUNTRY: [RegExp, string][] = [
  [/\b(german|germany|deutschland)\b/i, "DE"],
  [/\b(dutch|netherlands|nederland)\b/i, "NL"],
  [/\b(belgian|belgium|belgi[eë])\b/i, "BE"],
];

// "Lukas Becker: text" or "Jan: text". In production the meeting tool supplies the speaker.
const SPEAKER = /^\s*([A-Z][\p{L}'-]+(?:\s[A-Z][\p{L}'-]+)?)\s*:\s*(.+)$/u;

export function parseValue(sentence: string): string | null {
  const m = sentence.match(VALUE);
  if (!m) return null;
  if (m[1]) return `€${m[1].replace(/€\s?/, "").replace(",", ".")}`;
  if (m[2]) return m[2].replace(/\s/g, "").replace(",", ".");
  const n = Number(m[3]);
  const unit = m[4].toLowerCase().replace(/s$/, "");
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export const unitOf = (value: string) => (value.startsWith("€") ? "€" : value.endsWith("%") ? "%" : value.replace(/^[\d.,]+\s*/, "").replace(/s$/, ""));

// Small stable hash, so the same sentence fed twice becomes the same claim (no double counting).
function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function findPerson(name: string, people: Person[]): Person | null {
  const n = name.toLowerCase();
  return people.find((p) => p.name.toLowerCase() === n) ?? people.find((p) => p.name.split(" ")[0].toLowerCase() === n) ?? null;
}

const countryOfTeam = (p: Person | null) => p?.team.match(/\b[A-Z]{2}\b/)?.[0];

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

  for (const line of text.slice(0, 8000).split(/\n+/)) {
    const m = channel === "meeting" ? line.match(SPEAKER) : null;
    // Only meeting transcripts carry speaker labels. Email and Teams are always written by the signed-in user.
    const speaker = m ? findPerson(m[1], kb.people) : channel === "meeting" ? null : writer;
    const body = m ? m[2] : line;

    for (const sentence of body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)) {
      const value = parseValue(sentence);
      if (!value) continue;
      const fact = matchFact(sentence, kb.facts);
      if (!fact) {
        skipped.push({ sentence, reason: "States a value, but not about a topic the brain knows" });
        continue;
      }
      const known = kb.claims.filter((c) => c.factKey === fact.key).map((c) => unitOf(c.value));
      if (known.length && !known.includes(unitOf(value))) {
        skipped.push({ sentence, reason: `Unit does not fit ${fact.label.toLowerCase()} (expected ${[...new Set(known)].join(" or ")})` });
        continue;
      }
      if (channel === "meeting" && !speaker) {
        skipped.push({ sentence, reason: "Speaker unknown: nobody to confirm it with" });
        continue;
      }

      // Scope: a client named in the sentence, else a country named in it, else the speaker's own country, else the case.
      const client = kb.clients.find((c) => sentence.toLowerCase().includes(c.name.toLowerCase().replace(/\s(nv|bv)$/i, "")));
      const country = COUNTRY.find(([re]) => re.test(sentence))?.[1] ?? countryOfTeam(speaker) ?? ctx.country;
      const scope = client
        ? { country: client.country, pc: client.pc, client: client.id }
        : country === ctx.country
          ? { country, pc: ctx.pc }
          : { country };

      const claim: Claim = {
        id: `live-${channel}-${hash(`${speaker?.id}|${sentence}`)}`,
        factKey: fact.key,
        value,
        scope,
        source: { type: channel, title: channel === "meeting" ? "Meeting (live)" : channel === "teams" ? "Teams message (live)" : "Email draft (live)" },
        author: speaker!.id,
        date,
        text: sentence,
        hedged: HEDGE.test(sentence) || undefined,
      };
      extracted.push({ claim, quote: sentence, speaker });
    }
  }
  return { extracted, skipped };
}

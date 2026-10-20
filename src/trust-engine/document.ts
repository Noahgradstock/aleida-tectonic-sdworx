import { extractClaims } from "./extract";
import type { Claim, Client, Context, KnowledgeBase, Person } from "./types";

// A whole document comes in (a client agreement from an email, or uploaded): read it, check it quickly,
// and turn its sentences into claims of the type "agreement". Nothing here decides trust: the checks are
// shown to an expert, and only their approval lets the document count (see score.ts).

export type DocCheck = { id: "parties" | "signed" | "final" | "statements"; ok: boolean; label: string };
export type ReadDocument = { client: Client | null; signed: boolean; signedOn: string | null; draft: boolean; claims: Claim[]; checks: DocCheck[] };

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const SIGNED = /\b(?:signed|undertekend|signé)\b[^.\n]{0,60}?\b(?:on|op|le)\s+(\d{1,2}\s+[a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})/i;
const DRAFT = /\b(draft|concept|ontwerp|brouillon)\b/i;

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// "3 October 2026" or "2026-10-03" -> "2026-10-03"
function isoDate(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  const month = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

// The client a document is about: the one named most often in it.
function clientOf(text: string, clients: Client[]): Client | null {
  const t = text.toLowerCase();
  const hits = clients
    .map((c) => ({ c, n: t.split(c.name.toLowerCase().replace(/\s(nv|bv)$/i, "")).length - 1 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return hits[0]?.c ?? null;
}

export function readDocument(input: { title: string; text: string }, uploader: Person, kb: KnowledgeBase, now: Date): ReadDocument {
  const text = input.text.slice(0, 20_000);
  const client = clientOf(text, kb.clients);
  const signedMatch = text.match(SIGNED);
  const signedOn = signedMatch ? isoDate(signedMatch[1]) : null;
  const signed = !!signedOn;
  const draft = DRAFT.test(text) || DRAFT.test(input.title);
  const ctx: Context = client ? { country: client.country, pc: client.pc, client: client.id } : { country: "BE" };

  // The same sentence reading as for an email; then every statement belongs to the document and its client.
  const { extracted } = extractClaims(text, "email", ctx, kb, uploader, now);
  const claims: Claim[] = extracted.map(({ claim }) => ({
    ...claim,
    id: `live-doc-${hash(`${input.title}|${claim.text}`)}`,
    source: { type: "agreement", title: input.title },
    scope: client ? { country: client.country, pc: client.pc, client: client.id } : claim.scope,
    date: signedOn ?? claim.date,
    signed,
    hedged: undefined,
  }));

  const checks: DocCheck[] = [
    { id: "parties", ok: !!client, label: client ? `About ${client.name}` : "No client named: cannot tell who it applies to" },
    { id: "signed", ok: signed, label: signed ? `Signed on ${signedOn}` : "No signature and date found" },
    { id: "final", ok: !draft, label: draft ? "Looks like a draft" : "Final version, not a draft" },
    { id: "statements", ok: claims.length > 0, label: claims.length ? `${claims.length} statement${claims.length === 1 ? "" : "s"} found` : "No statements with a value found" },
  ];
  return { client, signed, signedOn, draft, claims, checks };
}

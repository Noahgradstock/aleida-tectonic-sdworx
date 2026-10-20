import "server-only";
import { readdirSync } from "node:fs";
import path from "node:path";
import { evaluateFact, forecast, type Client, type Context, type Feedback, type Forecast, type KnowledgeBase, type Person } from "@/trust-engine";
import { allFeedback, now } from "@/lib/trust-server";
import { liveKb } from "@/lib/live";
import { canReadClaim, clientsOf, countriesOf } from "@/lib/access";
import { docFolders, loadDocuments } from "@/lib/documents";
import type { BrainData } from "@/app/brain/brain-map";

// Everything the Brain views show, built once on the server from the live knowledge base.


export type Exception = { client: string; value: string; score: number };
export type TopicStatus = { status: BrainData["topics"][number]["status"]; answer: string | null; score: number | null; forecast: Forecast | null; exceptions: Exception[] };

// The file list only ever walks this one fixed folder, in a single call with no path argument from anywhere else.
// Hidden files and folders and symlinks are skipped.
function listDataFiles(): string[] {
  const root = path.join(process.cwd(), "data", "salary");
  try {
    return readdirSync(root, { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile() && !e.isSymbolicLink())
      .map((e) => path.relative(root, path.join(e.parentPath, e.name)))
      .filter((rel) => !rel.startsWith("..") && !rel.split(path.sep).some((part) => part.startsWith(".")));
  } catch {
    return [];
  }
}

// The topics are scored at the general level a consultant works at: their country, sector PC 200.
// Clients with their own agreement show up as exceptions on the topic, not as the default.
export function referenceContext(user: Person, k: KnowledgeBase): { ctx: Context; label: string } {
  void k;
  const country = countriesOf(user)[0] ?? "BE";
  return { ctx: { country, pc: "200" }, label: `${country === "BE" ? "Belgium" : country === "NL" ? "the Netherlands" : country}, PC 200` };
}

// clients: the ones this user works on; a client whose own trusted agreement gives another answer is an exception.
export function topicStatuses(k: KnowledgeBase, ctx: Context, feedback: Feedback[], clients: Client[] = []): Record<string, TopicStatus> {
  return Object.fromEntries(
    k.facts.map((fact) => {
      const r = evaluateFact(fact, k, ctx, feedback, now());
      const exceptions = clients.flatMap((c) => {
        const own = evaluateFact(fact, k, { country: c.country, pc: c.pc, client: c.id }, feedback, now());
        const best = own.best;
        return best && best.relevance === "client" && own.status === "trusted" && best.claim.value !== r.best?.claim.value ? [{ client: c.name, value: best.claim.value, score: best.score }] : [];
      });
      return [
        fact.key,
        {
          status: r.best ? r.status : ("empty" as const),
          answer: r.best?.claim.value ?? null,
          score: r.best?.score ?? null,
          forecast: r.best ? forecast(fact, k, ctx, feedback, now()) : null,
          exceptions,
        },
      ];
    }),
  );
}

export async function buildBrainData(user: Person): Promise<BrainData> {
  const kb = await liveKb();
  const { ctx, label } = referenceContext(user, kb);
  const mine = clientsOf(user, kb);
  const feedback = await allFeedback();
  const visible = kb.claims.filter((c) => canReadClaim(user, c, kb));
  const shown = new Set(visible.map((c) => c.file));
  const hiddenFiles = new Set(kb.claims.filter((c) => c.file && !shown.has(c.file)).map((c) => c.file));

  const topics = kb.facts.map((fact) => {
    const r = evaluateFact(fact, kb, ctx, feedback, now());
    const all = visible.filter((c) => c.factKey === fact.key);
    return {
      key: fact.key,
      label: fact.label,
      status: r.best ? r.status : ("empty" as const),
      answer: r.best?.claim.value ?? null,
      score: r.best?.score ?? null,
      files: [...new Set(all.map((c) => c.file).filter((f): f is string => !!f))],
      claims: all.map((c) => {
        const scored = r.claims.find((s) => s.claim.id === c.id);
        return {
          id: c.id,
          value: c.value,
          source: c.source.type,
          title: c.source.title,
          author: c.author,
          date: c.date,
          country: c.scope.country,
          score: scored?.score ?? null,
          excluded: r.excluded.find((x) => x.claim.id === c.id)?.reason ?? null,
        };
      }),
    };
  });

  return {
    company: "SD Worx",
    reference: label,
    topics,
    people: kb.people.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      team: p.team,
      left: !!p.left,
      claims: visible.filter((c) => c.author === p.id).length,
    })),
    clients: mine.map((c) => ({ ...c, claims: visible.filter((x) => x.scope.client === c.id).length })),
    channels: (["official", "sharepoint", "teams", "email", "meeting"] as const).map((type) => ({
      type,
      claims: visible.filter((c) => c.source.type === type).length,
    })),
    files: listDataFiles().filter((f) => !hiddenFiles.has(f)),
    documents: loadDocuments(kb).filter((d) => !hiddenFiles.has(d.path)),
    folders: docFolders(),
    scores: Object.fromEntries(topics.flatMap((t) => t.claims.map((c) => [c.id, { score: c.score, excluded: c.excluded }]))),
  };
}

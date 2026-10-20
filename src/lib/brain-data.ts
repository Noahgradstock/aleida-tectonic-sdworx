import "server-only";
import { readdirSync } from "node:fs";
import path from "node:path";
import { evaluateFact, forecast, type Context, type Feedback, type Forecast, type KnowledgeBase, type Person } from "@/trust-engine";
import { allFeedback, now } from "@/lib/trust-server";
import { liveKb } from "@/lib/live";
import { canReadClaim, clientsOf, countriesOf } from "@/lib/access";
import { docFolders, loadDocuments } from "@/lib/documents";
import type { BrainData } from "@/app/brain/brain-map";

// Everything the Brain views show, built once on the server from the live knowledge base.

// Topics are scored for this client, so the brain shows what a BE PC 200 consultant would get.
const REFERENCE_CLIENT = "brouwerij-de-kroon";

export type TopicStatus = { status: BrainData["topics"][number]["status"]; answer: string | null; score: number | null; forecast: Forecast | null };

function listFiles(dir: string, base = dir): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? listFiles(path.join(dir, e.name), base) : e.name.startsWith(".") ? [] : [path.relative(base, path.join(dir, e.name))],
    );
  } catch {
    return [];
  }
}

// The case the topics are scored for: the reference client if this user works on it, else their first client or country.
export function referenceContext(user: Person, k: KnowledgeBase): { ctx: Context; label: string } {
  const mine = clientsOf(user, k);
  const client = mine.find((c) => c.id === REFERENCE_CLIENT) ?? mine[0] ?? null;
  const ctx = client ? { country: client.country, pc: client.pc, client: client.id } : { country: countriesOf(user)[0] ?? "BE" };
  const label = client ? `${client.name} (${[client.country, client.pc && `PC ${client.pc}`].filter(Boolean).join(", ")})` : ctx.country;
  return { ctx, label };
}

export function topicStatuses(k: KnowledgeBase, ctx: Context, feedback: Feedback[]): Record<string, TopicStatus> {
  return Object.fromEntries(
    k.facts.map((fact) => {
      const r = evaluateFact(fact, k, ctx, feedback, now());
      return [
        fact.key,
        { status: r.best ? r.status : ("empty" as const), answer: r.best?.claim.value ?? null, score: r.best?.score ?? null, forecast: r.best ? forecast(fact, k, ctx, feedback, now()) : null },
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
    files: listFiles(path.join(process.cwd(), "data", "salary")).filter((f) => !hiddenFiles.has(f)),
    documents: loadDocuments(kb).filter((d) => !hiddenFiles.has(d.path)),
    folders: docFolders(),
    scores: Object.fromEntries(topics.flatMap((t) => t.claims.map((c) => [c.id, { score: c.score, excluded: c.excluded }]))),
  };
}

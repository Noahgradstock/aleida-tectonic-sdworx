import { currentUser, forbidden, kb, readJson, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { canVote } from "@/lib/access";
import { act, buildMine, type MineAction } from "@/lib/mine";
import { docsToApprove } from "@/lib/intake";

const ACTIONS: MineAction[] = ["confirm", "remove", "restore", "correct", "undo"];
const name = (id: string | null) => (id ? (kb.people.find((p) => p.id === id)?.name ?? id) : null);

// GET -> your inbox (what waits for your yes) and your log (what you said, added and confirmed). Only ever your own.
export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  if (!canVote(user)) return Response.json({ waiting: [], questions: [], documents: [], log: [] });
  try {
    const m = await buildMine(user);
    const named = <T extends { speaker: string | null; reportedBy: string | null }>(i: T) => ({ ...i, speakerName: name(i.speaker), reportedByName: name(i.reportedBy) });
    const docs = (await docsToApprove(user)).map((d) => ({ ...d, uploadedByName: name(d.uploadedBy), clientName: kb.clients.find((c) => c.id === d.client)?.name ?? d.client }));
    return Response.json({
      documents: docs,
      waiting: m.waiting.map(named),
      questions: m.questions.map((q) => ({
        ...q,
        fromName: name(q.from),
        caseName: q.context.client ? (kb.clients.find((c) => c.id === q.context.client)?.name ?? q.context.client) : [q.context.country, q.context.pc && `PC ${q.context.pc}`].filter(Boolean).join(", "),
      })),
      log: m.log.map(named),
    });
  } catch (err) {
    console.error("mine failed:", err);
    return Response.json({ error: "Could not load your log right now" }, { status: 500 });
  }
}

// POST { action: confirm|remove|restore|correct|undo, id, value? } -> changes one of your own entries, and logs it.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const user = await currentUser(request);
  if (!user) return unauthorized();
  if (!canVote(user)) return Response.json({ error: "Sign in with your own account" }, { status: 403 });
  if (!(await rateLimit(`mine:${user.id}`, 30, 60_000))) return tooManyRequests();
  const body = (await readJson(request)) as { action?: unknown; id?: unknown; value?: unknown } | null;
  const action = ACTIONS.find((a) => a === body?.action);
  const id = typeof body?.id === "string" && /^[\w:.-]{1,160}$/.test(body.id) ? body.id : null;
  const value = typeof body?.value === "string" ? body.value : undefined;
  if (!action || !id) return Response.json({ error: "action and id are required" }, { status: 400 });
  try {
    const r = await act(user, action, id, value);
    return r.ok ? Response.json({ ok: true, explain: r.explain }) : Response.json({ error: r.error }, { status: r.status });
  } catch (err) {
    console.error("mine action failed:", err);
    return Response.json({ error: "Could not save that right now" }, { status: 500 });
  }
}

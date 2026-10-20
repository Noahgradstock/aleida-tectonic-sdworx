import { parseContext } from "@/trust-engine";
import { currentUser, forbidden, kb, readJson, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { canVote } from "@/lib/access";
import { allQuestions, askToConfirm, forwardStale, type Question } from "@/lib/questions";

const name = (id: string) => kb.people.find((p) => p.id === id)?.name ?? id;
// What the browser gets: names instead of ids, nothing about other people's questions.
const caseName = (q: Question) =>
  q.context.client ? (kb.clients.find((c) => c.id === q.context.client)?.name ?? q.context.client) : [q.context.country, q.context.pc && `PC ${q.context.pc}`].filter(Boolean).join(", ");
const view = (q: Question) => ({ ...q, caseName: caseName(q), fromName: name(q.from), toName: name(q.to), forwardedToName: q.forwardedTo ? name(q.forwardedTo) : null });

// GET -> { forMe: open questions for the signed-in user, mine: the latest state of each question they asked }
export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  try {
    await forwardStale();
    const qs = await allQuestions();
    const forMe = qs.filter((q) => q.to === user.id && q.status === "open").sort((a, b) => b.askedAt.localeCompare(a.askedAt));
    const latest = new Map<string, Question>();
    for (const q of qs.filter((x) => x.from === user.id)) {
      const prev = latest.get(q.claimId);
      if (!prev || q.askedAt > prev.askedAt) latest.set(q.claimId, q);
    }
    return Response.json({ forMe: forMe.map(view), mine: [...latest.values()].map(view) });
  } catch (err) {
    console.error("questions failed:", err);
    return Response.json({ error: "Could not load questions right now" }, { status: 500 });
  }
}

// POST { claimId, context } -> asks the best available person to confirm this claim. The server picks who.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const user = await currentUser(request);
  if (!user) return unauthorized();
  if (!canVote(user)) return Response.json({ error: "Sign in with your own account to ask a colleague" }, { status: 403 });
  if (!(await rateLimit(`ask-confirm:${user.id}`, 10, 60_000))) return tooManyRequests();
  const body = (await readJson(request)) as { claimId?: unknown; context?: unknown } | null;
  const claimId = typeof body?.claimId === "string" && /^[\w:.-]{1,120}$/.test(body.claimId) ? body.claimId : null;
  const ctx = parseContext(body?.context, kb);
  if (!claimId || !ctx) return Response.json({ error: "claimId and a valid context are required" }, { status: 400 });
  try {
    const r = await askToConfirm(user, claimId, ctx);
    return r.ok ? Response.json({ question: view(r.question) }) : Response.json({ error: r.error }, { status: r.status });
  } catch (err) {
    console.error("ask to confirm failed:", err);
    return Response.json({ error: "Could not send the question right now" }, { status: 500 });
  }
}

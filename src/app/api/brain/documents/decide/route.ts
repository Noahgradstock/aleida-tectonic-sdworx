import { currentUser, forbidden, readJson, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { decide } from "@/lib/intake";

// POST { id, decision: approve|reject } -> only an expert who works on that client, and did not upload it.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const user = await currentUser(request);
  if (!user) return unauthorized();
  if (!(await rateLimit(`doc-decide:${user.id}`, 20, 60_000))) return tooManyRequests();
  const body = (await readJson(request)) as { id?: unknown; decision?: unknown } | null;
  const id = typeof body?.id === "string" && body.id.length <= 80 ? body.id : null;
  const decision = body?.decision === "approve" || body?.decision === "reject" ? body.decision : null;
  if (!id || !decision) return Response.json({ error: "id and decision (approve or reject) are required" }, { status: 400 });
  try {
    const r = await decide(user, id, decision);
    return r.ok ? Response.json({ ok: true }) : Response.json({ error: r.error }, { status: r.status });
  } catch (err) {
    console.error("decide failed:", err);
    return Response.json({ error: "Could not save that right now" }, { status: 500 });
  }
}

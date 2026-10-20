import { currentSession, forbidden, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { resetDemoMorning } from "@/lib/demo-seed";

// POST -> back to a fresh demo morning. Only from a demo session, a few times a minute for everyone together.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const s = await currentSession(request);
  if (!s) return unauthorized();
  if (!s.session.demo) return Response.json({ error: "Only available in the demo" }, { status: 403 });
  if (!(await rateLimit("demo-reset", 6, 60_000))) return tooManyRequests();
  try {
    await resetDemoMorning();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("demo reset failed:", err);
    return Response.json({ error: "Could not reset the demo right now" }, { status: 500 });
  }
}

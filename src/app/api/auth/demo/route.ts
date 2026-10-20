import { cookies } from "next/headers";
import { clientIp, cookieOptions, createSession, demoPersonas, rateLimit, sameOrigin, SESSION_COOKIE } from "@/lib/auth";
import { forbidden, kb, readJson, tooManyRequests } from "@/lib/trust-server";

// POST { persona } -> try the app as one of the demo colleagues (e.g. Sofie, consultant, or Jan, expert), no password.
// Only the personas in DEMO_PERSONAS, only while guest access is on.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const ip = clientIp(request);
  if (!(await rateLimit(ip ? `demo:${ip}` : "demo-all", ip ? 20 : 300, 60_000))) return tooManyRequests();
  const body = (await readJson(request)) as { persona?: unknown } | null;
  const persona = typeof body?.persona === "string" ? body.persona : "";
  const person = demoPersonas().includes(persona) ? kb.people.find((p) => p.id === persona && !p.left) : undefined;
  if (!person) return Response.json({ error: "That demo person is not available" }, { status: 403 });
  try {
    (await cookies()).set(SESSION_COOKIE, createSession(person.id, Date.now(), { demo: true }), cookieOptions);
  } catch {
    return Response.json({ error: "Login is not configured on this server" }, { status: 503 });
  }
  return Response.json({ user: { id: person.id, name: person.name, role: person.role } });
}

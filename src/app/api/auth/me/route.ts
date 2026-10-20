import { currentSession, kb, unauthorized } from "@/lib/trust-server";
import { demoPersonas } from "@/lib/auth";

// GET -> the signed-in user, and in a demo session the people a visitor can switch to
export async function GET(request: Request) {
  const s = await currentSession(request);
  if (!s) return unauthorized();
  const { user, session } = s;
  const personas = session.demo
    ? demoPersonas()
        .map((id) => kb.people.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({ id: p.id, name: p.name, role: p.role, team: p.team }))
    : [];
  return Response.json({ user: { id: user.id, name: user.name, role: user.role, team: user.team }, demo: !!session.demo, personas });
}

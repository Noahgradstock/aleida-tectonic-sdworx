import { cookies } from "next/headers";
import { z } from "zod";
import {
  authConfigured,
  clientIp,
  cookieOptions,
  createSession,
  reserveLoginAttempt,
  sameOrigin,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth";
import { forbidden, kb, readJson } from "@/lib/trust-server";

// Only these two fields; anything else (role, userId, isAdmin) is refused, not ignored.
const schema = z
  .object({ username: z.string().trim().toLowerCase().min(1).max(64), password: z.string().min(1).max(200) })
  .strict();

// POST { username, password } -> sets the signed session cookie
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  if (!authConfigured()) return Response.json({ error: "Login is not configured on this server" }, { status: 503 });

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "Username and password are required" }, { status: 400 });
  const { username, password } = parsed.data;

  // Reserved BEFORE the password check, so parallel guesses cannot all get through.
  const refund = await reserveLoginAttempt(username, clientIp(request));
  if (!refund) return Response.json({ error: "Too many attempts, try again in 15 minutes" }, { status: 429 });

  const person = kb.people.find((p) => p.id === username && !p.left);
  if (!verifyPassword(username, password) || !person) {
    return Response.json({ error: "Wrong username or password" }, { status: 401 }); // same message for unknown users
  }

  await refund(); // a correct password does not count against the limits
  (await cookies()).set(SESSION_COOKIE, createSession(person.id), cookieOptions);
  return Response.json({ user: { id: person.id, name: person.name, role: person.role } }, { headers: { "Cache-Control": "no-store" } });
}

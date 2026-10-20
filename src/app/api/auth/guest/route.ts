import { cookies } from "next/headers";
import { clientIp, cookieOptions, createSession, GUEST_ID, guestEnabled, rateLimit, sameOrigin, SESSION_COOKIE } from "@/lib/auth";
import { forbidden, tooManyRequests } from "@/lib/trust-server";

// POST -> signs in as the shared demo guest. Guests can ask questions but not vote (see canVote in lib/access.ts).
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  if (!guestEnabled()) return Response.json({ error: "Guest access is switched off" }, { status: 403 });
  // Per IP where the platform guarantees it (Vercel); elsewhere one global cap, high enough for a room of judges.
  const ip = clientIp(request);
  if (!(await rateLimit(ip ? `guest:${ip}` : "guest-all", ip ? 10 : 300, 60_000))) return tooManyRequests();
  try {
    (await cookies()).set(SESSION_COOKIE, createSession(GUEST_ID), cookieOptions);
  } catch {
    return Response.json({ error: "Login is not configured on this server" }, { status: 503 });
  }
  return Response.json({ user: { id: GUEST_ID, name: "Guest", role: "regular" } });
}

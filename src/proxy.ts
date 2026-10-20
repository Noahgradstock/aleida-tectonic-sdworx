import { NextResponse, type NextRequest } from "next/server";
import { activeSession, clientIp, cookieOptions, createSession, demoPersonas, GUEST_ID, guestEnabled, rateLimit, SESSION_COOKIE } from "@/lib/auth";

// Everything except the login page and the login/guest endpoints needs a valid, not logged-out session.
// Visitors without one are signed in as the first demo persona (a real, fictional colleague: same rules as anyone),
// or as the read-only guest if no persona is offered, so the demo opens without a login screen.
// Route handlers check the session again (defense in depth), this is the first gate.
const PUBLIC = new Set(["/login", "/api/auth/login", "/api/auth/guest", "/api/auth/demo"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Same limit as readJson in lib/trust-server.ts; refused before anything is read. Chunked bodies are capped there.
  if (pathname.startsWith("/api/") && Number(request.headers.get("content-length") ?? 0) > 10_000) {
    return NextResponse.json({ error: "request too large" }, { status: 413 });
  }
  if (PUBLIC.has(pathname)) return NextResponse.next();
  if (await activeSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  // Same kind of limit as "Continue as guest" (/api/auth/guest): per IP on Vercel, otherwise one global cap.
  // Over the limit (or with the store down) the visitor gets the login page instead of a new guest session.
  const ip = clientIp(request);
  if (guestEnabled() && (await rateLimit(ip ? `guest-auto:${ip}` : "guest-auto-all", ip ? 30 : 600, 60_000))) {
    try {
      const persona = demoPersonas()[0];
      const token = persona ? createSession(persona, Date.now(), { demo: true }) : createSession(GUEST_ID);
      // Set it on this request too, so the page renders signed in straight away.
      request.cookies.set(SESSION_COOKIE, token);
      const res = NextResponse.next({ request: { headers: request.headers } });
      res.cookies.set(SESSION_COOKIE, token, cookieOptions);
      return res;
    } catch {
      // No session secret configured: fall through to the login page.
    }
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

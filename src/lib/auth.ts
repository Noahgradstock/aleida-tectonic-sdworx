import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { store } from "@/lib/store";

// Session and password helpers. No framework imports, so the proxy, route handlers and tests share them.
// Sessions are signed cookies: base64url(payload).HMAC-SHA256(payload, SESSION_SECRET).
// Passwords live only as scrypt hashes in AUTH_USERS ("id:salt:hash,id:salt:hash"), never in the repo.

// __Host- prefix in production: the browser only accepts it over HTTPS, with Secure, Path=/ and no Domain.
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-session" : "session";
// 8 hours by default; SESSION_HOURS can stretch it for a demo machine (bounded to 30 days).
export const SESSION_TTL_S = Math.min(Math.max(Number(process.env.SESSION_HOURS) || 8, 1), 720) * 60 * 60;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_S,
};

export type Session = { sub: string; sid: string; exp: number; demo?: boolean };

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export const authConfigured = () => secret() !== null && users().size > 0;

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// The shared demo guest ("Continue as guest"): no password, read-only. Switch off with GUEST_ACCESS=off.
export const GUEST_ID = "guest";
export const guestEnabled = () => process.env.GUEST_ACCESS !== "off";
// Demo personas: real people from the (fictional) data that a visitor can try the app as, without a password,
// e.g. a jury. Same roles and rules as a signed-in user. Off together with guest access.
export const demoPersonas = () => (guestEnabled() ? (process.env.DEMO_PERSONAS ?? "sofie,jan").split(",").map((x) => x.trim()).filter(Boolean) : []);

// Password version: changes when the user's password (salt) changes, which ends all their sessions.
// Guest sessions all end when guest access is switched off.
const passwordVersion = (userId: string) =>
  userId === GUEST_ID ? (guestEnabled() ? "guest" : null) : (users().get(userId)?.salt.slice(0, 8) ?? null);

export function createSession(userId: string, now = Date.now(), opts: { demo?: boolean } = {}): string {
  const key = secret();
  const pv = opts.demo ? (demoPersonas().includes(userId) ? "demo" : null) : passwordVersion(userId);
  if (!key) throw new Error("SESSION_SECRET (32+ characters) is not set");
  if (!pv) throw new Error("Unknown user");
  const body = { sub: userId, sid: randomBytes(16).toString("base64url"), pv, exp: Math.floor(now / 1000) + SESSION_TTL_S, ...(opts.demo ? { demo: true } : {}) };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

// Signature, expiry and password version. Synchronous, so the proxy can use it; see isRevoked() for logout.
export function readSession(token: string | undefined | null, now = Date.now()): Session | null {
  const key = secret();
  if (!key || !token) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined || !safeEqual(sig, sign(payload, key))) return null;
  try {
    const { sub, sid, pv, exp, demo } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof sub !== "string" || typeof sid !== "string" || typeof exp !== "number" || exp * 1000 <= now) return null;
    // A demo session stays valid only while that persona is offered; a normal one only while the password is unchanged.
    const expected = demo === true ? (demoPersonas().includes(sub) ? "demo" : null) : passwordVersion(sub);
    if (!expected || pv !== expected) return null;
    return { sub, sid, exp, ...(demo === true ? { demo: true } : {}) };
  } catch {
    return null;
  }
}

// Returns the user id of a valid, unexpired session, or null (without the revocation check).
export const verifySession = (token: string | undefined | null, now = Date.now()) => readSession(token, now)?.sub ?? null;

// Logout: the session id is revoked until the moment the token would have expired anyway.
export async function revokeSession(session: Session, now = Date.now()) {
  await store.flag(`revoked:${session.sid}`, session.exp * 1000 - now);
}

export async function isRevoked(session: Session): Promise<boolean> {
  try {
    return await store.flagged(`revoked:${session.sid}`);
  } catch {
    console.error("revocation check failed, refusing the session");
    return true; // fail closed
  }
}

// Full check: signature, expiry, password version and not logged out.
export async function activeSession(token: string | undefined | null): Promise<Session | null> {
  const session = readSession(token);
  return session && !(await isRevoked(session)) ? session : null;
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function users(): Map<string, { salt: string; hash: string }> {
  const map = new Map<string, { salt: string; hash: string }>();
  for (const entry of (process.env.AUTH_USERS ?? "").split(",")) {
    const [id, salt, hash] = entry.trim().split(":");
    if (id && salt && hash) map.set(id, { salt, hash });
  }
  return map;
}

// Constant work whether or not the user exists, so response time does not reveal valid user ids.
const DUMMY = { salt: "0".repeat(32), hash: "0".repeat(64) };

export function verifyPassword(userId: string, password: string): boolean {
  const known = users().get(userId);
  const { salt, hash } = known ?? DUMMY;
  const actual = scryptSync(password, salt, 32).toString("hex");
  return safeEqual(actual, hash) && !!known;
}

// Allows `max` calls per window; returns false once the limit is reached.
// Counts first (atomic INCR), then decides. Fails closed: if the store is down, nothing gets through.
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    return (await store.count(`rl:${key}`, windowMs)) <= max;
  } catch {
    console.error("rate limit store failed, refusing the request");
    return false;
  }
}

// Login attempts are reserved BEFORE the password is checked, so parallel guesses cannot all slip through,
// and handed back after a correct password, so only failures keep counting (no lockout of the real user).
// Three limits per 15 minutes: account + IP 5 (strict), IP 50, and account from any IP 100. The last one stops
// guessing by rotating IPs; it is high, so it slows an attacker down rather than locking a colleague out.
// Returns a refund function, or null when a limit is reached (or the store is down: fail closed).
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function reserveLoginAttempt(userId: string, ip: string | null): Promise<(() => Promise<void>) | null> {
  const limits: [string, number][] = [[`login-acct:${userId}`, 100]];
  if (ip) limits.unshift([`login:${userId}|${ip}`, 5], [`login-ip:${ip}`, 50]);
  const reserved: string[] = [];
  const refund = async () => {
    for (const key of reserved) await store.uncount(key).catch(() => {});
  };
  for (const [key, max] of limits) {
    let n: number;
    try {
      n = await store.count(`rl:${key}`, LOGIN_WINDOW_MS);
    } catch {
      console.error("login limiter store failed, refusing the attempt");
      return null;
    }
    reserved.push(`rl:${key}`);
    if (n > max) return null;
  }
  return refund;
}

// Client IP, only from a header the platform guarantees: Vercel overwrites x-forwarded-for, so clients cannot fake it.
// Anywhere else the IP is unknown (null), and limits fall back to per-account or global buckets,
// never one shared "unknown" bucket that a few bad requests could lock for everyone.
export function clientIp(request: Request): string | null {
  if (!process.env.VERCEL) return null;
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;
}

export function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

// CSRF guard for state-changing requests: a browser request must come from our own origin.
// Same rule Next.js uses for server actions: Origin must match the Host header (not request.url, which says
// "localhost" under `next start` even when the browser opened 127.0.0.1).
// No Origin at all (curl, the desktop mascot) is allowed unless the browser marks the request as cross-site;
// those clients carry no ambient browser cookies, so there is nothing to forge.
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const host = request.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

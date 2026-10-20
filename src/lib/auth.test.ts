import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeSession,
  createSession,
  clientIp,
  hashPassword,
  rateLimit,
  readSession,
  reserveLoginAttempt,
  revokeSession,
  sameOrigin,
  SESSION_TTL_S,
  verifyPassword,
  verifySession,
} from "./auth";
import { UpstashStore } from "./store";
import { canReadClaim, canUseContext, clientsOf } from "./access";
import { mockKnowledgeBase as kb } from "@/trust-engine";

// auth.ts reads the environment on every call, so setting it here is enough.
process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters-long";
process.env.AUTH_USERS = `sofie:${hashPassword("correct horse")},tom:${hashPassword("battery staple")}`;

test("a signed session round-trips and expires", () => {
  const t = Date.parse("2026-09-30T12:00:00Z");
  const token = createSession("sofie", t);
  assert.equal(verifySession(token, t), "sofie");
  assert.equal(verifySession(token, t + SESSION_TTL_S * 1000), null);
});

test("a tampered or forged session is rejected", () => {
  const token = createSession("sofie");
  const [payload, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "anna", sid: "x", exp: 9_999_999_999 })).toString("base64url");
  assert.equal(verifySession(`${forged}.${sig}`), null);
  assert.equal(verifySession(`${payload}.${sig.slice(0, -2)}xx`), null);
  assert.equal(verifySession(`${payload}.${sig}.extra`), null);
  assert.equal(verifySession("anna"), null);
});

test("logout revokes the session, also for a copied cookie", async () => {
  const token = createSession("sofie");
  const copy = token;
  assert.ok(await activeSession(token));
  await revokeSession(readSession(token)!);
  assert.equal(await activeSession(copy), null);
  assert.ok(await activeSession(createSession("sofie")), "a new login still works");
});

test("changing a password ends that user's sessions", () => {
  const token = createSession("sofie");
  const before = process.env.AUTH_USERS;
  process.env.AUTH_USERS = `sofie:${hashPassword("new password")}`;
  assert.equal(verifySession(token), null);
  process.env.AUTH_USERS = before;
});

test("passwords are checked against scrypt hashes", () => {
  assert.equal(verifyPassword("sofie", "correct horse"), true);
  assert.equal(verifyPassword("sofie", "wrong"), false);
  assert.equal(verifyPassword("anna", "correct horse"), false);
});

test("repeated failed logins block that account from that IP only", async () => {
  for (let i = 0; i < 5; i++) assert.ok(await reserveLoginAttempt("tom", "1.1.1.1"));
  assert.equal(await reserveLoginAttempt("tom", "1.1.1.1"), null);
  assert.ok(await reserveLoginAttempt("tom", "2.2.2.2"), "a stranger cannot lock Tom out everywhere");
  assert.ok(await reserveLoginAttempt("sofie", "1.1.1.1"));
});

test("20 parallel login attempts: at most 5 get through per account and IP", async () => {
  const results = await Promise.all(Array.from({ length: 20 }, () => reserveLoginAttempt("anna", "3.3.3.3")));
  assert.equal(results.filter(Boolean).length, 5);
});

test("a correct password is refunded, so the real user is not locked out", async () => {
  for (let i = 0; i < 10; i++) {
    const refund = await reserveLoginAttempt("pieter", "4.4.4.4");
    assert.ok(refund, `attempt ${i + 1} should still be allowed`);
    await refund!(); // correct password each time
  }
});

test("rotating IPs still hits the per-account limit", async () => {
  let allowed = 0;
  for (let i = 0; i < 110; i++) if (await reserveLoginAttempt("emma", `10.0.0.${i}`)) allowed++;
  assert.equal(allowed, 100);
});

test("x-forwarded-for is only trusted on Vercel", () => {
  const req = new Request("https://app.example/api/auth/login", { headers: { "x-forwarded-for": "6.6.6.6, 10.0.0.1" } });
  delete process.env.VERCEL;
  assert.equal(clientIp(req), null);
  process.env.VERCEL = "1";
  assert.equal(clientIp(req), "6.6.6.6");
  delete process.env.VERCEL;
});

test("rate limits stop after the maximum", async () => {
  for (let i = 0; i < 3; i++) assert.equal(await rateLimit("test:x", 3, 60_000), true);
  assert.equal(await rateLimit("test:x", 3, 60_000), false);
});

test("cross-site requests are refused; the Origin is compared with the Host header", () => {
  const req = (origin: string | null, extra: Record<string, string> = {}) =>
    new Request("http://localhost:3000/api/trust/feedback", {
      method: "POST",
      headers: { host: "127.0.0.1:3000", ...(origin ? { origin } : {}), ...extra },
    });
  assert.equal(sameOrigin(req("http://127.0.0.1:3000")), true, "the app's own buttons work on 127.0.0.1");
  assert.equal(sameOrigin(req("https://evil.example")), false);
  assert.equal(sameOrigin(req("null")), false);
  assert.equal(sameOrigin(req(null, { "sec-fetch-site": "cross-site" })), false);
  assert.equal(sameOrigin(req(null)), true, "non-browser clients without Origin (the mascot)");
});

test("the Upstash store sends the right Redis commands", async () => {
  const sent: unknown[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    assert.equal(url, "https://redis.example/pipeline");
    assert.equal((init.headers as Record<string, string>).authorization, "Bearer t0ken");
    const cmds = JSON.parse(String(init.body)) as unknown[][];
    sent.push(...cmds);
    return new Response(JSON.stringify(cmds.map((c) => ({ result: c[0] === "INCR" ? 4 : c[0] === "EXISTS" ? 1 : c[0] === "DECR" ? 3 : "OK" }))));
  }) as typeof fetch;
  const s = new UpstashStore("https://redis.example/", "t0ken", fakeFetch);
  assert.equal(await s.count("rl:a", 60_000), 4);
  assert.equal(await s.flagged("revoked:x"), true);
  await s.flag("revoked:y", 1000);
  await s.uncount("rl:a");
  assert.deepEqual(sent, [
    ["INCR", "rl:a"],
    ["PEXPIRE", "rl:a", 60_000, "NX"],
    ["EXISTS", "revoked:x"],
    ["SET", "revoked:y", "1", "PX", 1000],
    ["DECR", "rl:a"],
  ]);
});

test("an unreachable Upstash store throws, so the limiter and the revocation check fail closed", async () => {
  const failing = new UpstashStore("https://redis.example", "t0ken", (async () => new Response("down", { status: 500 })) as typeof fetch);
  await assert.rejects(failing.count("rl:x", 1000));
  await assert.rejects(failing.flagged("revoked:x"));
});

test("consultants only reach their own clients; experts all clients in their country", () => {
  const person = (id: string) => kb.people.find((p) => p.id === id)!;
  const tom = person("tom");
  const anna = person("anna");
  const emma = person("emma");
  assert.deepEqual(clientsOf(tom, kb).map((c) => c.id), ["brouwerij-de-kroon"]);
  assert.ok(clientsOf(anna, kb).length > 1 && clientsOf(anna, kb).every((c) => c.country === "BE"));
  assert.equal(canUseContext(tom, { country: "BE", pc: "118", client: "bakkerij-janssens" }, kb), false);
  assert.equal(canUseContext(tom, { country: "BE", pc: "200" }, kb), true);
  assert.equal(canUseContext(emma, { country: "BE" }, kb), false);
  const clientEmail = kb.claims.find((c) => c.scope.client === "bakkerij-janssens")!;
  assert.equal(canReadClaim(tom, clientEmail, kb), false);
  assert.equal(canReadClaim(anna, clientEmail, kb), true);
});

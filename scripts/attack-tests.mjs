// Negative security tests (AIKIDO-INSTRUCTIONS.md section 4) against a running server. Read-only for the code:
// it only sends HTTP requests. Run it against a local production build, never against the live demo.
//
//   npm run build
//   VERCEL=1 ALLOW_MEMORY_STORE=true SESSION_SECRET=... AUTH_USERS=... npm start -- -p 3100
//   BASE_URL=http://localhost:3100 ATTACK_VERCEL=1 ATTACK_USERS="tom:pw,sofie:pw,pieter:pw,anna:pw,emma:pw,koen:pw" \
//     node scripts/attack-tests.mjs
//
// ATTACK_USERS holds test passwords for demo accounts (create them with scripts/create-users.mjs); never commit them.
// ATTACK_VERCEL=1 runs the per-IP limiter checks; the server must then run with VERCEL=1 so x-forwarded-for is trusted.
// Each run locks some demo accounts for 15 minutes on that server: restart it before running again.

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const HOST = new URL(BASE).host;
const VERCEL = process.env.ATTACK_VERCEL === "1";
const PASSWORDS = Object.fromEntries(
  (process.env.ATTACK_USERS ?? "").split(",").filter(Boolean).map((e) => {
    const i = e.indexOf(":");
    return [e.slice(0, i), e.slice(i + 1)];
  }),
);

let passed = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) passed++;
  else failures.push(`${name}${detail ? ` (${detail})` : ""}`);
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}

const sameOrigin = { origin: BASE };
async function req(path, { method = "GET", body, cookie, headers = {}, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: {
      ...(body !== undefined || raw !== undefined ? { "content-type": "application/json" } : {}),
      ...(method !== "GET" ? sameOrigin : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, json, cookie: (res.headers.get("set-cookie") ?? "").split(";")[0] || null };
}

async function login(user, password = PASSWORDS[user], headers = {}) {
  return req("/api/auth/login", { method: "POST", body: { username: user, password }, headers });
}
async function session(user) {
  const r = await login(user);
  if (r.status !== 200 || !r.cookie) throw new Error(`could not sign in as ${user} (status ${r.status}); check ATTACK_USERS`);
  return r.cookie;
}

const PROTECTED_GET = ["/api/brain/questions", "/api/auth/me", "/api/trust/meta", "/api/trust/facts?country=BE", "/api/trust/source?id=off-idx-200", "/api/brain/graph", "/api/brain/ledger"];
const PROTECTED_POST = ["/api/trust/ask", "/api/trust/feedback", "/api/brain/ingest", "/api/brain/questions", "/api/brain/questions/answer"];
const MUTATIONS = ["/api/trust/ask", "/api/trust/feedback", "/api/brain/ingest", "/api/brain/questions", "/api/brain/questions/answer", "/api/auth/login", "/api/auth/guest", "/api/auth/logout"];
const OTHER_CLIENT_CLAIM = "em-idx-janssens"; // client email of bakkerij-janssens; tom only works on brouwerij-de-kroon
const leak = (r) => /at |\.ts:|\.js:|node_modules|Error:/.test(r.text);

async function main() {
  console.log(`Attacking ${BASE}${VERCEL ? " (with per-IP checks)" : ""}\n`);
  for (const u of ["tom", "sofie"]) if (!PASSWORDS[u]) throw new Error(`ATTACK_USERS needs at least tom and sofie`);

  // 1. No cookie: every protected route is closed.
  for (const p of PROTECTED_GET) check(`no cookie: GET ${p} -> 401`, (await req(p)).status === 401);
  for (const p of PROTECTED_POST) check(`no cookie: POST ${p} -> 401`, (await req(p, { method: "POST", body: {} })).status === 401);

  // 2. Forged and tampered sessions.
  const tom = await session("tom");
  const [name, value] = tom.split("=");
  const [payload, sig] = value.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ sub: "anna", sid: "x", pv: "x", exp: 9_999_999_999 })).toString("base64url");
  check("tampered signature -> 401", (await req("/api/auth/me", { cookie: `${name}=${payload}.${sig.slice(0, -2)}xx` })).status === 401);
  check("forged payload (sub=anna) -> 401", (await req("/api/auth/me", { cookie: `${name}=${forgedPayload}.${sig}` })).status === 401);
  check("unsigned cookie -> 401", (await req("/api/auth/me", { cookie: `${name}=anna` })).status === 401);
  const me = await req("/api/auth/me", { cookie: tom });
  check("valid session -> 200 as tom", me.status === 200 && me.json?.user?.id === "tom");

  // 3. Cookie flags.
  const setCookie = (await login("tom")).headers.get("set-cookie") ?? "";
  check("session cookie is HttpOnly", /httponly/i.test(setCookie));
  check("session cookie is SameSite=Strict", /samesite=strict/i.test(setCookie));

  // 4. CSRF: another Origin is refused on every mutation.
  for (const p of MUTATIONS) {
    const r = await req(p, { method: "POST", body: {}, cookie: tom, headers: { origin: "https://evil.example" } });
    check(`CSRF: POST ${p} from evil origin -> 403`, r.status === 403);
  }
  const crossSite = await req("/api/trust/feedback", { method: "POST", body: {}, cookie: tom, headers: { origin: "", "sec-fetch-site": "cross-site" } });
  check("CSRF: cross-site request without Origin -> 403", crossSite.status === 403);
  const ownHost = await req("/api/trust/ask", {
    method: "POST",
    cookie: tom,
    body: { question: "indexation", context: { country: "BE", pc: "200" } },
    headers: { origin: `http://${HOST}` },
  });
  check("CSRF: own origin still works", ownHost.status === 200);

  // 5. Login: validation, enumeration, users who left.
  check("login with extra field (role=admin) -> 400", (await req("/api/auth/login", { method: "POST", body: { username: "tom", password: "x", role: "admin" } })).status === 400);
  check("login with oversized password -> 400", (await req("/api/auth/login", { method: "POST", body: { username: "tom", password: "x".repeat(500) } })).status === 400);
  const wrong = await login("nora", "definitely-wrong", { "x-forwarded-for": "198.51.100.1" });
  const unknown = await login("nobody-here", "definitely-wrong", { "x-forwarded-for": "198.51.100.1" });
  check("wrong password and unknown user give the same answer", wrong.status === 401 && unknown.status === 401 && wrong.text === unknown.text);
  if (PASSWORDS.koen) check("user who left cannot sign in, even with the right password", (await login("koen")).status === 401);

  // 6. Guest is read-only.
  const guest = (await req("/api/auth/guest", { method: "POST" })).cookie;
  check("guest session is issued", !!guest);
  const guestVote = await req("/api/trust/feedback", {
    method: "POST",
    cookie: guest,
    body: { claimId: "sp-idx-draft", kind: "wrong", context: { country: "BE", pc: "200" } },
  });
  check("guest cannot vote -> 403", guestVote.status === 403);
  const guestIngest = await req("/api/brain/ingest", { method: "POST", cookie: guest, body: { channel: "teams", text: "Meal vouchers are €9 from now on.", context: { country: "BE" } } });
  check("guest cannot teach the brain -> 403", guestIngest.status === 403);

  // 7. IDOR: tom asks for another client's data.
  const otherSource = await req(`/api/trust/source?id=${OTHER_CLIENT_CLAIM}`, { cookie: tom });
  check("IDOR: tom opens another client's email -> 404", otherSource.status === 404 && !otherSource.text.includes("Janssens"));
  const otherAsk = await req("/api/trust/ask", { method: "POST", cookie: tom, body: { question: "indexation", context: { client: "bakkerij-janssens" } } });
  check("IDOR: tom asks about another client -> 404", otherAsk.status === 404);
  const otherFacts = await req("/api/trust/facts?client=bakkerij-janssens", { cookie: tom });
  check("IDOR: tom loads another client's facts -> 404", otherFacts.status === 404);
  const otherVote = await req("/api/trust/feedback", { method: "POST", cookie: tom, body: { claimId: OTHER_CLIENT_CLAIM, kind: "wrong", context: { client: "bakkerij-janssens" } } });
  check("IDOR: tom votes in another client's case -> 404", otherVote.status === 404);
  const otherConfirm = await req("/api/brain/questions", { method: "POST", cookie: tom, body: { claimId: OTHER_CLIENT_CLAIM, context: { client: "bakkerij-janssens" } } });
  check("IDOR: tom asks a colleague to confirm another client's claim -> 404", otherConfirm.status === 404);
  const notMine = await req("/api/brain/questions/answer", { method: "POST", cookie: tom, body: { id: "someone-elses-question", answer: "correct" } });
  check("IDOR: tom answers a question that was not sent to him -> 404", notMine.status === 404);
  const traversal = await req("/api/trust/source?id=../../.env", { cookie: tom });
  check("path traversal in source id -> 404", traversal.status === 404);
  const graph = await req("/api/brain/graph", { cookie: tom });
  check("who-knows graph hides another client's email from tom", graph.status === 200 && !graph.text.includes(OTHER_CLIENT_CLAIM));
  const ownAsk = await req("/api/trust/ask", { method: "POST", cookie: tom, body: { question: "indexation", context: { country: "BE", pc: "200" } } });
  check("ask never lists another client's sources for tom", ownAsk.status === 200 && !ownAsk.text.includes(OTHER_CLIENT_CLAIM));

  // 8. Mass assignment and forged identity: the voter is always the session user.
  const forged = await req("/api/trust/feedback", {
    method: "POST",
    cookie: tom,
    body: { claimId: "sp-idx-draft", kind: "outdated", context: { country: "BE", pc: "200" }, userId: "anna", role: "expert" },
  });
  const ledgerAfterForge = await req("/api/brain/ledger?fact=indexation-2026", { cookie: tom });
  const forgedEntry = ledgerAfterForge.json?.entries?.find((e) => e.claimId === "sp-idx-draft" && e.kind === "outdated");
  check("vote with extra fields (userId, role) -> 400", forged.status === 400, `status ${forged.status}`);
  check("forged userId/role in a vote has no effect (actor stays tom)", !forgedEntry || forgedEntry.actor === "tom", `actor=${forgedEntry?.actor}`);
  const extraAsk = await req("/api/trust/ask", { method: "POST", cookie: tom, body: { question: "indexation", context: { country: "BE", pc: "200" }, userId: "anna" } });
  check("ask with an extra field (userId) -> 400", extraAsk.status === 400);
  const extraIngest = await req("/api/brain/ingest", { method: "POST", cookie: tom, body: { channel: "teams", text: "x", context: { country: "BE" }, author: "anna" } });
  check("ingest with an extra field (author) -> 400", extraIngest.status === 400);
  const arrayBody = await req("/api/trust/feedback", { method: "POST", cookie: tom, raw: "[]" });
  check("vote with a JSON array body -> 400", arrayBody.status === 400);

  // 9. Input validation.
  const bad = [
    ["broken JSON", { raw: "{not json" }],
    ["number as question", { body: { question: 1e300, context: { country: "BE" } } }],
    ["prototype pollution context", { raw: '{"question":"indexation","context":{"__proto__":{"client":"bakkerij-janssens"}}}' }],
  ];
  for (const [label, opts] of bad) {
    const r = await req("/api/trust/ask", { method: "POST", cookie: tom, ...opts });
    check(`ask with ${label} -> 4xx, no stack trace`, r.status >= 400 && r.status < 500 && !leak(r), `status ${r.status}`);
  }
  const big = await req("/api/trust/ask", { method: "POST", cookie: tom, raw: JSON.stringify({ question: "x".repeat(20_000), context: { country: "BE" } }) });
  check("ask with a 20 KB body -> 413", big.status === 413, `status ${big.status}`);
  const badVote = await req("/api/trust/feedback", { method: "POST", cookie: tom, body: { claimId: "sp-idx-draft", kind: "delete-everything", context: { country: "BE" } } });
  check("vote with unknown kind -> 400", badVote.status === 400);
  const badFact = await req("/api/brain/ledger?fact=../../etc", { cookie: tom });
  check("ledger with a bad fact key -> 400", badFact.status === 400);

  // 10. XSS: user text comes back only as JSON data.
  const xss = await req("/api/trust/ask", { method: "POST", cookie: tom, body: { question: "<img src=x onerror=alert(1)> indexation", context: { country: "BE", pc: "200" } } });
  check("XSS payload is returned as JSON, not HTML", (xss.headers.get("content-type") ?? "").includes("application/json"));

  // 11. Concurrency: 20 identical votes at once change the score once.
  const sofie = await session("sofie");
  const vote = { claimId: "tm-idx-tom", kind: "wrong", context: { country: "BE", pc: "200" } };
  await Promise.all(Array.from({ length: 20 }, () => req("/api/trust/feedback", { method: "POST", cookie: sofie, body: vote })));
  const ledger = await req("/api/brain/ledger?fact=indexation-2026", { cookie: sofie });
  const entries = (ledger.json?.entries ?? []).filter((e) => e.claimId === "tm-idx-tom" && e.actor === "sofie" && e.kind === "rejected");
  check("20 parallel identical votes -> 1 score change", entries.length === 1, `${entries.length} ledger entries`);

  // 12. Logout revokes the session on the server, also for a copied cookie.
  const copy = await session("sofie");
  await req("/api/auth/logout", { method: "POST", cookie: copy });
  check("logout: a copied cookie stops working -> 401", (await req("/api/auth/me", { cookie: copy })).status === 401);

  // 13. Login rate limits.
  if (VERCEL && PASSWORDS.pieter) {
    let ok = true;
    for (let i = 0; i < 10; i++) {
      const r = await login("pieter", PASSWORDS.pieter, { "x-forwarded-for": "203.0.113.9" });
      if (r.status !== 200) ok = false;
    }
    check("10 correct logins in a row are never blocked (refund)", ok);
  }
  if (VERCEL && PASSWORDS.anna) {
    const results = await Promise.all(Array.from({ length: 20 }, () => login("anna", "wrong-guess", { "x-forwarded-for": "203.0.113.20" })));
    const evaluated = results.filter((r) => r.status === 401).length;
    check("20 parallel wrong logins from one IP: at most 5 evaluated", evaluated <= 5 && results.some((r) => r.status === 429), `${evaluated} evaluated`);
    const fromElsewhere = await login("anna", PASSWORDS.anna, { "x-forwarded-for": "203.0.113.21" });
    check("the real user still gets in from another IP", fromElsewhere.status === 200);
    const otherAccount = await login("sofie", PASSWORDS.sofie, { "x-forwarded-for": "203.0.113.20" });
    check("another account can still sign in from the attacking IP", otherAccount.status === 200);
  }
  if (VERCEL && PASSWORDS.emma) {
    let last = 0;
    for (let i = 0; i < 105; i++) last = (await login("emma", "wrong-guess", { "x-forwarded-for": `192.0.2.${i}` })).status;
    check("105 wrong logins with rotating x-forwarded-for -> 429 (per-account limit)", last === 429, `last status ${last}`);
  }
  if (!VERCEL) {
    const spoofed = await Promise.all(Array.from({ length: 8 }, () => login("nora", "wrong-guess", { "x-forwarded-for": "198.51.100.50" })));
    check("without VERCEL, a spoofed x-forwarded-for is ignored (no per-IP bucket)", spoofed.every((r) => r.status === 401));
  }

  // 14. Security headers.
  const page = await fetch(`${BASE}/login`, { redirect: "manual" });
  for (const h of ["content-security-policy", "x-frame-options", "x-content-type-options", "strict-transport-security", "referrer-policy"]) {
    check(`header ${h} is set`, page.headers.has(h));
  }
  check("no X-Powered-By header", !page.headers.has("x-powered-by"));
  const apiCache = (await req("/api/auth/me", { cookie: tom })).headers.get("cache-control") ?? "";
  check("API answers are not cacheable (no-store)", apiCache.includes("no-store"), apiCache);

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("\nFailed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Could not run the attack tests: ${err.message}`);
  process.exit(2);
});

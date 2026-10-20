// Talks to the Company brain trust engine (the deployed web app). Runs in the main process only.
// All trusted facts are loaded at start and refreshed every few minutes, so checks run locally and instantly.
const env = require("./env");

const BRAIN_URL = env.BRAIN_URL || "https://tavling-eight.vercel.app";
const CONTEXT = { country: "BE", pc: "200" }; // demo case: a Belgian PC 200 employer
const REFRESH_MS = 5 * 60 * 1000;

let cookie = null;
let facts = []; // default case: [{ key, label, keywords, status, value, score, source }]
let loadedAt = 0;
const clientFacts = new Map(); // client id -> { facts, loadedAt }: a client's agreements change the answer
let clients = []; // [{ id, name, match }]
let lastClient = null; // the client of the last email or question, for follow-ups

const ORIGIN = new URL(BRAIN_URL).origin; // the server's same-origin check
let me = null; // { id, name, role } of the signed-in account; null for the read-only guest

// A real account (BRAIN_USER / BRAIN_PASSWORD in .env) can teach the brain; the guest can only ask.
async function signIn() {
  const account = env.BRAIN_USER && env.BRAIN_PASSWORD;
  const res = account
    ? await fetch(`${BRAIN_URL}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: JSON.stringify({ username: env.BRAIN_USER, password: env.BRAIN_PASSWORD }),
      })
    : await fetch(`${BRAIN_URL}/api/auth/guest`, { method: "POST", headers: { origin: ORIGIN } });
  if (!res.ok) throw new Error(`Sign-in failed (${res.status})`);
  cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  me = account ? (await res.json()).user : null;
}

async function call(path, init = {}, retry = true) {
  if (!cookie) await signIn();
  const res = await fetch(`${BRAIN_URL}${path}`, { ...init, headers: { ...(init.headers || {}), origin: ORIGIN, cookie } });
  if (res.status === 401 && retry) {
    cookie = null;
    return call(path, init, false);
  }
  if (!res.ok) throw new Error(`Brain error (${res.status})`);
  return res.json();
}

const toFact = (f) => ({
  key: f.fact.key,
  label: f.fact.label,
  keywords: f.fact.keywords.map((k) => k.toLowerCase()),
  status: f.status,
  value: f.best ? f.best.claim.value : null,
  score: f.best ? Math.round(f.best.score * 100) : null,
  source: f.best ? f.best.claim.source.title : null,
  clientSpecific: Boolean(f.best && f.best.claim.scope && f.best.claim.scope.client),
});

async function loadFacts(client = null) {
  const q = new URLSearchParams(client ? { client } : CONTEXT).toString();
  const data = await call(`/api/trust/facts?${q}`);
  const list = data.facts.map(toFact);
  if (client) {
    clientFacts.set(client, { facts: list, loadedAt: Date.now() });
    return list.length;
  }
  facts = list;
  loadedAt = Date.now();
  return facts.length;
}

// Clients the brain knows, so "Brouwerij De Kroon" in an email switches to that client's answers.
async function loadClients() {
  if (clients.length) return;
  try {
    const meta = await call("/api/trust/meta");
    clients = (meta.clients || []).map((c) => ({
      id: c.id,
      name: c.name,
      match: c.name.toLowerCase().replace(/\s+(nv|bv|bvba|sa|srl)$/i, "").trim(),
    }));
  } catch {
    // No client list: everything uses the default case.
  }
}

function clientIn(text) {
  const t = text.toLowerCase();
  const c = clients.find((x) => t.includes(x.match) || t.includes(x.id.replace(/-/g, " ")));
  return c || null;
}

async function factsFor(client) {
  if (!client) {
    await ensureFacts();
    return facts;
  }
  const cached = clientFacts.get(client.id);
  if (!cached || Date.now() - cached.loadedAt > REFRESH_MS) {
    try {
      await loadFacts(client.id);
    } catch {
      return cached ? cached.facts : facts;
    }
  }
  return clientFacts.get(client.id).facts;
}

async function ensureFacts() {
  if (!facts.length || Date.now() - loadedAt > REFRESH_MS) {
    try {
      await loadFacts();
    } catch {
      // Keep the last known facts.
    }
  }
}

// The fact a sentence is about: the most keyword hits, then the longest keyword.
function findFact(text, list = facts) {
  const t = ` ${text.toLowerCase()} `;
  let best = null;
  for (const f of list) {
    const hits = f.keywords.filter((k) => t.includes(k));
    if (!hits.length) continue;
    const score = hits.length * 100 + Math.max(...hits.map((k) => k.length));
    if (!best || score > best.score) best = { fact: f, score };
  }
  return best ? best.fact : null;
}

// ---------- Values: "€1,650", "8.91 euros", "50%", "18 weeks", "650 hours", "3 times", "20th" ----------

// A number, then at most two words, then a unit: "650 hours", "22 holiday days", "18 weeks of notice" is cut at the unit.
const VALUE = /€\s?\d[\d.,]*|\d[\d.,]*\s?(?:%|percent\b|euros?\b|eur\b)|\b\d[\d.,]*\s?(?:[a-z]+\s){0,2}?(?:hours?|weeks?|months?|days?|times)\b|\b\d{1,2}(?:st|nd|rd|th)\b/gi;

function parse(v) {
  const s = v.toLowerCase();
  const unit = /€|euro|eur\b/.test(s) ? "eur" : /%|percent/.test(s) ? "pct" : (s.match(/hour|week|month|day|time/) || [/(st|nd|rd|th)\b/.test(s) ? "ord" : ""])[0];
  let digits = (s.match(/\d[\d.,]*/) || [""])[0].replace(/[.,]$/, "");
  digits = /,\d{3}(?!\d)/.test(digits) && !/\.\d+,/.test(digits) ? digits.replace(/,/g, "") : digits.replace(",", ".");
  return { unit, n: parseFloat(digits) };
}

const sameValue = (a, b) => a.unit === b.unit && Math.abs(a.n - b.n) < 1e-9;

// The evidence behind an answer, in plain words, for "how did you get this?".
function explainDetail(r) {
  const best = r.best;
  const name = (id) => (id && r.people[id] ? r.people[id].name : null);
  const same = r.claims.filter((c) => c !== best && c.claim.value === best.claim.value && c.claim.author);
  const other = r.claims.filter((c) => c.claim.value !== best.claim.value);
  const reasonFor = (c) => {
    const tags = c.evidence.map((e) => e.tag);
    const why = [];
    if (tags.includes("Old rule")) why.push("written before the current rule");
    if (tags.includes("Contradicts law")) why.push("contradicts the official source");
    if (tags.includes("Corrected")) why.push("corrected by an expert");
    if (tags.includes("No owner")) why.push("its author has left");
    return why.length ? why.join(", ") : "less trusted";
  };
  return {
    sourceType: best.claim.source.type,
    official: best.claim.source.type === "official",
    date: best.claim.date,
    effectiveFrom: best.claim.effectiveFrom || null,
    evidence: best.evidence.map((e) => e.label),
    supporters: [...new Set(same.map((c) => name(c.claim.author)).filter(Boolean))],
    setAside: other.slice(0, 3).map((c) => ({
      value: c.claim.value,
      source: c.claim.source.title,
      by: name(c.claim.author),
      score: Math.round(c.score * 100),
      why: reasonFor(c),
    })),
  };
}

// ---------- Public API ----------

const answerCache = new Map();

// Full answer with the expert, from the engine. Cached for the session.
async function ask(question) {
  await loadClients();
  const askClient = clientIn(question) || lastClient;
  if (clientIn(question)) lastClient = askClient;
  const key = `${askClient ? askClient.id : "-"}|${question.toLowerCase().replace(/[^a-z0-9€%.,\s]/g, "").replace(/\s+/g, " ").trim()}`;
  if (answerCache.has(key)) return answerCache.get(key);
  const r = await call("/api/trust/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: question.slice(0, 500), context: askClient ? { client: askClient.id } : CONTEXT }),
  });
  const best = r.matched ? r.best : null;
  const out = !r.matched
    ? { matched: false, message: r.message }
    : {
        matched: true,
        label: r.fact.label,
        status: r.status,
        value: best ? best.claim.value : null,
        score: best ? Math.round(best.score * 100) : null,
        source: best ? best.claim.source.title : null,
        expert: r.expert ? r.expert.name : null,
        expertTeam: r.expert ? r.expert.team : null,
        detail: best ? explainDetail(r) : null,
      };
  if (answerCache.size > 200) answerCache.clear();
  answerCache.set(key, out);
  return out;
}

// Every sentence that states a value that disagrees with a trusted fact. Local and deterministic.
async function checkAll(text) {
  await loadClients();
  const client = clientIn(text);
  if (client) lastClient = client;
  const list = await factsFor(client);
  const issues = [];
  const sentences = text.slice(0, 4000).split(/(?<=[.!?\n])\s+/);
  const unknown = [];
  for (const sentence of sentences) {
    const said = sentence.match(VALUE);
    if (!said || isPending(sentence)) continue;
    const fact = findFact(sentence, list);
    // A value about payroll that the brain cannot vouch for: offer to share it for review.
    if ((!fact && (client || PAYROLL_WORDS.test(sentence))) || (fact && (fact.status !== "trusted" || !fact.value))) {
      unknown.push({ kind: "unknown", said: said[0].trim().replace(/[.,]$/, ""), sentence: sentence.trim(), label: fact ? fact.label : "this", client: client ? client.name : null });
      continue;
    }
    if (!fact || !/\d/.test(fact.value)) continue;
    const trusted = parse(fact.value);
    const sameUnit = said.map((v) => ({ raw: v.trim().replace(/[.,]$/, ""), ...parse(v) })).filter((v) => v.unit === trusted.unit);
    if (!sameUnit.length || sameUnit.some((v) => sameValue(v, trusted))) continue;
    issues.push({ kind: "wrong", said: sameUnit[0].raw, sentence: sentence.trim(), ...fact, client: client ? client.name : null });
  }
  return [...issues, ...unknown]; // wrong values first
}

const PAYROLL_WORDS = /\b(allowance|salary|wage|bonus|premium|voucher|contribution|leave|holiday|vacation|overtime|notice|pension|insurance|reimburse\w*|expenses?|per diem|commut\w*)\b/i;

async function check(text) {
  const [first] = await checkAll(text);
  return first ? { ok: false, ...first } : { ok: true };
}

// The text with every wrong value replaced by the trusted one, only inside the sentence it was found in.
async function corrected(text) {
  const issues = (await checkAll(text)).filter((i) => i.kind === "wrong");
  let out = text;
  for (const i of issues) {
    // Swap only the number, keep the words: "22 holiday days" -> "20 holiday days", "€148.73" -> "€154.74".
    const num = (i.value.match(/\d[\d.,]*/) || [i.value])[0];
    const fixedSaid = /\d/.test(i.said) ? i.said.replace(/\d[\d.,]*/, num) : i.value;
    const fixedSentence = i.sentence.replace(i.said, fixedSaid);
    out = out.replace(i.sentence, fixedSentence);
  }
  return { text: out, issues };
}

// ---------- Learning: what you write and say teaches the brain (online only, called from main.js) ----------

// Teaches the brain from everyday work. channel: "meeting" | "teams" | "email".
// Returns only what the mascot shows: what was learned, and whether it waits for a confirmation.
async function learn(text, channel) {
  if (!cookie) await signIn().catch(() => {});
  if (!me) return { learned: [], skipped: 0 }; // guest: read-only
  if (!(text.match(VALUE) || []).length) return { learned: [], skipped: 0 }; // no value, nothing to learn; saves the rate limit
  // No speaker labels are added: the microphone cannot tell who is talking, so meeting text without
  // speaker metadata is skipped by the server ("Speaker unknown") instead of being put in your name.
  const r = await call("/api/brain/ingest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel, text: text.slice(0, 8000), context: CONTEXT }),
  });
  if (r.learned.length) {
    answerCache.clear(); // the next answer and check include what was just learned
    loadedAt = 0;
    clientFacts.clear();
  }
  return {
    learned: r.learned.map((e) => ({
      topic: e.factLabel,
      value: e.value,
      score: Math.round(e.claimScore.after * 100),
      waiting: e.caps.some((c) => /not confirmed/.test(c)), // meeting claim capped at 50% until the speaker or an expert confirms
      claimId: e.claimId,
    })),
    skipped: r.skipped.length,
  };
}

// Writing changes on every keystroke: learn only once the text has settled, so half-typed values never become claims.
const SETTLE_MS = 10_000;
const settling = new Map(); // channel -> timer
function learnWhenSettled(text, channel, onLearned) {
  clearTimeout(settling.get(channel));
  settling.set(
    channel,
    setTimeout(() => {
      settling.delete(channel);
      if (!/[.!?]\s*$/.test(text.trim())) return; // the last sentence is not finished yet
      learn(text, channel).then(onLearned, () => {}); // 403/429/offline: stay quiet
    }, SETTLE_MS),
  );
}

function stopLearning() {
  for (const t of settling.values()) clearTimeout(t);
  settling.clear();
}

// Signs in and loads all facts up front, so the first check and question are fast.
async function warmUp() {
  try {
    const n = await loadFacts();
    console.log(`brain: ${n} facts loaded, ${me ? `signed in as ${me.name} (can share for review)` : "guest (read-only, add BRAIN_USER and BRAIN_PASSWORD to .env to share)"}`);
  } catch (e) {
    console.log("brain: could not load facts:", e.message);
  }
}

// ---------- Sharing (only when you click "Share for review") ----------

const pendingShares = new Set(); // sentences you shared that wait for approval: no warning on them meanwhile
const normSentence = (t) => t.toLowerCase().replace(/\s+/g, " ").trim();
const isPending = (sentence) => pendingShares.has(normSentence(sentence));

// Sends ONE sentence (never the whole email) to the brain, marked for review, and asks a colleague to approve it.
async function share(sentence, clientName) {
  if (!cookie) await signIn().catch(() => {});
  if (!me) return { ok: false, reason: "Sign in with your own account to share knowledge." };
  await loadClients();
  const client = clientName ? clients.find((c) => c.name === clientName) : clientIn(sentence);
  const context = client ? { client: client.id } : CONTEXT;
  const r = await call("/api/brain/ingest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "email", review: true, text: sentence.slice(0, 1000), context }),
  });
  const entry = r.learned && r.learned[0];
  if (!entry) {
    const why = (r.skipped && r.skipped[0] && r.skipped[0].reason) || "Nothing to share in that sentence.";
    return { ok: false, reason: why };
  }
  pendingShares.add(normSentence(sentence));
  answerCache.clear();
  clientFacts.clear();
  loadedAt = 0;
  let toName = null;
  try {
    const q = await call("/api/brain/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ claimId: entry.claimId, context }),
    });
    toName = q.question ? q.question.toName : null;
  } catch {
    // The claim is shared and capped; asking a colleague can be retried from the web app.
  }
  return { ok: true, label: entry.factLabel, value: entry.value, toName };
}

// Link to the same question in the Company brain web app.
function webLink(question, clientName) {
  const client = clientName ? clients.find((c) => c.name === clientName) : clientIn(question || "");
  const q = new URLSearchParams({ q: (question || "").slice(0, 300) });
  if (client) q.set("client", client.id);
  return `${BRAIN_URL}/?${q.toString()}`;
}

// ---------- Demo: switch person on one computer, and answer questions sent to you ----------

function useAccount(user, password) {
  env.BRAIN_USER = user;
  env.BRAIN_PASSWORD = password;
  cookie = null;
  me = null;
  answerCache.clear();
  clientFacts.clear();
  pendingShares.clear();
  loadedAt = 0;
  clients = [];
  lastClient = null;
}

const whoAmI = () => me;

// Questions colleagues' shares sent to you ("Can you approve this?").
async function questionsForMe() {
  if (!me) return [];
  const r = await call("/api/brain/questions");
  return (r.forMe || []).map((q) => ({ id: q.id, from: q.from, quote: q.quote, value: q.value, label: q.factLabel, caseName: q.caseName, fromName: q.fromName }));
}

async function answerQuestion(id, answer) {
  const r = await call("/api/brain/questions/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, answer }),
  });
  answerCache.clear();
  clientFacts.clear();
  loadedAt = 0;
  return r;
}

module.exports = { ask, check, checkAll, corrected, warmUp, learn, learnWhenSettled, stopLearning, share, webLink, isPending, BRAIN_URL, useAccount, whoAmI, questionsForMe, answerQuestion, findFactByText: (t) => findFact(t) };

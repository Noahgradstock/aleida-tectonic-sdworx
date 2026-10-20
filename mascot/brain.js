// Talks to the Company brain trust engine (the deployed web app). Runs in the main process only.
// All trusted facts are loaded at start and refreshed every few minutes, so checks run locally and instantly.
const env = require("./env");

const BRAIN_URL = env.BRAIN_URL || "https://tavling-eight.vercel.app";
const CONTEXT = { country: "BE", pc: "200" }; // demo case: a Belgian PC 200 employer
const REFRESH_MS = 5 * 60 * 1000;

let cookie = null;
let facts = []; // [{ key, label, keywords, status, value, score, source }]
let loadedAt = 0;

async function signIn() {
  const res = await fetch(`${BRAIN_URL}/api/auth/guest`, { method: "POST" });
  if (!res.ok) throw new Error(`Sign-in failed (${res.status})`);
  cookie = (res.headers.get("set-cookie") || "").split(";")[0];
}

async function call(path, init = {}, retry = true) {
  if (!cookie) await signIn();
  const res = await fetch(`${BRAIN_URL}${path}`, { ...init, headers: { ...(init.headers || {}), cookie } });
  if (res.status === 401 && retry) {
    cookie = null;
    return call(path, init, false);
  }
  if (!res.ok) throw new Error(`Brain error (${res.status})`);
  return res.json();
}

async function loadFacts() {
  const q = new URLSearchParams(CONTEXT).toString();
  const data = await call(`/api/trust/facts?${q}`);
  facts = data.facts.map((f) => ({
    key: f.fact.key,
    label: f.fact.label,
    keywords: f.fact.keywords.map((k) => k.toLowerCase()),
    status: f.status,
    value: f.best ? f.best.claim.value : null,
    score: f.best ? Math.round(f.best.score * 100) : null,
    source: f.best ? f.best.claim.source.title : null,
  }));
  loadedAt = Date.now();
  return facts.length;
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
function findFact(text) {
  const t = ` ${text.toLowerCase()} `;
  let best = null;
  for (const f of facts) {
    const hits = f.keywords.filter((k) => t.includes(k));
    if (!hits.length) continue;
    const score = hits.length * 100 + Math.max(...hits.map((k) => k.length));
    if (!best || score > best.score) best = { fact: f, score };
  }
  return best ? best.fact : null;
}

// ---------- Values: "€1,650", "8.91 euros", "50%", "18 weeks", "650 hours", "3 times", "20th" ----------

const VALUE = /€\s?\d[\d.,]*|\d[\d.,]*\s?(?:%|percent\b|euros?\b|eur\b|hours?\b|weeks?\b|months?\b|days?\b|times\b)|\b\d{1,2}(?:st|nd|rd|th)\b/gi;

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
  const key = question.toLowerCase().replace(/[^a-z0-9€%.,\s]/g, "").replace(/\s+/g, " ").trim();
  if (answerCache.has(key)) return answerCache.get(key);
  const r = await call("/api/trust/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: question.slice(0, 500), context: CONTEXT }),
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
  await ensureFacts();
  const issues = [];
  const sentences = text.slice(0, 4000).split(/(?<=[.!?\n])\s+/);
  for (const sentence of sentences) {
    const said = sentence.match(VALUE);
    if (!said) continue;
    const fact = findFact(sentence);
    if (!fact || fact.status !== "trusted" || !fact.value || !/\d/.test(fact.value)) continue;
    const trusted = parse(fact.value);
    const sameUnit = said.map((v) => ({ raw: v.trim().replace(/[.,]$/, ""), ...parse(v) })).filter((v) => v.unit === trusted.unit);
    if (!sameUnit.length || sameUnit.some((v) => sameValue(v, trusted))) continue;
    issues.push({ said: sameUnit[0].raw, sentence: sentence.trim(), ...fact });
  }
  return issues;
}

async function check(text) {
  const [first] = await checkAll(text);
  return first ? { ok: false, ...first } : { ok: true };
}

// The text with every wrong value replaced by the trusted one, only inside the sentence it was found in.
async function corrected(text) {
  const issues = await checkAll(text);
  let out = text;
  for (const i of issues) {
    const fixedSentence = i.sentence.replace(i.said, i.value);
    out = out.replace(i.sentence, fixedSentence);
  }
  return { text: out, issues };
}

// Signs in and loads all facts up front, so the first check and question are fast.
async function warmUp() {
  try {
    const n = await loadFacts();
    console.log(`brain: ${n} facts loaded`);
  } catch (e) {
    console.log("brain: could not load facts:", e.message);
  }
}

module.exports = { ask, check, checkAll, corrected, warmUp, findFactByText: (t) => findFact(t) };

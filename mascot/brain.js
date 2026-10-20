// Talks to the Company brain trust engine (the deployed web app). Runs in the main process only.
const env = require("./env");
const BRAIN_URL = env.BRAIN_URL || "https://tavling-eight.vercel.app";
const CONTEXT = { country: "BE", pc: "200" }; // demo case: a Belgian PC 200 employer

let cookie = null;

async function signIn() {
  const res = await fetch(`${BRAIN_URL}/api/auth/guest`, { method: "POST" });
  if (!res.ok) throw new Error(`Sign-in failed (${res.status})`);
  cookie = (res.headers.get("set-cookie") || "").split(";")[0];
}

async function post(path, body, retry = true) {
  if (!cookie) await signIn();
  const res = await fetch(`${BRAIN_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && retry) {
    cookie = null;
    return post(path, body, false);
  }
  if (!res.ok) throw new Error(`Brain error (${res.status})`);
  return res.json();
}

// The fields the mascot shows. Never pass raw server data to the page.
function summarise(r) {
  if (!r.matched) return { matched: false, message: r.message };
  const best = r.best;
  return {
    matched: true,
    label: r.fact.label,
    status: r.status,
    value: best ? best.claim.value : null,
    score: best ? Math.round(best.score * 100) : null,
    source: best ? best.claim.source.title : null,
    expert: r.expert ? r.expert.name : null,
  };
}

async function ask(question) {
  return summarise(await post("/api/trust/ask", { question: question.slice(0, 500), context: CONTEXT }));
}

const norm = (s) => s.toLowerCase().replace(/€|euros?|eur\b/g, "").replace(/\s+/g, "").replace(",", ".");
const VALUE = /€\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?(?:%|percent\b|euros?\b|eur\b)|\d+\s?(?:weeks?|months?|days?)\b/gi;

// Checks each sentence that states a value against the trusted answer for its topic.
async function check(text) {
  const sentences = text.slice(0, 4000).split(/(?<=[.!?\n])\s+/).filter((s) => (s.match(VALUE) || []).length > 0);
  for (const sentence of sentences) {
    const values = sentence.match(VALUE) || [];
    const r = await ask(sentence);
    if (!r.matched || !r.value || r.status !== "trusted") continue;
    if (values.some((v) => norm(v) === norm(r.value))) continue;
    return { ok: false, said: values[0].trim(), ...r };
  }
  return { ok: true };
}

module.exports = { ask, check };

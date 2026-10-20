// Reads the few settings the mascot needs from the repo's .env (never committed) or the process environment.
const fs = require("node:fs");
const path = require("node:path");

const KEYS = ["BRAIN_URL", "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "ANTHROPIC_API_KEY"];

function load() {
  const out = {};
  try {
    const text = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && KEYS.includes(m[1]) && m[2]) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env file: fall back to the process environment only.
  }
  for (const k of KEYS) if (process.env[k]) out[k] = process.env[k];
  return out;
}

module.exports = load();

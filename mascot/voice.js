// Speech-to-text and text-to-speech through ElevenLabs. Falls back to the macOS voice when no key is set.
const { execFile } = require("node:child_process");
const env = require("./env");

const API = "https://api.elevenlabs.io/v1";
const VOICE = env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const STT_MODELS = ["scribe_v2", "scribe_v1"];
let sttModel = null;

const hasKey = () => Boolean(env.ELEVENLABS_API_KEY);

async function transcribe(buffer, mime) {
  if (!hasKey()) throw new Error("No ElevenLabs key");
  for (const model of sttModel ? [sttModel] : STT_MODELS) {
    const form = new FormData();
    form.append("model_id", model);
    form.append("file", new Blob([buffer], { type: mime }), "segment.webm");
    const res = await fetch(`${API}/speech-to-text`, {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
      body: form,
    });
    if (res.ok) {
      sttModel = model;
      return ((await res.json()).text || "").trim();
    }
    if (res.status !== 400 && res.status !== 422) throw new Error(`Speech-to-text failed (${res.status})`);
  }
  throw new Error("No speech-to-text model available");
}

// Returns MP3 audio as base64, or null after speaking with the system voice instead.
async function speak(text) {
  const clean = text.slice(0, 600);
  if (hasKey()) {
    try {
      const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(VOICE)}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({ text: clean, model_id: "eleven_flash_v2_5" }),
      });
      if (res.ok) return Buffer.from(await res.arrayBuffer()).toString("base64");
    } catch {
      // Fall through to the system voice.
    }
  }
  if (process.platform === "darwin") execFile("say", ["-v", "Samantha", clean], () => {});
  return null;
}

module.exports = { hasKey, transcribe, speak };

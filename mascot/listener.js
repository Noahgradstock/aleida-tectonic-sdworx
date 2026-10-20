// Hidden window: records the microphone and cuts an utterance as soon as you pause (voice activity detection).
// Silence is never sent anywhere.
const MIME = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
const SPEECH_LEVEL = 0.018; // RMS above this counts as speech
const PAUSE_MS = 650; // this much silence after speech ends the utterance
const MAX_MS = 9000; // never record one utterance longer than this
const MIN_SPEECH_MS = 350; // ignore clicks and coughs

async function start() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch {
    window.listener.error("Microphone access was refused.");
    return;
  }
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  const level = () => {
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const s of samples) sum += s * s;
    return Math.sqrt(sum / samples.length);
  };

  let rec = null;
  let chunks = [];
  let startedAt = 0;
  let lastVoice = 0;
  let speechMs = 0;

  const begin = () => {
    chunks = [];
    rec = new MediaRecorder(stream, { mimeType: MIME });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: MIME });
      const keep = speechMs >= MIN_SPEECH_MS && blob.size > 1500;
      rec = null;
      if (keep) window.listener.segment(await blob.arrayBuffer(), MIME);
    };
    rec.start(100);
    startedAt = performance.now();
    speechMs = 0;
  };

  let prev = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = now - prev;
    prev = now;
    const speaking = level() > SPEECH_LEVEL;
    if (speaking) {
      lastVoice = now;
      if (!rec) begin();
      speechMs += dt;
    }
    if (rec && rec.state === "recording" && (now - lastVoice > PAUSE_MS || now - startedAt > MAX_MS)) rec.stop();
  }, 50);
}

start();

// Hidden window: records the microphone in short, self-contained segments and hands each one to the main process.
const SEGMENT_MS = 4500;
const MIME = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";

async function start() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    window.listener.error("Microphone access was refused.");
    return;
  }
  const loop = () => {
    const rec = new MediaRecorder(stream, { mimeType: MIME });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: MIME });
      if (blob.size > 2000) window.listener.segment(await blob.arrayBuffer(), MIME);
      loop();
    };
    rec.start();
    setTimeout(() => rec.state === "recording" && rec.stop(), SEGMENT_MS);
  };
  loop();
}

start();

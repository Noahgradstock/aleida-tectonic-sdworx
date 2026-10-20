// Mascot page. Calm by default; it only asks for attention when something is wrong or you talk to it.
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const card = $("card");
const audio = $("audio");
let pendingFix = null;
let meetingOn = false;

const STATUS_TEXT = { trusted: "Trusted", conflict: "Sources disagree", stale: "Needs a check", orphan: "No expert backing" };
const WHERE = { email: "in your email", meeting: "in the meeting" };

function setMood(mood) {
  const base = meetingOn && mood === "calm" ? "listening" : mood;
  stage.className = `stage ${base}${mood === "warning" ? " warning-mode" : ""}`;
}

function show(section) {
  card.hidden = false;
  for (const id of ["answer", "warning", "note"]) $(id).hidden = id !== section;
}

function closeCard() {
  card.hidden = true;
  pendingFix = null;
  setMood("calm");
  window.mascot.interactive(false);
}

// Clicks pass through the transparent window except over the blob, the pill and the card.
for (const el of document.querySelectorAll(".hit")) {
  el.addEventListener("mouseenter", () => window.mascot.interactive(true));
  el.addEventListener("mouseleave", () => window.mascot.interactive(false));
}

// Drag the blob to move the window; a click without movement opens the card.
const blob = $("mascot");
let drag = null;
blob.addEventListener("mousedown", (e) => (drag = { x: e.screenX, y: e.screenY, moved: 0 }));
window.addEventListener("mousemove", (e) => {
  if (!drag) return;
  const dx = e.screenX - drag.x;
  const dy = e.screenY - drag.y;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  drag.x = e.screenX;
  drag.y = e.screenY;
  window.mascot.move(dx, dy);
});
window.addEventListener("mouseup", () => {
  if (drag && drag.moved < 4) toggleAsk();
  drag = null;
});

function toggleAsk() {
  if (!card.hidden && $("warning").hidden) return closeCard();
  show(null);
  setMood("calm");
  window.mascot.interactive(true);
  $("question").focus();
}

$("close").addEventListener("click", closeCard);
$("open-compose").addEventListener("click", () => window.mascot.openCompose());
$("mode-watch").addEventListener("change", (e) => window.mascot.setMode("watch", e.target.checked));
$("mode-meeting").addEventListener("change", (e) => window.mascot.setMode("meeting", e.target.checked));

function renderAnswer(r) {
  if (r.error || !r.matched) {
    $("note").textContent = typeof r.error === "string" ? r.error : r.message || "I don't know that one yet.";
    return show("note");
  }
  $("a-label").textContent = r.label;
  $("a-value").textContent = r.value ?? "No answer for this case";
  $("a-chip").textContent = `${STATUS_TEXT[r.status] ?? r.status}${r.score != null ? ` · ${r.score}%` : ""}`;
  $("a-chip").className = `chip ${r.status}`;
  $("a-source").textContent = r.source ?? "";
  $("a-expert").textContent = r.expert ? `Expert to ask: ${r.expert}` : "";
  show("answer");
}

$("ask-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = $("question").value.trim();
  if (!question) return;
  setMood("thinking");
  const r = await window.mascot.ask(question);
  setMood("calm");
  renderAnswer(r);
});

window.mascot.onToggleAsk(toggleAsk);
window.mascot.onThinking(() => {
  if (card.hidden || !$("warning").hidden) setMood("thinking");
});

// Something written or said does not match trusted knowledge.
window.mascot.onCheck((r) => {
  if (r.ok) {
    if (!$("warning").hidden) closeCard();
    else setMood("calm");
    return;
  }
  const spoken = r.where === "meeting";
  pendingFix = r.where === "email" ? { from: r.said, to: r.value } : null;
  $("w-text").textContent = `You ${spoken ? "said" : "wrote"} ${r.said} for "${r.label.toLowerCase()}" ${WHERE[r.where] ?? `in ${r.where}`}. The trusted value is ${r.value}.`;
  $("w-chip").textContent = `Trusted · ${r.score}%`;
  $("w-source").textContent = r.source;
  $("fix").hidden = !pendingFix;
  setMood("warning");
  show("warning");
});

// Meeting mode
window.mascot.onMeeting(({ on, voice }) => {
  meetingOn = on;
  $("mode-meeting").checked = on;
  $("pill").hidden = !on;
  $("live").hidden = !on;
  $("pill-text").textContent = voice === false ? "Listening (no voice key)" : "Listening";
  $("live-text").textContent = "Listening… say “Hey SD Worx” to ask.";
  setMood("calm");
});

window.mascot.onHeard(({ text, error }) => {
  $("live-text").textContent = error ? error : `“${text}”`;
});

window.mascot.onWake(() => {
  setMood("wake");
  $("pill-text").textContent = "Yes? Ask me…";
});

window.mascot.onAnswer((r) => {
  card.hidden = false;
  renderAnswer(r);
});

window.mascot.onSpeak(({ audio: b64 }) => {
  $("pill-text").textContent = meetingOn ? "Listening" : "";
  setMood("speaking");
  const done = () => setMood("calm");
  if (!b64) return setTimeout(done, 4000);
  audio.src = `data:audio/mpeg;base64,${b64}`;
  audio.onended = done;
  audio.play().catch(done);
});

$("fix").addEventListener("click", () => {
  if (pendingFix) window.mascot.fix(pendingFix.from, pendingFix.to);
  closeCard();
});
$("ignore").addEventListener("click", closeCard);

setMood("calm");

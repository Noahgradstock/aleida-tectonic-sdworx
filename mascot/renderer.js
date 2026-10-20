// Mascot page. Offline: asleep, sees and hears nothing. Online: silent until something is wrong or you talk to it.
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const card = $("card");
const audio = $("audio");
let pendingFix = null;
let online = false;
let mood = "calm";
let context = "email";

const STATUS_TEXT = { trusted: "Trusted", conflict: "Sources disagree", stale: "Needs a check", orphan: "No expert backing" };
const WHERE = { email: "in your email", meeting: "in the meeting", Mail: "in your email" };
const CONTEXT_TEXT = { email: "Email", meeting: "Meeting" };

function setMood(next) {
  mood = next;
  const base = !online && next === "calm" ? "offline" : next;
  stage.className = `stage ${base}${next === "warning" ? " warning-mode" : ""}`;
  stage.dataset.ctx = context;
  stage.classList.toggle("talk-on", $("talk").classList.contains("on"));
}

function pill(text, ms = 2500) {
  $("pill").hidden = !text;
  $("pill-text").textContent = text || "";
  clearTimeout(pill.t);
  if (text && ms) pill.t = setTimeout(() => ($("pill").hidden = true), ms);
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

// Clicks pass through the transparent window except over the blob and the card.
for (const el of document.querySelectorAll(".hit")) {
  el.addEventListener("mouseenter", () => window.mascot.interactive(true));
  el.addEventListener("mouseleave", () => window.mascot.interactive(false));
}

// Drag the blob to move the window; a click without movement opens the card.
const blob = $("mascot");
let drag = null;
let pressTimer = null;
blob.addEventListener("mousedown", (e) => {
  drag = { x: e.screenX, y: e.screenY, moved: 0, ptt: false };
  pressTimer = setTimeout(() => {
    if (drag && drag.moved < 4) {
      drag.ptt = true;
      window.mascot.toggleTalk();
    }
  }, 450);
});
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
  clearTimeout(pressTimer);
  if (drag && drag.moved < 4 && !drag.ptt) toggleCard();
  drag = null;
});

function toggleCard() {
  if (!card.hidden && $("warning").hidden) return closeCard();
  show(null);
  setMood("calm");
  window.mascot.interactive(true);
  $("question").focus();
}

$("close").addEventListener("click", closeCard);
$("online").addEventListener("change", (e) => window.mascot.setOnline(e.target.checked));
$("talk").addEventListener("click", () => window.mascot.toggleTalk());

function setTalk(on) {
  stage.classList.toggle("talk-on", on);
  $("talk").classList.toggle("on", on);
  $("talk").title = on ? "Talking on: say “Hey SD Worx”. Click to turn off." : "Turn on talking (or long-press the blob)";
}
window.mascot.onTalk((on) => {
  setTalk(on);
  pill(on ? "Talking on · say “Hey SD Worx”" : "Talking off", 2500);
});
for (const b of document.querySelectorAll("#seg button")) {
  b.addEventListener("click", () => window.mascot.setContext(b.dataset.mode));
}

function statusLine() {
  $("status-text").textContent = online ? `Online · ${CONTEXT_TEXT[context]}` : "Offline";
}

window.mascot.onContext(({ context: c, mode, talk }) => {
  setTalk(Boolean(talk));
  const changed = c !== context;
  context = c;
  stage.dataset.ctx = c;
  for (const b of document.querySelectorAll("#seg button")) b.classList.toggle("on", b.dataset.mode === mode);
  statusLine();
  if (changed && online) pill(c === "meeting" ? "Meeting · listening for mistakes" : "Email · checking what you write", 2500);
});

window.mascot.onOnline((on) => {
  online = on;
  $("online").checked = on;
  statusLine();
  pill(on ? "Online · tap 🎙 to talk" : "Offline");
  setMood("calm");
});

function renderAnswer(r) {
  const a = r.answer;
  if (!a || !a.matched || !a.value) {
    $("note").textContent = r.text || "I don't know that one yet.";
    return show("note");
  }
  $("a-reply").textContent = r.text || "";
  $("a-label").textContent = a.label;
  $("a-value").textContent = a.value;
  $("a-chip").textContent = `${STATUS_TEXT[a.status] ?? a.status}${a.score != null ? ` · ${a.score}%` : ""}`;
  $("a-chip").className = `chip ${a.status}`;
  $("a-source").textContent = a.source ?? "";
  $("a-expert").textContent = a.expert ? `Expert to ask: ${a.expert}` : "";
  show("answer");
}

$("ask-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = $("question").value.trim();
  if (!question) return;
  setMood("thinking");
  const r = await window.mascot.ask(question);
  setMood("calm");
  $("question").value = "";
  renderAnswer(r);
});

window.mascot.onToggleAsk(toggleCard);
window.mascot.onThinking(() => {
  if (card.hidden) setMood("thinking");
});

// Something written or said does not match trusted knowledge.
window.mascot.onCheck((r) => {
  if (r.ok) {
    if (!$("warning").hidden) {
      closeCard();
      pill("Fixed. All good ✓", 2000);
    } else if (mood === "thinking") setMood("calm");
    return;
  }
  const spoken = r.where === "meeting";
  pendingFix = r.where === "meeting" ? null : { from: r.said, to: r.value, native: r.where !== "email" };
  $("w-text").textContent = spoken
    ? `That last thing you said was off: ${r.said} for "${r.label.toLowerCase()}". The trusted value is ${r.value}.`
    : `You wrote ${r.said} for "${r.label.toLowerCase()}" ${WHERE[r.where] ?? `in ${r.where}`}. The trusted value is ${r.value}.`;
  $("w-chip").textContent = `Trusted · ${r.score}%`;
  $("w-source").textContent = r.source;
  $("fix").hidden = !pendingFix;
  setMood("warning");
  show("warning");
});

window.mascot.onHeard(({ error }) => {
  if (error) pill(error, 4000);
});

window.mascot.onWake(() => {
  setMood("wake");
  pill("Yes? Ask your question…", 9000);
});

window.mascot.onAnswer((r) => {
  card.hidden = false;
  renderAnswer(r);
});

window.mascot.onSpeak(({ audio: b64 }) => {
  pill("");
  setMood("speaking");
  const done = () => setMood("calm");
  if (!b64) return setTimeout(done, 3500);
  audio.src = `data:audio/mpeg;base64,${b64}`;
  audio.onended = done;
  audio.play().catch(done);
});

$("fix").addEventListener("click", () => {
  if (pendingFix && pendingFix.native) {
    const { from, to } = pendingFix;
    window.mascot.copy(to);
    closeCard();
    return pill(`Copied ${to}. Paste it over ${from}`, 4000);
  }
  if (pendingFix) window.mascot.fix(pendingFix.from, pendingFix.to);
  closeCard();
});
$("ignore").addEventListener("click", closeCard);

setMood("calm");

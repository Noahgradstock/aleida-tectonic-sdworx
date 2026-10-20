// Mascot page: calm by default, opens a card to ask questions, warns when an email states a wrong value.
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const card = $("card");
let pendingFix = null;

const STATUS_TEXT = { trusted: "Trusted", conflict: "Sources disagree", stale: "Needs a check", orphan: "No expert backing" };

function setMood(mood) {
  stage.className = `stage ${mood}${mood === "warning" ? " warning-mode" : ""}`;
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
  $("answer").hidden = true;
  setMood("calm");
  window.mascot.interactive(true);
  $("question").focus();
}

$("close").addEventListener("click", closeCard);
$("open-compose").addEventListener("click", () => window.mascot.openCompose());

$("ask-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = $("question").value.trim();
  if (!question) return;
  setMood("thinking");
  const r = await window.mascot.ask(question);
  setMood("calm");
  if (r.error || !r.matched) {
    $("note").textContent = r.error || r.message || "I don't know that one yet.";
    return show("note");
  }
  $("a-label").textContent = r.label;
  $("a-value").textContent = r.value ?? "No answer for this case";
  $("a-chip").textContent = `${STATUS_TEXT[r.status] ?? r.status}${r.score != null ? ` · ${r.score}%` : ""}`;
  $("a-chip").className = `chip ${r.status}`;
  $("a-source").textContent = r.source ?? "";
  $("a-expert").textContent = r.expert ? `Expert to ask: ${r.expert}` : "";
  show("answer");
});

window.mascot.onToggleAsk(toggleAsk);
window.mascot.onThinking(() => {
  if (card.hidden || !$("warning").hidden) setMood("thinking");
});

window.mascot.onCheck((r) => {
  if (r.ok) {
    if (!$("warning").hidden) closeCard();
    else setMood("calm");
    return;
  }
  pendingFix = { from: r.said, to: r.value };
  $("w-text").textContent = `You wrote ${r.said} for "${r.label.toLowerCase()}". The trusted value is ${r.value}.`;
  $("w-chip").textContent = `Trusted · ${r.score}%`;
  $("w-source").textContent = r.source;
  setMood("warning");
  show("warning");
});

$("fix").addEventListener("click", () => {
  if (pendingFix) window.mascot.fix(pendingFix.from, pendingFix.to);
  closeCard();
});
$("ignore").addEventListener("click", closeCard);

setMood("calm");

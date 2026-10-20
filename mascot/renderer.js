// Mascot page. Offline: asleep, sees and hears nothing. Online: silent until something is wrong or you talk to it.
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const card = $("card");
const audio = $("audio");
let pendingFix = null;
let lastQuestion = ""; // for "See in Company brain"
let lastIssue = null;
let shownIssue = ""; // the warning on screen, so repeats do not re-animate it
let online = false;
let mood = "calm";
let context = "email";

const STATUS_TEXT = { trusted: "Trusted", conflict: "Sources disagree", stale: "Needs a check", orphan: "No expert backing" };
const WHERE = { email: "in your email", meeting: "in the meeting", Mail: "in your email" };
const CONTEXT_TEXT = { email: "Email", meeting: "Meeting" };

function setMood(next) {
  mood = next;
  const base = !online && next === "calm" ? "offline" : next;
  stage.className = `stage ${base}${next === "warning" ? " warning-mode" : ""}${next === "curious" ? " unknown-mode" : ""}`;
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
  for (const id of ["answer", "warning", "note", "questions"]) $(id).hidden = id !== section;
}

function closeCard() {
  card.hidden = true;
  shownIssue = "";
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
  pill(on ? "Listening · just talk" : "Say “Hey SD Worx” to talk", 2500);
});

function statusLine() {
  $("status-text").textContent = online ? `Online · ${CONTEXT_TEXT[context]}` : "Offline";
}

window.mascot.onContext(({ context: c, mode, talk }) => {
  setTalk(Boolean(talk));
  const changed = c !== context;
  context = c;
  stage.dataset.ctx = c;
  statusLine();
  if (changed && online) pill(c === "meeting" ? "Meeting · listening for mistakes" : "Email · checking what you write", 2500);
});

window.mascot.onOnline((on) => {
  online = on;
  $("online").checked = on;
  statusLine();
  pill(on ? "Online · say “Hey SD Worx”" : "Offline");
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
  lastQuestion = question;
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
  const id = `${r.where}|${r.key}|${r.said}`;
  if (id === shownIssue && !$("warning").hidden) return;
  shownIssue = id;
  lastIssue = r;
  if (r.kind === "unknown") {
    pendingFix = null;
    $("w-title").textContent = "Not in the Company brain yet";
    $("w-text").textContent = `“${r.sentence}” isn't something the Company brain can confirm${r.client ? ` for ${r.client}` : ""}. Share this sentence for review? A colleague approves it before anyone sees it.`;
    $("w-meta").hidden = true;
    $("fix").hidden = true;
    $("share").textContent = "Share for review";
    $("ignore").textContent = "Not now";
    setMood("curious");
    return show("warning");
  }
  $("w-title").textContent = "Heads up before you send";
  $("w-meta").hidden = false;
  $("share").textContent = "I know better";
  $("ignore").textContent = "Ignore";
  const spoken = r.where === "meeting";
  pendingFix = r.where === "meeting" ? null : { from: r.said, to: r.value, native: r.where !== "email" };
  $("w-text").textContent = spoken
    ? `That last thing you said was off: ${r.said} for "${r.label.toLowerCase()}". The trusted value is ${r.value}.`
    : r.client
      ? `You wrote ${r.said}, but for ${r.client} the ${r.label.toLowerCase()} is ${r.value}.`
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
  if (r.question) lastQuestion = r.question;
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
    window.mascot.fixMail();
    setMood("thinking");
    return pill("Fixing your email…", 3000);
  }
  if (pendingFix) window.mascot.fix(pendingFix.from, pendingFix.to);
  closeCard();
});
$("ignore").addEventListener("click", closeCard);

// ---------- Demo on one computer: switch person ----------
async function loadPeople() {
  const a = await window.mascot.accounts();
  if (!a || !a.list.length) return;
  $("who").hidden = false;
  $("people").replaceChildren(
    ...a.list.map((label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.classList.toggle("on", label === a.current);
      b.addEventListener("click", async () => {
        for (const x of $("people").children) x.classList.toggle("on", x === b);
        setMood("thinking");
        const r = await window.mascot.switchAccount(label);
        setMood("calm");
        pill(r && r.name ? `You are ${label} now` : "Could not sign in", 2500);
      });
      return b;
    }),
  );
}
loadPeople();

// ---------- Approve what a colleague shared ----------
let openQuestion = null;
window.mascot.onQuestions((qs) => {
  openQuestion = qs[0] || null;
  if (!openQuestion) {
    if (!$("questions").hidden) closeCard();
    return;
  }
  $("q-text").textContent = `${openQuestion.fromName} shared: “${openQuestion.quote}” (${openQuestion.label.toLowerCase()}: ${openQuestion.value}, ${openQuestion.caseName}). It counts once you approve it.`;
  setMood("curious");
  show("questions");
  window.mascot.interactive(true);
});
async function answer(kind, text) {
  if (!openQuestion) return;
  const r = await window.mascot.answerQuestion(openQuestion.id, kind);
  closeCard();
  pill(r.ok ? text : "Could not save your answer", 3000);
}
$("q-yes").addEventListener("click", () => answer("correct", "Approved ✓ Everyone sees it now"));
$("q-no").addEventListener("click", () => answer("wrong", "Marked as not right"));
$("q-skip").addEventListener("click", () => answer("not_mine", "Passed on to someone else"));

// Share one sentence for review: only after this click, never automatically.
$("share").addEventListener("click", async () => {
  $("share").disabled = true;
  setMood("thinking");
  const r = await window.mascot.share();
  $("share").disabled = false;
  closeCard();
  if (r.ok && r.suggestion) pill("New topic · saved as a suggestion for the knowledge team ✓", 4500);
  else if (r.ok) pill(`Shared for review · ${r.toName ? `${r.toName} will approve it` : "waiting for approval"} ✓`, 4500);
  else pill(r.reason || "Could not share it.", 4500);
});

$("a-open").addEventListener("click", () => window.mascot.openBrain(lastQuestion));
$("w-open").addEventListener("click", () => {
  const i = lastIssue;
  window.mascot.openBrain(i ? `${i.label}${i.client ? ` for ${i.client}` : ""}` : lastQuestion, i && i.client);
});

window.mascot.onIdle(() => {
  if (mood === "thinking") setMood("calm");
});

window.mascot.onSilence(() => {
  audio.pause();
  audio.removeAttribute("src");
  pill("");
  if (mood === "speaking" || mood === "thinking" || mood === "wake") setMood("calm");
});

// Background learning: one quiet line, no state change. A meeting claim waits for the speaker or an expert.

window.mascot.onFixed(({ count }) => {
  closeCard();
  pill(`Fixed ${count} value${count > 1 ? "s" : ""} in your email ✓`, 3000);
});

setMood("calm");

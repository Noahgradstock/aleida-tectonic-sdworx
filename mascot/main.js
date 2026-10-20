// Company brain mascot: an always-on-top blob that watches two settings, email and meetings.
const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, screen, session, shell, systemPreferences } = require("electron");
const path = require("node:path");
const brain = require("./brain");
const voice = require("./voice");
const { createWatcher } = require("./watcher");
const conversation = require("./conversation");
const { replaceMailBody } = require("./mailfix");

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const SIZE = { width: 360, height: 480 };
const SECURE = { contextIsolation: true, nodeIntegration: false, sandbox: true };
const WAKE = /\b(?:hey|hej|hi|hello|hallå|okay|ok)\b[\s,.!]*(?:(?:[a-z]{1,4}[\s.\-]*){1,2}(?:works?|worx|work|words?)|brainy|brain)\b[\s,.!?:\-]*(.*)$/i;
const MAX_SEGMENT = 2 * 1024 * 1024;

let mascot;
let compose;
let listener;
let waitingForQuestion = false;
let deafUntil = 0; // do not listen to our own voice
let gen = 0; // bumped when talking is turned off or the mascot goes offline; stale answers are dropped

function silence() {
  gen++;
  deafUntil = 0;
  send("mascot:silence");
}

function lockDown(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
}

const send = (channel, ...args) => mascot && !mascot.isDestroyed() && mascot.webContents.send(channel, ...args);

function createMascot() {
  const { workArea } = screen.getPrimaryDisplay();
  mascot = new BrowserWindow({
    ...SIZE,
    x: workArea.x + workArea.width - SIZE.width - 16,
    y: workArea.y + workArea.height - SIZE.height - 8,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: { ...SECURE, preload: path.join(__dirname, "preload.js") },
  });
  mascot.setAlwaysOnTop(true, "floating");
  mascot.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Clicks pass through the transparent area; the page turns them back on over the blob and the card.
  mascot.setIgnoreMouseEvents(true, { forward: true });
  mascot.loadFile(path.join(__dirname, "index.html"));
  lockDown(mascot);
}

function openCompose() {
  if (compose && !compose.isDestroyed()) return compose.focus();
  compose = new BrowserWindow({
    width: 640,
    height: 520,
    title: "New message",
    titleBarStyle: "hiddenInset",
    webPreferences: { ...SECURE, preload: path.join(__dirname, "preload-compose.js") },
  });
  compose.loadFile(path.join(__dirname, "compose.html"));
  lockDown(compose);
}

// ---------- Setting 1: email (demo window, plus opt-in reading of the app in front) ----------

// ---------- Settings: which app you are in decides what the mascot does ----------
// Meeting apps by process name (the Teams app is "MSTeams"), or a browser tab with Teams, Meet or Zoom.
const MEETING_APP = /teams|zoom|facetime|webex|slack|meet/i;
const MEETING_TAB = /\b(microsoft teams|teams|google meet|meet\.google|zoom)\b/i;
const BROWSERS = /safari|chrome|firefox|edge|arc|brave|opera/i;
let frontWindow = "";
const isMeeting = (app, win) => MEETING_APP.test(app) || (BROWSERS.test(app) && MEETING_TAB.test(win));
let contextMode = "auto"; // auto | email | meeting
let activeContext = "email";
let frontApp = "";
let talkMode = false; // conversation mode: no wake word needed (manual toggle, or 30 s after "Hey SD Worx")
let convoUntil = 0;
const CONVO_MS = 30000;
const inConversation = () => talkMode || Date.now() < convoUntil;
function openConversation() {
  const was = inConversation();
  convoUntil = Date.now() + CONVO_MS;
  if (!was) send("mascot:talk", true);
}

function updateContext() {
  // Follows the app in front right away: a meeting app or tab means meeting, anything else means email.
  const next = contextMode !== "auto" ? contextMode : isMeeting(frontApp, frontWindow) ? "meeting" : "email";
  if (next !== activeContext) {
    activeContext = next;
    log("context:", next, `(${frontApp}${frontWindow ? ` · ${frontWindow.slice(0, 40)}` : ""})`);
  }
  const wantMic = online;
  if (wantMic) startMeeting();
  else if (listener) stopMeeting();
  send("mascot:context", { context: activeContext, mode: contextMode, app: frontApp, talk: inConversation() });
}

// The current warning stays until the same place (Mail, the meeting, the demo email) says it is fixed.
let issue = null;
let lastMailText = "";
let offerUntil = 0; // after "Want me to fix that?", a "yes" fixes the email
let lastSpoken = { key: "", at: 0 }; // speak about the same topic at most once per 30 s (typing "€6.9" then "€6.91" is one mistake)
function speakOnce(key) {
  if (lastSpoken.key === key && Date.now() - lastSpoken.at < 30000) return false;
  lastSpoken = { key, at: Date.now() };
  return true;
}

const FIX_COMMAND = /\b(fix|correct|update|repair)\b.*\b(e-?mail|mail)\b|\bfix (it|that|this|everything|them)\b/i;
const YES = /^\s*(yes|yeah|yep|yup|sure|please|do it|go ahead|ja|japp|gör det|fix it)\b/i;

async function fixMail(spoken) {
  const reply = (text) => (spoken ? say(text) : send("mascot:answer", { text }));
  offerUntil = 0;
  if (!lastMailText) return reply("I don't see an email you're writing.");
  const { text, issues } = await brain.corrected(lastMailText);
  if (!issues.length) return reply("Your email already looks right.");
  const r = await replaceMailBody(text);
  log("fix mail:", r.ok ? `fixed ${issues.length}` : r.reason);
  if (!r.ok) return reply(r.reason);
  lastMailText = text;
  const what = issues.map((i) => `${i.said} to ${i.value}`).join(" and ");
  send("mascot:fixed", { count: issues.length });
  if (spoken) say(`Done. I changed ${conversation.speakable(what)}.`);
}

async function checkWriting(text, where) {
  if (!text.trim()) {
    if (issue && issue.where === where) {
      issue = null;
      send("mascot:check", { ok: true });
    }
    return;
  }
  if (!issue) send("mascot:thinking");
  let result;
  try {
    result = await brain.check(text, { useLastClient: where === "meeting" });
  } catch {
    result = { ok: true };
  }
  // Unknown knowledge is only offered for sharing in your own writing, never from meeting audio.
  // Unknown or client-new knowledge is only offered for sharing in your own writing, never from meeting audio.
  if (!result.ok && (result.kind === "unknown" || result.kind === "client-new") && where === "meeting") result = { ok: true };
  log("check", where, result.ok ? "ok" : result.kind === "unknown" ? `NOT IN BRAIN ${result.said}` : `WRONG ${result.said} (trusted ${result.value})`, "| issue:", issue ? `${issue.where} ${issue.said}` : "none");
  if (!result.ok) {
    const same = issue && issue.where === where && issue.said === result.said && issue.key === result.key;
    issue = { ...result, where };
    send("mascot:check", stageObj(issue)); // the page ignores repeats of a warning it is already showing
    if (!same) {
      conversation.rememberWarning(issue);
      if (result.kind !== "wrong") {
        // Unknown knowledge: a quiet card, never spoken.
      } else if (where === "meeting" && !speakOnce(`meeting|${result.key}|${result.client || ""}`)) {
        // Already said it.
      } else if (where === "meeting" && result.client) {
        const g = gen;
        conversation.rememberWarning(issue).then((a) => {
          const d = (a && a.detail) || {};
          const who = /review/i.test((a && a.source) || "") && (d.supporters || [])[0];
          const client = result.client.replace(/\s+(NV|BV)$/, "");
          say(
            `Quick note: for ${client} it's ${conversation.speakable(result.value)}, not ${conversation.speakable(result.said)}.${who ? ` ${who} agreed that with them, and it was approved.` : ""}`,
            g,
          );
        });
      } else if (where === "meeting") {
        say(
          result.client
            ? `Quick note: for ${result.client.replace(/\s+(NV|BV)$/, "")} it's ${conversation.speakable(result.value)}, not ${conversation.speakable(result.said)}.`
            : `Quick correction: ${conversation.speakable(result.said)} is outdated. The ${result.label.toLowerCase()} is ${conversation.speakable(result.value)}.`,
        );
      } else if ((where === "Mail" || where === "email") && speakOnce(`${where}|${result.key}`)) {
        offerUntil = Date.now() + 60000;
        say(
          result.client
            ? `For ${result.client.replace(/\s+(NV|BV)$/, "")} it's ${conversation.speakable(result.value)}. Want me to fix your email?`
            : `Heads up: ${conversation.speakable(result.said)} is outdated. It's ${conversation.speakable(result.value)} now. Want me to fix your email?`,
        );
      }
    }
    return;
  }
  if (issue && issue.where !== where) return; // something else is still wrong
  issue = null;
  send("mascot:check", { ok: true });
}

// Privacy: the mascot never sends what you write to the brain on its own. It only reads trusted answers
// down. Knowledge goes up only when you click "Share for review", one sentence at a time, and a colleague
// has to approve it before it counts.

const watcher = createWatcher(
  (appName, text) => {
    log("writing in", appName, `(${text.length} chars)`);
    if (appName === "Mail") lastMailText = text;
    if (!text.trim()) return checkWriting("", appName);
    checkWriting(text, appName);
  },
  (error) => {
    log("watcher error:", error);
    send("mascot:heard", { error: "Allow access to Mail in System Settings → Privacy & Security (Automation and Accessibility)" });
  },
  (() => {
    let lastLine = "";
    return (r) => {
      if (r.app && !["Electron", "Company brain"].includes(r.app) && (r.app !== frontApp || (r.window || "") !== frontWindow)) {
        frontApp = r.app;
        frontWindow = r.window || "";
        updateContext();
      }
      const line = r.error ? `error: ${r.error.slice(0, 120)}` : `${r.app} role=${r.role || "-"} chars=${(r.text || "").length}`;
      if (line !== lastLine) log("watch:", line, `(${r.ms} ms)`);
      lastLine = line;
    };
  })(),
);

// ---------- Setting 2: meetings (microphone → speech-to-text → check or answer) ----------

async function startMeeting() {
  if (listener && !listener.isDestroyed()) return;
  if (process.platform === "darwin") await systemPreferences.askForMediaAccess("microphone");
  listener = new BrowserWindow({
    show: false,
    webPreferences: { ...SECURE, preload: path.join(__dirname, "preload-listener.js"), backgroundThrottling: false },
  });
  listener.loadFile(path.join(__dirname, "listener.html"));
  lockDown(listener);
  log("meeting listener started, voice key:", voice.hasKey());
}

function stopMeeting() {
  if (listener && !listener.isDestroyed()) listener.destroy();
  listener = null;
  waitingForQuestion = false;

}

async function say(text, g = gen) {
  if (g !== gen) return;
  text = stage(text);
  const audio = await voice.speak(text);
  if (g !== gen) return; // turned off while the voice was being made
  const seconds = audio ? (audio.length * 0.75 * 8) / 32000 : text.length * 0.07;
  deafUntil = Date.now() + seconds * 1000 + 700;
  send("mascot:speak", { text, audio });
}

// explicit: you said "Hey SD Worx" (or used the button), so it always replies; otherwise it only replies when it knows.
async function answerAloud(question, explicit = true) {
  const g = gen;
  log("question:", question, explicit ? "" : "(follow-up)");
  if (FIX_COMMAND.test(question) || (Date.now() < offerUntil && YES.test(question))) return fixMail(true);
  send("mascot:thinking");
  let r;
  try {
    r = await conversation.converse(question);
  } catch {
    r = { text: "Sorry, I can't reach the brain right now.", known: false };
  }
  if (g !== gen) return log("dropped (turned off):", question);
  if (!explicit && !r.known) {
    send("mascot:idle");
    return log("ignored, not a known topic:", question);
  }
  r = stageObj(r);
  log("reply:", r.text);
  send("mascot:answer", { ...r, question });
  if (inConversation()) convoUntil = Math.max(convoUntil, Date.now() + CONVO_MS);
  await say(conversation.speakable(r.text), g);
}

async function onSegment(buffer, mime) {
  if (Date.now() < deafUntil) return;
  let text;
  try {
    text = await voice.transcribe(Buffer.from(buffer), mime);
    log("heard:", JSON.stringify(text));
  } catch (e) {
    log("speech-to-text error:", e.message);
    return send("mascot:heard", { error: voice.hasKey() ? "Speech-to-text failed" : "Add ELEVENLABS_API_KEY to .env to listen" });
  }
  if (!text) return;
  send("mascot:heard", { text });


  if (Date.now() < offerUntil && YES.test(text)) return fixMail(true);

  const wake = text.match(WAKE);
  if (wake) {
    openConversation();
    const question = wake[1].trim();
    if (question.length > 3) return answerAloud(question, true);
    waitingForQuestion = true;
    return send("mascot:wake");
  }

  // In a meeting, a wrong value is corrected before anything else.
  if (activeContext === "meeting") {
    const c = await brain.check(text, { useLastClient: true });
    if (!c.ok && c.kind === "wrong") return checkWriting(text, "meeting");
    // You corrected yourself after a meeting note: confirm it and go calm.
    if (c.ok && issue && issue.where === "meeting" && brain.findFactByText(text)) {
      issue = null;
      send("mascot:check", { ok: true });
      return say("That's right.");
    }
    if (c.ok === false && c.kind === "client-new") { /* the brain only knows the general rule here: stay quiet */ }
  }

  if (waitingForQuestion) {
    waitingForQuestion = false;
    return answerAloud(text, true);
  }
  if (inConversation() && (conversation.isAddressed(text) || FIX_COMMAND.test(text))) {
    return answerAloud(text, false);
  }
  if (activeContext !== "meeting") return; // outside meetings, only "Hey SD Worx" counts
  checkWriting(text, "meeting");
}

// ---------- IPC: every message checks its sender and validates input ----------

const isText = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;
const fromMascot = (event) => mascot && event.sender === mascot.webContents;
const fromCompose = (event) => compose && !compose.isDestroyed() && event.sender === compose.webContents;
const fromListener = (event) => listener && !listener.isDestroyed() && event.sender === listener.webContents;

ipcMain.on("mascot:interactive", (event, on) => {
  if (fromMascot(event)) mascot.setIgnoreMouseEvents(!on, { forward: true });
});

ipcMain.on("mascot:move", (event, dx, dy) => {
  if (!fromMascot(event) || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
  const [x, y] = mascot.getPosition();
  mascot.setPosition(Math.round(x + dx), Math.round(y + dy));
});

ipcMain.on("mascot:open-compose", (event) => fromMascot(event) && openCompose());

// One switch: online = listens in meetings and checks what you write; offline = sees and hears nothing.
let online = false;
function setOnline(on) {
  online = on;
  log("online:", on);
  if (on) watcher.start();
  else {
    watcher.stop();
    brain.stopLearning(); // offline: nothing pending is sent
    talkMode = false;
    convoUntil = 0;
    waitingForQuestion = false;
    silence();
  }
  send("mascot:online", on);
  updateContext();
}
function toggleTalk() {
  talkMode = !inConversation();
  if (!talkMode) {
    convoUntil = 0;
    waitingForQuestion = false;
    offerUntil = 0;
    silence();
  }
  if (talkMode && !online) setOnline(true);
  log("talk mode:", talkMode);
  updateContext();
  send("mascot:talk", talkMode);
}

ipcMain.on("mascot:toggle-talk", (event) => fromMascot(event) && toggleTalk());

ipcMain.on("mascot:set-context", (event, mode) => {
  if (!fromMascot(event) || !["auto", "email", "meeting"].includes(mode)) return;
  contextMode = mode;
  updateContext();
});

ipcMain.on("mascot:set-online", (event, on) => {
  if (fromMascot(event) && typeof on === "boolean") setOnline(on);
});

ipcMain.handle("brain:ask", async (event, question) => {
  if (!fromMascot(event) || !isText(question, 500)) return { error: "Ask a short question." };
  if (FIX_COMMAND.test(question)) {
    await fixMail(false);
    return { text: "On it." };
  }
  try {
    return stageObj(await conversation.converse(question));
  } catch {
    return { text: "The brain is not reachable right now." };
  }
});

ipcMain.on("compose:changed", (event, text) => {
  if (!fromCompose(event) || typeof text !== "string") return;
  checkWriting(text.slice(0, 4000), "email");
});

ipcMain.on("mascot:fix", (event, from, to) => {
  if (!fromMascot(event) || !isText(from, 40) || !isText(to, 40)) return;
  if (compose && !compose.isDestroyed()) compose.webContents.send("compose:replace", from, to);
});

// "Fix it" in a native app: put the trusted value on the clipboard, ready to paste.
ipcMain.on("mascot:copy", (event, text) => {
  if (fromMascot(event) && isText(text, 40)) clipboard.writeText(text);
});

ipcMain.on("mascot:fix-mail", (event) => fromMascot(event) && fixMail(false));

// Suggestions for new topics, kept locally (one JSON file in the app's data folder) until the knowledge team adds the topic.
function saveSuggestion(i) {
  const fs = require("node:fs");
  const file = path.join(app.getPath("userData"), "suggestions.json");
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // First suggestion.
  }
  list.push({ sentence: i.sentence.slice(0, 500), client: i.client || null, at: new Date().toISOString() });
  fs.writeFileSync(file, JSON.stringify(list.slice(-200), null, 2));
  return { ok: true, suggestion: true };
}

// "Share for review": the one sentence of the current issue, after you clicked. Never the whole email.
ipcMain.handle("mascot:share", async (event) => {
  if (!fromMascot(event) || !issue || !issue.sentence) return { ok: false, reason: "Nothing to share." };
  try {
    let r = await brain.share(issue.sentence, issue.client);
    // A brand-new topic the brain cannot learn yet: keep it as a suggestion for the knowledge team, on this device.
    if (!r.ok && /not about a topic the brain knows/i.test(r.reason || "")) r = saveSuggestion(issue);
    log("share:", r.ok ? `${r.label} ${r.value} → review by ${r.toName || "a colleague"}` : r.reason);
    if (r.ok) issue = null;
    return stageObj(r);
  } catch {
    return { ok: false, reason: "The brain is not reachable right now." };
  }
});

// ---------- Demo on one computer: switch person, and approve questions in the mascot ----------
const env = require("./env");
const ACCOUNTS = String(env.DEMO_ACCOUNTS || "")
  .split(";")
  .map((x) => x.split(":"))
  .filter((p) => p.length >= 3 && p[0] && p[1])
  .map(([label, user, ...rest]) => ({ label, user, password: rest.join(":") }));
let account = ACCOUNTS.find((a) => a.user === env.BRAIN_USER) || null;

// Stage names: "Jan Wouters" -> "Ilke", so what the mascot shows and says matches the story.
const stageNames = new Map(); // full name -> label
async function loadStageNames() {
  for (const a of ACCOUNTS) {
    try {
      const name = await brain.nameOf(a.user, a.password);
      if (name) stageNames.set(name, a.label);
    } catch {
      // Keep the real name.
    }
  }
}
function stage(text) {
  if (typeof text !== "string" || !stageNames.size) return text;
  let out = text;
  for (const [name, label] of stageNames) out = out.split(name).join(label);
  return out;
}
const stageObj = (o) => (o && typeof o === "object" ? JSON.parse(stage(JSON.stringify(o))) : o);

ipcMain.handle("mascot:accounts", (event) => {
  if (!fromMascot(event)) return null;
  return { list: ACCOUNTS.map((a) => a.label), current: account ? account.label : null };
});

ipcMain.handle("mascot:switch", async (event, label) => {
  if (!fromMascot(event) || typeof label !== "string") return null;
  return switchTo(label);
});

// Demo shortcuts, invisible on screen: Cmd+Shift+1/2/3 switch to the 1st/2nd/3rd person in DEMO_ACCOUNTS.
async function switchTo(label) {
  const a = ACCOUNTS.find((x) => x.label === label);
  if (!a) return null;
  account = a;
  brain.useAccount(a.user, a.password);
  silence();
  issue = null;
  lastQuestions = "";
  send("mascot:check", { ok: true });
  await brain.warmUp();
  const me = brain.whoAmI();
  log("switched to", a.label, me ? `(${me.name})` : "(sign-in failed)");
  pollQuestions();
  if (lastMailText) checkWriting(lastMailText, "Mail");
  send("mascot:switched", a.label);
  return { label: a.label, name: me ? me.name : null };
}

let lastQuestions = "";
async function pollQuestions() {
  if (!online) return;
  try {
    const qs = await brain.questionsForMe();
    const key = qs.map((q) => q.id).join("|");
    if (key !== lastQuestions) {
      lastQuestions = key;
      // Stage names for the demo accounts ("Ilke" instead of the demo persona's name).
      const byAccount = (q) => ({ ...q, fromName: (ACCOUNTS.find((a) => a.user === q.from) || {}).label || q.fromName });
      send("mascot:questions", stageObj(qs.map(byAccount)));
    }
  } catch {
    // Try again on the next tick.
  }
}
setInterval(pollQuestions, 4000);

ipcMain.handle("mascot:answer-question", async (event, id, answer) => {
  if (!fromMascot(event) || !isText(id, 300) || !["correct", "wrong", "not_mine"].includes(answer)) return { ok: false };
  try {
    await brain.answerQuestion(id, answer);
    log("answered question", id, answer);
    lastQuestions = "";
    pollQuestions();
    return { ok: true };
  } catch {
    return { ok: false };
  }
});

// "See in Company brain": the same question in the web app, in the browser.
ipcMain.on("mascot:open-brain", (event, question, clientName) => {
  if (!fromMascot(event) || (question && !isText(question, 500))) return;
  const url = brain.webLink(question || "", typeof clientName === "string" ? clientName : null);
  if (url.startsWith(brain.BRAIN_URL)) shell.openExternal(url);
});

ipcMain.on("listener:segment", (event, buffer, mime) => {
  if (!fromListener(event) || !(buffer instanceof ArrayBuffer) || buffer.byteLength > MAX_SEGMENT) return;
  if (!/^audio\/webm/.test(String(mime))) return;
  onSegment(buffer, mime);
});

ipcMain.on("listener:error", (event, message) => {
  if (!fromListener(event)) return;
  log("listener error:", message);
  send("mascot:heard", { error: String(message).slice(0, 120) });
});

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock.hide();
  // Only the hidden meeting listener may use the microphone.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) =>
    callback(permission === "media" && Boolean(listener) && wc === listener.webContents),
  );
  session.defaultSession.setPermissionCheckHandler((wc, permission) => permission === "media" && Boolean(listener) && wc === listener.webContents);
  createMascot();
  brain.warmUp();
  loadStageNames();
  globalShortcut.register("CommandOrControl+Shift+M", () => send("mascot:toggle-ask"));
  globalShortcut.register("CommandOrControl+Shift+E", openCompose);
  globalShortcut.register("CommandOrControl+Shift+L", () => setOnline(!online));
  globalShortcut.register("CommandOrControl+Shift+Space", toggleTalk);
  ACCOUNTS.slice(0, 3).forEach((a, i) => globalShortcut.register(`CommandOrControl+Shift+${i + 1}`, () => switchTo(a.label)));
  // Demo only (no Teams on this machine): force the meeting setting on and off. Normally it is always automatic.
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    contextMode = contextMode === "meeting" ? "auto" : "meeting";
    updateContext();
  });
  // Close the conversation window after 30 s of quiet.
  let wasTalking = false;
  setInterval(() => {
    const now = inConversation();
    if (wasTalking && !now) send("mascot:talk", false);
    wasTalking = now;
  }, 1000);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  watcher.stop();
});
app.on("window-all-closed", () => {});

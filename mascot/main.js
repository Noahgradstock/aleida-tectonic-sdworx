// Company brain mascot: an always-on-top blob that watches two settings, email and meetings.
const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, screen, session, systemPreferences } = require("electron");
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
const MEETING_APPS = ["Microsoft Teams", "Microsoft Teams (work or school)", "Teams", "zoom.us", "FaceTime", "Webex", "Slack"];
const MEETING_LINGER_MS = 2 * 60 * 1000;
let contextMode = "auto"; // auto | email | meeting
let activeContext = "email";
let frontApp = "";
let lastMeetingSeen = 0;
let talkMode = false; // on: always listening for "Hey SD Worx"; off: mic only in meetings

function updateContext() {
  if (MEETING_APPS.includes(frontApp)) lastMeetingSeen = Date.now();
  const next =
    contextMode !== "auto" ? contextMode : Date.now() - lastMeetingSeen < MEETING_LINGER_MS ? "meeting" : "email";
  if (next !== activeContext) {
    activeContext = next;
    log("context:", next, `(${frontApp})`);
  }
  const wantMic = online && (activeContext === "meeting" || talkMode);
  if (wantMic) startMeeting();
  else if (listener) stopMeeting();
  send("mascot:context", { context: activeContext, mode: contextMode, app: frontApp, talk: talkMode });
}

// The current warning stays until the same place (Mail, the meeting, the demo email) says it is fixed.
let issue = null;
let lastMailText = "";
let offerUntil = 0; // after "Want me to fix that?", a "yes" fixes the email

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
    result = await brain.check(text);
  } catch {
    result = { ok: true };
  }
  log("check", where, result.ok ? "ok" : `WRONG ${result.said} (trusted ${result.value})`, "| issue:", issue ? `${issue.where} ${issue.said}` : "none");
  if (!result.ok) {
    const same = issue && issue.where === where && issue.said === result.said && issue.key === result.key;
    issue = { ...result, where };
    if (!same) {
      send("mascot:check", issue);
      conversation.rememberWarning(issue);
      if (talkMode && where === "Mail") {
        offerUntil = Date.now() + 60000;
        say(`${conversation.speakable(result.said)} looks off. Want me to fix your email?`);
      }
    }
    return;
  }
  if (issue && issue.where !== where) return; // something else is still wrong
  issue = null;
  send("mascot:check", { ok: true });
}

const watcher = createWatcher(
  (appName, text) => {
    log("writing in", appName, `(${text.length} chars)`);
    if (appName === "Mail") lastMailText = text;
    checkWriting(text, appName);
  },
  (error) => {
    log("watcher error:", error);
    send("mascot:heard", { error: "Allow access to Mail in System Settings → Privacy & Security (Automation and Accessibility)" });
  },
  (() => {
    let lastLine = "";
    return (r) => {
      if (r.app && !["Electron", "Company brain"].includes(r.app) && r.app !== frontApp) {
        frontApp = r.app;
        updateContext();
      }
      const line = r.error ? `error: ${r.error}` : `${r.app} role=${r.role || "-"} chars=${(r.text || "").length}`;
      if (line !== lastLine) log("watch:", line);
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

async function say(text) {
  const audio = await voice.speak(text);
  const seconds = audio ? (audio.length * 0.75 * 8) / 32000 : text.length * 0.07;
  deafUntil = Date.now() + seconds * 1000 + 700;
  send("mascot:speak", { text, audio });
}

async function answerAloud(question) {
  log("question:", question);
  if (FIX_COMMAND.test(question) || (Date.now() < offerUntil && YES.test(question))) return fixMail(true);
  send("mascot:thinking");
  let r;
  try {
    r = await conversation.converse(question);
  } catch {
    r = { text: "Sorry, I can't reach the brain right now." };
  }
  log("reply:", r.text);
  send("mascot:answer", r);
  await say(conversation.speakable(r.text));
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


  if ((Date.now() < offerUntil && YES.test(text)) || (talkMode && FIX_COMMAND.test(text) && /\b(e-?mail|mail)\b/i.test(text))) {
    return fixMail(true);
  }
  const wake = text.match(WAKE);
  if (wake) {
    const question = wake[1].trim();
    if (question.length > 6) return answerAloud(question);
    waitingForQuestion = true;
    return send("mascot:wake");
  }
  if (waitingForQuestion) {
    waitingForQuestion = false;
    return answerAloud(text);
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
    talkMode = false;
  }
  send("mascot:online", on);
  updateContext();
}
function toggleTalk() {
  talkMode = !talkMode;
  if (talkMode && !online) setOnline(true);
  log("talk mode:", talkMode);
  updateContext();
  send("mascot:talk", talkMode);
}

ipcMain.on("mascot:toggle-talk", (event) => fromMascot(event) && toggleTalk());

ipcMain.on("mascot:set-context", (event, mode) => {
  if (!fromMascot(event) || !["auto", "email", "meeting"].includes(mode)) return;
  contextMode = mode;
  if (mode === "meeting") lastMeetingSeen = 0;
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
    return await conversation.converse(question);
  } catch {
    return { text: "The brain is not reachable right now." };
  }
});

ipcMain.on("compose:changed", (event, text) => {
  if (fromCompose(event) && typeof text === "string") checkWriting(text.slice(0, 4000), "email");
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
  globalShortcut.register("CommandOrControl+Shift+M", () => send("mascot:toggle-ask"));
  globalShortcut.register("CommandOrControl+Shift+E", openCompose);
  globalShortcut.register("CommandOrControl+Shift+L", () => setOnline(!online));
  globalShortcut.register("CommandOrControl+Shift+Space", toggleTalk);
  // Demo only (no Teams on this machine): force the meeting setting on and off. Normally it is always automatic.
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    contextMode = contextMode === "meeting" ? "auto" : "meeting";
    if (contextMode === "meeting") lastMeetingSeen = 0;
    updateContext();
  });
  setInterval(() => online && updateContext(), 5000); // let the meeting setting expire
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  watcher.stop();
});
app.on("window-all-closed", () => {});

// Company brain mascot: an always-on-top blob in the corner of the screen, plus a demo email window.
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const path = require("node:path");
const brain = require("./brain");

const SIZE = { width: 360, height: 460 };
const SECURE = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
};
let mascot;
let compose;

function lockDown(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
}

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
  // Clicks pass through the transparent area; the page turns them back on over the blob and the bubble.
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

const isText = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;
const fromMascot = (event) => mascot && event.sender === mascot.webContents;
const fromCompose = (event) => compose && !compose.isDestroyed() && event.sender === compose.webContents;

ipcMain.on("mascot:interactive", (event, on) => {
  if (fromMascot(event)) mascot.setIgnoreMouseEvents(!on, { forward: true });
});

ipcMain.on("mascot:move", (event, dx, dy) => {
  if (!fromMascot(event) || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
  const [x, y] = mascot.getPosition();
  mascot.setPosition(Math.round(x + dx), Math.round(y + dy));
});

ipcMain.on("mascot:open-compose", (event) => {
  if (fromMascot(event)) openCompose();
});

ipcMain.handle("brain:ask", async (event, question) => {
  if (!fromMascot(event) || !isText(question, 500)) return { error: "Ask a short question." };
  try {
    return await brain.ask(question);
  } catch {
    return { error: "The brain is not reachable right now." };
  }
});

// The email window reports its text; the mascot reacts.
ipcMain.on("compose:changed", async (event, text) => {
  if (!fromCompose(event) || typeof text !== "string") return;
  if (!text.trim()) return mascot.webContents.send("mascot:check", { ok: true });
  mascot.webContents.send("mascot:thinking");
  try {
    mascot.webContents.send("mascot:check", await brain.check(text));
  } catch {
    mascot.webContents.send("mascot:check", { ok: true });
  }
});

ipcMain.on("mascot:fix", (event, from, to) => {
  if (!fromMascot(event) || !isText(from, 40) || !isText(to, 40)) return;
  if (compose && !compose.isDestroyed()) compose.webContents.send("compose:replace", from, to);
});

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock.hide();
  createMascot();
  globalShortcut.register("CommandOrControl+Shift+M", () => mascot.webContents.send("mascot:toggle-ask"));
  globalShortcut.register("CommandOrControl+Shift+E", openCompose);
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => {});

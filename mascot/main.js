// Company brain mascot: a small, always-on-top blob that lives in the corner of the screen.
const { app, BrowserWindow, globalShortcut, screen } = require("electron");
const path = require("node:path");

const SIZE = { width: 220, height: 240 };
let win;

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    ...SIZE,
    x: workArea.x + workArea.width - SIZE.width - 24,
    y: workArea.y + workArea.height - SIZE.height - 24,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, "index.html"));

  // Never open other pages or windows inside the mascot.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
}

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock.hide();
  createWindow();

  // Demo shortcut: cycle calm → thinking → warning.
  globalShortcut.register("CommandOrControl+Shift+M", () => win?.webContents.send("mascot:cycle"));
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => app.quit());

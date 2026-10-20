// The only bridge between the mascot page and Electron. No Node APIs are exposed.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mascot", {
  ask: (question) => ipcRenderer.invoke("brain:ask", String(question)),
  interactive: (on) => ipcRenderer.send("mascot:interactive", Boolean(on)),
  move: (dx, dy) => ipcRenderer.send("mascot:move", Number(dx), Number(dy)),
  openCompose: () => ipcRenderer.send("mascot:open-compose"),
  fix: (from, to) => ipcRenderer.send("mascot:fix", String(from), String(to)),
  onToggleAsk: (cb) => ipcRenderer.on("mascot:toggle-ask", () => cb()),
  onThinking: (cb) => ipcRenderer.on("mascot:thinking", () => cb()),
  onCheck: (cb) => ipcRenderer.on("mascot:check", (_e, result) => cb(result)),
});

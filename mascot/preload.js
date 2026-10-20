// The only bridge between the mascot page and Electron. No Node APIs are exposed.
const { contextBridge, ipcRenderer } = require("electron");

const on = (channel) => (cb) => ipcRenderer.on(channel, (_e, data) => cb(data));

contextBridge.exposeInMainWorld("mascot", {
  ask: (question) => ipcRenderer.invoke("brain:ask", String(question)),
  interactive: (enabled) => ipcRenderer.send("mascot:interactive", Boolean(enabled)),
  move: (dx, dy) => ipcRenderer.send("mascot:move", Number(dx), Number(dy)),
  openCompose: () => ipcRenderer.send("mascot:open-compose"),
  setMode: (mode, enabled) => ipcRenderer.send("mascot:set-mode", String(mode), Boolean(enabled)),
  fix: (from, to) => ipcRenderer.send("mascot:fix", String(from), String(to)),
  onToggleAsk: on("mascot:toggle-ask"),
  onThinking: on("mascot:thinking"),
  onCheck: on("mascot:check"),
  onMeeting: on("mascot:meeting"),
  onHeard: on("mascot:heard"),
  onWake: on("mascot:wake"),
  onAnswer: on("mascot:answer"),
  onSpeak: on("mascot:speak"),
});

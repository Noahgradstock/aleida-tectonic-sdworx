// The only bridge between the mascot page and Electron. No Node APIs are exposed.
const { contextBridge, ipcRenderer } = require("electron");

const on = (channel) => (cb) => ipcRenderer.on(channel, (_e, data) => cb(data));

contextBridge.exposeInMainWorld("mascot", {
  ask: (question) => ipcRenderer.invoke("brain:ask", String(question)),
  interactive: (enabled) => ipcRenderer.send("mascot:interactive", Boolean(enabled)),
  move: (dx, dy) => ipcRenderer.send("mascot:move", Number(dx), Number(dy)),
  openCompose: () => ipcRenderer.send("mascot:open-compose"),
  setOnline: (enabled) => ipcRenderer.send("mascot:set-online", Boolean(enabled)),
  fix: (from, to) => ipcRenderer.send("mascot:fix", String(from), String(to)),
  toggleTalk: () => ipcRenderer.send("mascot:toggle-talk"),
  setContext: (mode) => ipcRenderer.send("mascot:set-context", String(mode)),
  fixMail: () => ipcRenderer.send("mascot:fix-mail"),
  onFixed: on("mascot:fixed"),
  onSilence: on("mascot:silence"),
  copy: (text) => ipcRenderer.send("mascot:copy", String(text)),
  onToggleAsk: on("mascot:toggle-ask"),
  onThinking: on("mascot:thinking"),
  onCheck: on("mascot:check"),
  onOnline: on("mascot:online"),
  onContext: on("mascot:context"),
  onTalk: on("mascot:talk"),
  onHeard: on("mascot:heard"),
  onWake: on("mascot:wake"),
  onAnswer: on("mascot:answer"),
  onSpeak: on("mascot:speak"),
});

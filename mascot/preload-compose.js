// Bridge for the demo email window: it reports its text and accepts value fixes.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("compose", {
  changed: (text) => ipcRenderer.send("compose:changed", String(text)),
  onReplace: (cb) => ipcRenderer.on("compose:replace", (_e, from, to) => cb(from, to)),
});

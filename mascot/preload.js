// The only bridge between the mascot page and Electron. No Node APIs are exposed.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mascot", {
  onCycle: (callback) => ipcRenderer.on("mascot:cycle", () => callback()),
});

// Bridge for the hidden meeting listener: it can only hand over audio segments and report errors.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("listener", {
  segment: (buffer, mime) => ipcRenderer.send("listener:segment", buffer, String(mime)),
  error: (message) => ipcRenderer.send("listener:error", String(message)),
});

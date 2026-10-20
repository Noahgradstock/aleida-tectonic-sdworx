// Opt-in: reads the text field you are typing in, in the app in front (Mail, Outlook, Teams chat).
// Uses macOS Accessibility, so macOS asks once for permission. Nothing is stored.
const { execFile } = require("node:child_process");

const SCRIPT = `
tell application "System Events"
  set p to first application process whose frontmost is true
  set n to name of p
  set v to ""
  try
    set v to value of attribute "AXValue" of (value of attribute "AXFocusedUIElement" of p)
  end try
end tell
return n & "<<SEP>>" & v`;

function readFocused() {
  return new Promise((resolve) => {
    execFile("osascript", ["-e", SCRIPT], { timeout: 1500, maxBuffer: 64 * 1024 }, (err, stdout) => {
      if (err) return resolve(null);
      const [app, ...rest] = stdout.split("<<SEP>>");
      resolve({ app: app.trim(), text: rest.join("<<SEP>>").trim().slice(0, 4000) });
    });
  });
}

function createWatcher(onText, ignoreApps = ["Electron", "Company brain"]) {
  let timer = null;
  let last = "";
  return {
    start() {
      if (timer || process.platform !== "darwin") return;
      timer = setInterval(async () => {
        const r = await readFocused();
        if (!r || !r.text || ignoreApps.includes(r.app) || r.text === last) return;
        last = r.text;
        onText(r.app, r.text);
      }, 2000);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      last = "";
    },
  };
}

module.exports = { createWatcher };

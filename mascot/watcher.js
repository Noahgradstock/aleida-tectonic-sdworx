// Online only: reads the email you are writing in Apple Mail (or the text field in front, in other apps).
// macOS asks once for permission. Nothing is stored; only sentences that state a value are checked.
const { execFile } = require("node:child_process");

// Apple Mail: the open compose windows are "outgoing messages"; take the newest one.
const MAIL = `
tell application "System Events" to set front to name of first application process whose frontmost is true
if front is not "Mail" then return front & "<<SEP>>"
tell application "Mail"
  if (count of outgoing messages) is 0 then return "Mail<<SEP>>"
  set m to item -1 of outgoing messages
  return "Mail<<SEP>>" & (subject of m) & linefeed & (content of m)
end tell`;

// Any other app: the focused text field through Accessibility.
const FOCUSED = `
tell application "System Events"
  set p to first application process whose frontmost is true
  set n to name of p
  set v to ""
  try
    set v to value of attribute "AXValue" of (value of attribute "AXFocusedUIElement" of p)
  end try
end tell
return n & "<<SEP>>" & v`;

function run(script) {
  return new Promise((resolve) => {
    execFile("osascript", ["-e", script], { timeout: 2500, maxBuffer: 256 * 1024 }, (err, stdout, stderr) => {
      resolve(err ? { error: String(stderr || err.message).trim() } : { out: stdout });
    });
  });
}

const split = (out) => {
  const [app, ...rest] = out.split("<<SEP>>");
  return { app: app.trim(), text: rest.join("<<SEP>>").trim().slice(0, 4000) };
};

async function readWriting() {
  const mail = await run(MAIL);
  if (mail.out) {
    const r = split(mail.out);
    if (r.app === "Mail" && r.text) return r;
    if (r.app !== "Mail") {
      const any = await run(FOCUSED);
      return any.out ? split(any.out) : { error: any.error };
    }
  }
  const any = await run(FOCUSED);
  if (any.out) return split(any.out);
  return { error: mail.error || any.error };
}

function createWatcher(onText, onError, ignoreApps = ["Electron", "Company brain"]) {
  let timer = null;
  let last = "";
  let reported = false;
  return {
    start() {
      if (timer || process.platform !== "darwin") return;
      timer = setInterval(async () => {
        const r = await readWriting();
        if (r.error) {
          if (!reported) onError(r.error);
          reported = true;
          return;
        }
        reported = false;
        if (!r.text || ignoreApps.includes(r.app) || r.text === last) return;
        last = r.text;
        onText(r.app, r.text);
      }, 1500);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      last = "";
    },
  };
}

module.exports = { createWatcher };

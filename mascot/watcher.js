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
  set r to ""
  set w to ""
  try
    set w to name of front window of p
  end try
  try
    set f to value of attribute "AXFocusedUIElement" of p
    set r to role of f
    try
      set v to value of attribute "AXValue" of f
    end try
    if v is missing value or v is "" then
      set parts to {}
      repeat with a in UI elements of f
        if role of a is "AXStaticText" then
          set end of parts to (value of a as text)
        else
          repeat with b in UI elements of a
            if role of b is "AXStaticText" then
              set end of parts to (value of b as text)
            else
              repeat with c in UI elements of b
                if role of c is "AXStaticText" then set end of parts to (value of c as text)
              end repeat
            end if
          end repeat
        end if
      end repeat
      set AppleScript's text item delimiters to linefeed
      set v to parts as text
    end if
  end try
end tell
return n & "<<SEP>>" & v & "<<ROLE>>" & r & "<<WIN>>" & w`;

function run(script) {
  return new Promise((resolve) => {
    execFile("osascript", ["-e", script], { timeout: 2500, maxBuffer: 256 * 1024 }, (err, stdout, stderr) => {
      resolve(err ? { error: String(stderr || err.message).trim() } : { out: stdout });
    });
  });
}

const split = (out) => {
  const [rest0, win = ""] = out.split("<<WIN>>");
  const [head, role = ""] = rest0.split("<<ROLE>>");
  const [app, ...rest] = head.split("<<SEP>>");
  return { app: app.trim(), role: role.trim(), window: win.trim(), text: rest.join("<<SEP>>").trim().slice(0, 4000) };
};

async function readWriting() {
  const first = await run(FOCUSED);
  if (first.out) {
    const r = split(first.out);
    if (r.text || r.app !== "Mail") return r;
  }
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

function createWatcher(onText, onError, onDebug = () => {}, ignoreApps = ["Electron", "Company brain"]) {
  let timer = null;
  let last = "";
  let pending = "";
  let reported = false;
  return {
    start() {
      if (timer || process.platform !== "darwin") return;
      timer = setInterval(async () => {
        const r = await readWriting();
        onDebug(r);
        if (r.error) {
          if (!reported) onError(r.error);
          reported = true;
          return;
        }
        reported = false;
        if (!r.text || ignoreApps.includes(r.app) || r.text === last) return;
        // Wait until the text is the same on two reads in a row, so half-typed numbers are not checked.
        if (r.text !== pending) {
          pending = r.text;
          return;
        }
        last = r.text;
        onText(r.app, r.text);
      }, 900);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      last = "";
      pending = "";
    },
  };
}

module.exports = { createWatcher };

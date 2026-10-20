// Online only: reads the email you are writing in Apple Mail (or the text field in front, in other apps).
// macOS asks once for permission. Nothing is stored; only sentences that state a value are checked.
const { execFile } = require("node:child_process");

// One script for every read. In Mail it reads the body of the compose window in front by its fixed path
// (group > group > scroll area > web area), wherever the cursor is. In other apps: the focused text field.
const READ = `
tell application "System Events"
  set n to name of first application process whose frontmost is true
  set p to application process n
  set w to ""
  set v to ""
  set r to ""
  try
    set w to name of window 1 of p
  end try
  if n is "Mail" then
    -- The compose window you are in. Only if Mail cannot say which one, the frontmost window, then the first
    -- compose window. Never alternate between drafts (that would keep the text from settling).
    set cands to {}
    try
      set fw to value of attribute "AXFocusedWindow" of p
      if fw is not missing value then set end of cands to fw
    end try
    if (count of cands) is 0 then
      try
        set cands to (windows of p)
      end try
    end if
    repeat with cw in cands
      try
        set f to UI element 1 of scroll area 1 of group 1 of group 1 of cw
        set r to role of f
        set w to name of cw
        exit repeat
      end try
    end repeat
  else
    try
      set f to value of attribute "AXFocusedUIElement" of p
      set r to role of f
      try
        set v to value of attribute "AXValue" of f
      end try
    end try
  end if
  if v is missing value then set v to ""
  if r is "AXWebArea" and v is "" then
    set parts to {}
    try
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
    end try
    set AppleScript's text item delimiters to linefeed
    set v to parts as text
  end if
end tell
return n & "<<SEP>>" & v & "<<ROLE>>" & r & "<<WIN>>" & w`;

function run(script) {
  return new Promise((resolve) => {
    execFile("osascript", ["-e", script], { timeout: 4000, maxBuffer: 256 * 1024 }, (err, stdout, stderr) => {
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
  const r = await run(READ);
  return r.out ? split(r.out) : { error: r.error };
}

// Only a real permission problem should ask the user to change settings.
const isPermissionError = (e) => /-1743|-25211|not allowed|assistive|inte behörig|tillåtelse/i.test(e || "");

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
          if (!reported && isPermissionError(r.error)) onError(r.error);
          reported = true;
          return;
        }
        reported = false;
        if (ignoreApps.includes(r.app)) return;
        // In Mail only the message body counts (not To, Subject or the inbox); an empty body counts too.
        if (r.app === "Mail" && r.role !== "AXWebArea") return;
        if (!r.text && r.role !== "AXWebArea") return;
        const key = `${r.app}|${r.text}`;
        if (key === last) return;
        // Wait until the text is the same on two reads in a row, so half-typed numbers are not checked.
        if (key !== pending) {
          pending = key;
          return;
        }
        last = key;
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

// Rewrites the email you are writing in Apple Mail: select the body, paste the corrected text, restore the clipboard.
// Uses the same macOS Accessibility permission as reading. Only runs when you ask for it.
const { execFile } = require("node:child_process");
const { clipboard } = require("electron");

// Only pastes when Mail is really in front and the cursor is in the body of the draft; otherwise does nothing.
const SCRIPT = `
tell application "Mail" to activate
set ok to false
repeat 15 times
  tell application "System Events" to set n to name of first application process whose frontmost is true
  if n is "Mail" then
    set ok to true
    exit repeat
  end if
  delay 0.1
end repeat
if not ok then return "notfront"
tell application "System Events"
  tell application process "Mail"
    set fw to missing value
    try
      set fw to value of attribute "AXFocusedWindow"
    end try
    if fw is missing value then return "nofocus"
    try
      set body to UI element 1 of scroll area 1 of group 1 of group 1 of fw
    on error
      return "nofocus"
    end try
    if role of body is not "AXWebArea" then return "nofocus"
    set value of attribute "AXFocused" of body to true
  end tell
  delay 0.15
  tell application "System Events" to set n to name of first application process whose frontmost is true
  if n is not "Mail" then return "notfront"
  keystroke "a" using command down
  delay 0.08
  keystroke "v" using command down
end tell
return "ok"`;

function run() {
  return new Promise((resolve) => {
    execFile("osascript", ["-e", SCRIPT], { timeout: 5000 }, (err, stdout) => resolve(err ? "error" : stdout.trim()));
  });
}

async function replaceMailBody(text) {
  const saved = clipboard.readText();
  clipboard.writeText(text);
  const result = await run();
  setTimeout(() => clipboard.writeText(saved), 800);
  if (result === "ok") return { ok: true };
  return { ok: false, reason: result === "nofocus" ? "Open the email you are writing first." : result === "notfront" ? "Bring Mail to the front and try again." : "I couldn't edit Mail." };
}

module.exports = { replaceMailBody };

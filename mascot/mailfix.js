// Rewrites the email you are writing in Apple Mail: select the body, paste the corrected text, restore the clipboard.
// Uses the same macOS Accessibility permission as reading. Only runs when you ask for it.
const { execFile } = require("node:child_process");
const { clipboard } = require("electron");

const SCRIPT = `
tell application "Mail" to activate
delay 0.25
tell application "System Events"
  tell process "Mail"
    set f to value of attribute "AXFocusedUIElement"
    if role of f is not "AXWebArea" then return "nofocus"
  end tell
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
  return result === "ok" ? { ok: true } : { ok: false, reason: result === "nofocus" ? "Click into the email text first." : "I couldn't edit Mail." };
}

module.exports = { replaceMailBody };

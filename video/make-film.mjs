// One-minute silent demo film for the pitch (no titles, no music: we talk over it).
// A meeting with the mascot -> the brain learns by itself -> Ilke confirms once -> Noah's email is corrected
// by the mascot -> the answer, why, and whether it will hold. Every value comes from the running app.
//   PREVIEW=1 node make-film.mjs -> key frames in out/keys/
//   node make-film.mjs           -> out/film-silent.mp4
// Needs the app running locally (npm run dev -- -p 3200) with demo accounts jan, sofie and tom.
// Passwords come from DEMO_PASSWORDS="jan:...,sofie:...,tom:..." (never committed).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { createRequire } from "node:module";
import { request } from "playwright";

const BASE = process.env.BASE || "http://localhost:3200";
const FPS = 25, W = 1440, H = 810, DSF = 4 / 3;
const PREVIEW = !!process.env.PREVIEW;
const END = 60;
const MASCOT_DIR = path.resolve("../mascot");
fs.mkdirSync("out/keys", { recursive: true });

const PASSWORDS = Object.fromEntries((process.env.DEMO_PASSWORDS || "").split(",").filter(Boolean).map((p) => p.split(":")));
const TRANSCRIPT =
  "Tom Claes: Students can work 600 hours a year, right?\nJan Wouters: For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.";
const MAIL = "Dear HR team,\n\nGood news for next year: at Brouwerij De Kroon, full-time employees get 20 holiday days.\n\nKind regards,\nNoah";

// ---------- browser ----------
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
await context.addInitScript(() => {
  // On screen, the demo personas carry the names of the people on stage (like the mascot's stage names).
  const NAMES = [[/Jan Wouters/g, "Ilke"], [/Tom Claes/g, "Isak"], [/Sofie Maes/g, "Noah"], [/\bJan\b(?!\s*\d)(?!uary)/g, "Ilke"], [/\bTom\b/g, "Isak"], [/\bSofie\b/g, "Noah"]];
  const INITIALS = { JW: "IS", TC: "IA", SM: "NG" };
  const relabel = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode?.nodeName || "") || n.parentNode?.closest?.("svg")) continue; // charts say "Jan 2027"
      let v = n.nodeValue;
      if (INITIALS[v.trim()]) v = v.replace(v.trim(), INITIALS[v.trim()]);
      for (const [re, to] of NAMES) v = v.replace(re, to);
      if (v !== n.nodeValue) n.nodeValue = v;
    }
  };
  if (location.pathname !== "/__stage") {
    const start = () => {
      relabel(document.body);
      new MutationObserver(() => relabel(document.body)).observe(document.body, { subtree: true, childList: true, characterData: true });
    };
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
  }
  // The mascot page normally talks to Electron. Here a stub lets the film send it the same events.
  if (location.pathname.startsWith("/__mascot/")) {
    const subs = {};
    const on = (ch) => (cb) => (subs[ch] = cb);
    const noop = () => {};
    window.__emit = (ch, data) => subs[ch] && subs[ch](data);
    window.mascot = new Proxy(
      { accounts: async () => null, ask: async () => ({}), share: async () => ({}), answerQuestion: async () => ({ ok: true }),
        fix: (from, to) => window.parent.__onFix && window.parent.__onFix(from, to) },
      { get: (t, k) => (k in t ? t[k] : String(k).startsWith("on") ? on("mascot:" + String(k).slice(2).toLowerCase()) : noop) },
    );
    return;
  }
  if (location.pathname === "/__stage" || location.pathname.startsWith("/__mascot/")) return;
  const setup = () => {
    if (!document.body || document.getElementById("__cur")) return;
    const st = document.createElement("style");
    st.textContent = `
      nextjs-portal, [data-nextjs-toast], [data-next-badge-root], [data-nextjs-dev-tools-button] { display:none !important; }
      html { scroll-behavior:auto !important; }
      #__cur { position:fixed; left:0; top:0; z-index:2147483647; pointer-events:none; width:30px; height:30px; }
      #__ring { position:fixed; z-index:2147483645; pointer-events:none; border:3px solid #1f5cff; border-radius:50%; opacity:0; }
      .__hl { outline:3px solid #1f5cff !important; outline-offset:5px !important; border-radius:12px;
        box-shadow:0 0 0 12px rgba(31,92,255,.14), 0 0 40px rgba(31,92,255,.35) !important; }`;
    document.head.appendChild(st);
    const cur = document.createElement("div");
    cur.id = "__cur";
    cur.style.display = "none";
    cur.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="#161616" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const ring = document.createElement("div");
    ring.id = "__ring";
    document.body.append(cur, ring);
  };
  window.__frame = (f) => {
    setup();
    const cur = document.getElementById("__cur");
    if (!cur) return;
    cur.style.display = f.cx == null ? "none" : "block";
    if (f.cx != null) cur.style.transform = `translate(${f.cx - 5}px, ${f.cy - 3}px)`;
    const ring = document.getElementById("__ring");
    if (f.ring) {
      const r = 10 + 30 * f.ring.p;
      Object.assign(ring.style, { left: f.ring.x - r + "px", top: f.ring.y - r + "px", width: 2 * r + "px", height: 2 * r + "px", opacity: String(1 - f.ring.p) });
    } else ring.style.opacity = "0";
  };
});
// The app forbids framing (clickjacking protection). Only in this recording browser, let the stage frame it.
await context.route(`${BASE}/**`, async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname === "/__stage") return route.fulfill({ contentType: "text/html", body: fs.readFileSync("stage.html", "utf8") });
  if (url.pathname === "/__meeting") return route.fulfill({ contentType: "text/html", body: fs.readFileSync("meeting.html", "utf8") });
  if (url.pathname === "/__email") return route.fulfill({ contentType: "text/html", body: fs.readFileSync("email.html", "utf8") });
  if (url.pathname.startsWith("/__mascot/")) {
    const file = path.join(MASCOT_DIR, path.basename(url.pathname));
    const type = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }[path.extname(file)] || "application/octet-stream";
    return route.fulfill({ contentType: type, body: fs.readFileSync(file) });
  }
  if (route.request().resourceType() !== "document") return route.fallback();
  const res = await route.fetch();
  const headers = { ...res.headers() };
  delete headers["x-frame-options"];
  delete headers["content-security-policy"];
  await route.fulfill({ response: res, headers });
});

const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("pageerror:", String(e).slice(0, 300)));
async function signIn(user) {
  await page.request.post(BASE + "/api/auth/logout", { headers: { origin: BASE } }).catch(() => {});
  const r = await page.request.post(BASE + "/api/auth/login", { headers: { origin: BASE }, data: { username: user, password: PASSWORDS[user] } });
  if (!r.ok()) throw new Error(`sign-in as ${user} failed: ${r.status()}`);
}
await signIn("tom");
await context.clock.install({ time: new Date("2026-10-20T10:02:00+02:00") });
await page.goto(BASE + "/__stage");
await page.evaluate(() => document.fonts.ready);
let app = await (await page.$("#app")).contentFrame();
const meeting = () => app;
await app.locator("#m").waitFor();
await page.waitForTimeout(1500);
await context.clock.pauseAt(new Date("2026-10-20T10:02:30+02:00"));

const cdp = await context.newCDPSession(page);
let frame = 0;
const cursor = { x: null, y: null };
let ring = null;
const now = () => frame / FPS;
const ff = PREVIEW
  ? null
  : spawn(ffmpegPath, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium", "-movflags", "+faststart", "out/film-silent.mp4"], { stdio: ["pipe", "inherit", "inherit"] });

// CSS animations run on the wall clock, which is much slower than film time here. Step them by film time instead.
async function syncAnimations() {
  const t = now() * 1000;
  for (const f of page.frames()) {
    await f
      .evaluate((t) => {
        for (const a of document.getAnimations()) {
          if (a.__t0 == null) {
            a.__t0 = t - (a.currentTime || 0);
            a.pause();
          }
          a.currentTime = t - a.__t0;
        }
      }, t)
      .catch(() => {});
  }
}

async function shot() {
  const r = ring && frame - ring.f0 < 12 ? { x: ring.x, y: ring.y, p: (frame - ring.f0) / 12 } : null;
  await app.evaluate((f) => window.__frame && window.__frame(f), { cx: cursor.x, cy: cursor.y, ring: r }).catch(() => {});
  await syncAnimations();
  await page.evaluate((t) => window.__render(t), now());
  if (!PREVIEW) {
    const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: DSF } });
    if (!ff.stdin.write(Buffer.from(data, "base64"))) await new Promise((res) => ff.stdin.once("drain", res));
  }
  frame++;
  await context.clock.runFor(Math.round(1000 / FPS));
  if (frame % 250 === 0) console.log(`  ${now().toFixed(1)}s / ${END}s`);
}
async function until(x) {
  if (now() > x + 0.15) console.warn(`  late by ${(now() - x).toFixed(2)}s at ${x}`);
  while (now() < x) await shot();
}
async function key(name) {
  if (!PREVIEW) return;
  await syncAnimations();
  await page.evaluate((t) => window.__render(t), now());
  await page.screenshot({ path: `out/keys/${String(frame).padStart(4, "0")}-${name}.png` });
}

// ---------- helpers ----------
const cam = (to, t0, dur) => page.evaluate(([to, t0, dur]) => window.__cam(to, t0, dur), [to, t0, dur]);
const fade = (layer, from, to, t0, dur) => page.evaluate((a) => window.__fade(...a), [layer, from, to, t0, dur]);
const L = (sel) => app.locator(sel);
const FLAT = { rx: 0, ry: 0, y: 0 };
const WIDE = { px: 640, py: 378, sx: 720, sy: 412, z: 1.02, ...FLAT };
// Rect of an element in window coordinates (the browser bar is 36 px).
async function rectOf(loc) {
  const r = await loc.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  return { ...r, cx: r.x + r.w / 2, cy: r.y + r.h / 2 + 36 };
}
// Scroll the app so the element sits in the middle of the window (animated when sec > 0).
async function bring(loc, sec = 0.6) {
  const [from, to] = await loc.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const max = document.documentElement.scrollHeight - innerHeight;
    return [scrollY, Math.max(0, Math.min(max, scrollY + b.y + b.height / 2 - innerHeight / 2))];
  });
  if (Math.abs(to - from) < 2) return;
  const n = Math.max(1, Math.round(sec * FPS));
  for (let i = 1; i <= n; i++) {
    await app.evaluate((v) => window.scrollTo(0, v), from + (to - from) * ease(i / n));
    if (sec > 0) await shot();
  }
}
async function focus(loc, z, t0, dur, screen = { sx: 720, sy: 405 }) {
  const r = await rectOf(loc);
  await cam({ px: r.cx, py: r.cy, z, ...screen, ...FLAT }, t0, dur);
}
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
async function moveTo(loc, sec) {
  const r = await loc.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x + Math.min(b.width / 2, 50), y: b.y + b.height / 2 }; });
  const from = cursor.x == null ? { x: r.x + 160, y: r.y + 140 } : { ...cursor };
  const n = Math.max(1, Math.round(sec * FPS));
  for (let i = 1; i <= n; i++) {
    const k = ease(i / n);
    cursor.x = from.x + (r.x - from.x) * k;
    cursor.y = from.y + (r.y - from.y) * k;
    await shot();
  }
}
async function click(loc, sec = 0.5) {
  await moveTo(loc, sec);
  ring = { x: cursor.x, y: cursor.y, f0: frame };
  await loc.evaluate((el) => el.click());
}
async function type(loc, text, sec) {
  const n = Math.max(1, Math.round(sec * FPS));
  for (let i = 1; i <= n; i++) {
    await loc.fill(text.slice(0, Math.round((text.length * i) / n)));
    await shot();
  }
}
// Live caption: the words appear as they are spoken.
async function speak(who, text, sec) {
  const words = text.split(" ");
  const n = Math.max(1, Math.round(sec * FPS));
  for (let i = 1; i <= n; i++) {
    await meeting().evaluate(([w, t]) => window.__say(w, t), [who, words.slice(0, Math.ceil((words.length * i) / n)).join(" ")]);
    await shot();
  }
}
const mascot = (ch, data) => meeting().evaluate(([ch, d]) => window.__mascot(ch, d), [ch, data]);
// Switch the window to another page (and person) behind a short dip to black. Film time stops while it loads.
async function goTo(url, label, ready) {
  await fade("black", 0, 1, now(), 0.3);
  await until(now() + 0.32);
  cursor.x = cursor.y = null;
  await page.evaluate(([u, l]) => { document.getElementById("app").src = u; document.getElementById("url").textContent = l; }, [url, label]);
  await page.waitForTimeout(800);
  app = await (await page.$("#app")).contentFrame();
  // Keep the page's clock moving while it loads: the app waits on timers before it renders.
  for (let k = 0; ; k++) {
    if (await ready().then(() => true, () => false)) break;
    if (k > 60) {
      await page.screenshot({ path: "out/debug.png" });
      console.log("DOM:", await app.evaluate(() => ({ ta: document.querySelectorAll("textarea").length, len: document.body.innerHTML.length, text: document.body.innerText.slice(0, 300).replace(/\n/g, " | "), url: location.href, tas: [...document.querySelectorAll("textarea,input")].length, title: document.title, vis: document.visibilityState, w: innerWidth, h: innerHeight })));
      throw new Error("page did not render: " + url);
    }
    await context.clock.runFor(200);
  }
  await page.waitForTimeout(600);
  await app.evaluate(() => window.scrollTo(0, 0));
  await cam(WIDE, now(), 0.01);
  await fade("black", 1, 0, now(), 0.35);
}


// The mascot's own brain module (mascot/brain.js), signed in as Noah's demo account: its checks and fixes are the real ones.
process.env.BRAIN_URL = BASE;
process.env.BRAIN_USER = "sofie";
process.env.BRAIN_PASSWORD = PASSWORDS.sofie || "";
const brain = createRequire(import.meta.url)("../mascot/brain.js");
// The meeting tool's side: hands the transcript (with speaker names) to the brain's ingest route.
const meetingTool = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: BASE } });
if (!(await meetingTool.post("/api/auth/login", { data: { username: "tom", password: PASSWORDS.tom } })).ok()) throw new Error("meeting tool sign-in failed");

// Click an element inside the mascot (an iframe inside the current page), with the cursor.
async function clickMascot(sel, sec = 0.6) {
  const frameBox = await L("#m").evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y }; });
  const inner = app.frameLocator("#m").locator(sel);
  const r = await inner.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const to = { x: frameBox.x + r.x, y: frameBox.y + r.y };
  const from = cursor.x == null ? { x: to.x - 220, y: to.y + 160 } : { ...cursor };
  const n = Math.max(1, Math.round(sec * FPS));
  for (let i = 1; i <= n; i++) {
    const k = ease(i / n);
    cursor.x = from.x + (to.x - from.x) * k;
    cursor.y = from.y + (to.y - from.y) * k;
    await shot();
  }
  ring = { x: cursor.x, y: cursor.y, f0: frame };
  await inner.evaluate((el) => el.click());
}

// ================= 1. The meeting (0–16): silent until something is wrong =================
await mascot("mascot:online", true);
await mascot("mascot:context", { context: "meeting", mode: "auto", talk: false });
await cam({ px: 640, py: 378, sx: 720, sy: 430, z: 0.86, rx: 10, ry: -6, y: 40 }, 0, 0.01);
await fade("black", 1, 0, 0.2, 1.2);
await cam(WIDE, 0.2, 2.2);
await until(1.4);
await key("1-meeting");
const heardLine = "Students can work 600 hours a year, right?";
await speak("tom", heardLine, 2.6);
await until(4.4);
await mascot("mascot:thinking");
const correction = await brain.check(heardLine);
if (correction.ok) throw new Error("the mascot did not flag 600 hours");
await focus(L("#m"), 1.55, 4.6, 1.2, { sx: 900, sy: 360 });
await until(5.4);
await mascot("mascot:check", { ...correction, where: "meeting" });
await until(6.0);
await mascot("mascot:speak", { text: "Quick correction", audio: null });
await meeting().evaluate(() => window.__say(null));
await until(8.2);
await key("2-correction");
await until(9.8);
await mascot("mascot:check", { ok: true });
await cam(WIDE, 9.8, 1.2);
await until(10.4);
await focus(L("#cap"), 1.3, 11.4, 1.8, { sx: 760, sy: 500 });
await speak("jan", "For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.", 4.0);
await until(14.8);
await key("3-ilke");
await meeting().evaluate(() => { window.__say(null); window.__toast(true); });
await cam(WIDE, 14.8, 1.0);
await until(16.2);
await key("4-ended");

// ================= 2. The brain learns by itself; Ilke confirms once (16–28) =================
await signIn("jan");
await goTo("/loop", "company-brain · What changed today", () => app.getByRole("heading", { name: /What changed today/ }).waitFor({ timeout: 500 }));
await until(now() + 0.8);
{
  const r = await meetingTool.post("/api/brain/ingest", { data: { channel: "meeting", text: TRANSCRIPT, context: { country: "BE", pc: "200" } } });
  if (!r.ok()) throw new Error("ingest failed " + r.status());
}
const yes = app.getByRole("button", { name: /Looks right|That's right/ }).first();
while (!(await yes.isVisible())) await shot();
await until(now() + 0.6);
// Both statements arrived. Isak's guess goes nowhere (the law answers it); only Ilke's needs Ilke.
const feed = app.getByText(/Students can work 600 hours/).last().locator("xpath=ancestor::*[contains(., 'we agreed 22')][1]");
await bring(feed, 0.6);
await focus(feed, 1.05, now(), 1.0, { sx: 720, sy: 420 });
await until(now() + 3.0);
await key("5-heard");
await cam(WIDE, now(), 0.6);
await bring(yes, 0.5);
await focus(yes, 1.45, now(), 1.0, { sx: 760, sy: 600 });
await yes.evaluate((el) => el.parentElement?.parentElement?.classList.add("__hl"));
await until(now() + 1.8);
await key("6-ilke-confirm");
await click(yes, 0.6);
const confirmed = app.getByText(/confirmed it/).first();
while (!(await confirmed.isVisible())) await shot();
cursor.x = cursor.y = null;
const change = confirmed.locator("xpath=ancestor::*[contains(., '22 days')][1]");
await cam(WIDE, now(), 0.5);
await bring(change, 0.5);
await focus(change, 1.3, now(), 1.0, { sx: 720, sy: 430 });
await change.evaluate((el) => el.classList.add("__hl"));
await until(now() + 2.4);
await key("7-trusted");

// ================= 3. A week later: Noah writes to the client, the mascot steps in (28–42) =================
await goTo("/__email", "Mail · New message", () => app.locator("#m").waitFor({ timeout: 500 }));
await page.waitForTimeout(800);
await mascot("mascot:online", true);
await mascot("mascot:context", { context: "email", mode: "auto", talk: false });
await focus(L(".mail"), 1.12, now(), 0.8, { sx: 700, sy: 420 });
{
  const n = Math.round(3.4 * FPS);
  for (let i = 1; i <= n; i++) {
    await app.evaluate((t) => window.__type(t), MAIL.slice(0, Math.round((MAIL.length * i) / n)));
    await shot();
  }
}
await until(now() + 0.5);
await mascot("mascot:thinking");
brain.useAccount("sofie", PASSWORDS.sofie); // fresh caches: the answer changed since the meeting
const issue = await brain.check(MAIL);
if (issue.ok || issue.value !== "22 days") throw new Error("the mascot did not flag the email: " + JSON.stringify(issue));
await until(now() + 0.6);
await mascot("mascot:check", { ...issue, where: "email" });
await app.evaluate((w) => window.__mark(w, false), issue.said);
await cam({ px: 900, py: 400, z: 1.25, sx: 760, sy: 420, ...FLAT }, now(), 1.0);
await until(now() + 3.4);
await key("8-email-warning");
await clickMascot("#fix", 0.7);
const fixed = await brain.corrected(MAIL);
if (!fixed.text.includes("22 holiday days")) throw new Error("fix did not produce 22 days");
await until(now() + 0.3);
await mascot("mascot:fixed", { count: 1 });
cursor.x = cursor.y = null;
await cam({ px: 860, py: 420, z: 1.12, sx: 720, sy: 420, ...FLAT }, now(), 0.9);
await until(now() + 2.0);
await key("9-email-fixed");

// ================= 4. Why 22? The answer, who knows, and whether it will hold (42–60) =================
await signIn("sofie");
const link = new URL(brain.webLink(`${issue.label} for ${issue.client}`, issue.client)).search;
await goTo("/" + link, "company-brain · Ask", () => app.getByText("Skip to the answer").waitFor({ timeout: 500 }));
await until(now() + 1.6);
await app.getByText("Skip to the answer").evaluate((el) => el.click()).catch(() => {});
const answer = app.getByText("22 days", { exact: true }).first();
while (!(await answer.isVisible())) await shot();
await app.evaluate(() => window.scrollTo(0, 0));
const card = answer.locator("xpath=ancestor::div[.//*[contains(text(),'to confirm')]][1]");
await focus(card, 1.25, now(), 1.0, { sx: 720, sy: 430 });
await until(now() + 3.6);
await key("10-answer");
const hold = app.getByText("Will it hold?").first();
await cam(WIDE, now(), 0.5);
await bring(hold, 0.7);
await focus(hold.locator("xpath=.."), 1.25, now(), 1.0, { sx: 720, sy: 420 });
await until(now() + 3.0);
await key("11-hold");
const contact = app.getByText(/Contact/).filter({ hasText: "Ilke" }).first();
await cam(WIDE, now(), 0.5);
await bring(contact, 0.7);
await focus(contact.locator("xpath=ancestor::*[contains(., 'has left')][1]"), 1.2, now(), 1.0, { sx: 720, sy: 430 });
await until(now() + 3.2);
await key("12-who");
const endAt = Math.max(END, now() + 1.2);
await fade("black", 0, 1, endAt - 1.0, 1.0);
await until(endAt);

await browser.close();
if (PREVIEW) process.exit(0);
ff.stdin.end();
await new Promise((res) => ff.on("close", res));
console.log(`video done: ${frame} frames, ${(frame / FPS).toFixed(1)} s -> out/film-silent.mp4`);

// One-minute silent demo film for the pitch (no titles, no music: we talk over it).
// A team meeting with the mascot, then the real Company brain learning from it and answering a colleague.
//   PREVIEW=1 node make-film.mjs -> key frames in out/keys/
//   node make-film.mjs           -> out/film-silent.mp4
// Needs the app running locally (npm run dev -- -p 3200) with demo accounts jan, sofie and tom.
// Passwords come from DEMO_PASSWORDS="jan:...,sofie:...,tom:..." (never committed).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const BASE = process.env.BASE || "http://localhost:3200";
const FPS = 25, W = 1440, H = 810, DSF = 4 / 3;
const PREVIEW = !!process.env.PREVIEW;
const END = 60;
const MASCOT_DIR = path.resolve("../mascot");
fs.mkdirSync("out/keys", { recursive: true });

const PASSWORDS = Object.fromEntries((process.env.DEMO_PASSWORDS || "").split(",").filter(Boolean).map((p) => p.split(":")));
const TRANSCRIPT =
  "Tom Claes: Students can work 600 hours a year, right?\nJan Wouters: For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.";
const QUESTION = "How many holiday days do employees get at Brouwerij De Kroon?";

// ---------- browser ----------
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
await context.addInitScript(() => {
  // The mascot page normally talks to Electron. Here a stub lets the film send it the same events.
  if (location.pathname.startsWith("/__mascot/")) {
    const subs = {};
    const on = (ch) => (cb) => (subs[ch] = cb);
    const noop = () => {};
    window.__emit = (ch, data) => subs[ch] && subs[ch](data);
    window.mascot = new Proxy(
      { accounts: async () => null, ask: async () => ({}), share: async () => ({}), answerQuestion: async () => ({ ok: true }) },
      { get: (t, k) => (k in t ? t[k] : String(k).startsWith("on") ? on("mascot:" + String(k).slice(2).toLowerCase()) : noop) },
    );
    return;
  }
  if (location.pathname === "/__stage" || location.pathname === "/__meeting") return;
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

// ================= 1. The meeting (0–18) =================
await mascot("mascot:online", true);
await mascot("mascot:context", { context: "meeting", mode: "auto", talk: false });
await cam({ px: 640, py: 378, sx: 720, sy: 430, z: 0.86, rx: 10, ry: -6, y: 40 }, 0, 0.01);
await fade("black", 1, 0, 0.2, 1.2);
await cam(WIDE, 0.2, 2.2);
await until(1.6);
await key("1-meeting");
await speak("tom", "Students can work 600 hours a year, right?", 2.6);
await until(4.6);
await mascot("mascot:thinking");
await focus(L("#m"), 1.55, 4.8, 1.2, { sx: 900, sy: 360 });
await until(5.6);
await mascot("mascot:check", {
  ok: false, where: "meeting", key: "student-hours", said: "600 hours", value: "650 hours",
  label: "Student work: hours per year at reduced social security", score: 96, source: "Official: student work quota",
});
await until(6.2);
await mascot("mascot:speak", { text: "Quick correction", audio: null });
await meeting().evaluate(() => window.__say(null));
await until(8.5);
await key("2-correction");
await until(10.4);
await mascot("mascot:check", { ok: true });
await cam(WIDE, 10.4, 1.2);
await until(11.0);
await focus(L("#cap"), 1.3, 12.2, 2.0, { sx: 760, sy: 500 });
await speak("jan", "For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.", 4.2);
await until(16.0);
await key("3-jan");
await meeting().evaluate(() => { window.__say(null); window.__toast(true); });
await cam(WIDE, 16.0, 1.0);
await until(17.8);
await key("4-ended");

// ================= 2. The brain learns (18–27), as Tom, who ran the meeting =================
await signIn("tom");
await goTo("/loop", "company-brain · Live loop", () => app.getByText("Paste text yourself").waitFor({ timeout: 500 }));
await cam(WIDE, now(), 0.01);
await until(now() + 1.2);
// Nobody pastes anything: the meeting tool hands the transcript (with speaker names) to the brain,
// through the same ingest route a Teams connector would call. The page picks it up on its next poll.
{
  const r = await page.request.post(BASE + "/api/brain/ingest", {
    headers: { origin: BASE },
    data: { channel: "meeting", text: TRANSCRIPT, context: { country: "BE", pc: "200" } },
  });
  if (!r.ok()) throw new Error("ingest failed " + r.status());
}
const waiting = app.getByText("Waiting for Jan", { exact: true });
while (!(await waiting.isVisible())) await shot();
cursor.x = cursor.y = null;
const heard = waiting.locator("xpath=ancestor::*[contains(., 'we agreed 22')][1]");
await cam(WIDE, now(), 0.6);
await bring(heard, 0.6);
await focus(heard, 1.45, now(), 1.0, { sx: 720, sy: 420 });
await heard.evaluate((el) => el.classList.add("__hl"));
await until(now() + 3.0);
await key("5-learned-50");

// ================= 3. Jan confirms in one click =================
await signIn("jan");
await goTo("/loop", "company-brain · Live loop", () => app.getByRole("button", { name: /That's right/ }).waitFor({ timeout: 500 }));
const yes = app.getByRole("button", { name: /That's right/ });
await bring(yes, 0);
await focus(yes, 1.45, now(), 1.1, { sx: 760, sy: 600 });
await yes.evaluate((el) => el.parentElement?.parentElement?.classList.add("__hl"));
await until(now() + 1.6);
await key("6-jan-question");
await click(yes, 0.7);
const confirmed = app.getByText("Jan Wouters confirmed it");
while (!(await confirmed.isVisible())) await shot();
cursor.x = cursor.y = null;
const change = confirmed.locator("xpath=ancestor::*[contains(., '+47') or contains(., 'pts')][1]");
await cam(WIDE, now(), 0.5);
await bring(change, 0.5);
await focus(confirmed.locator("xpath=ancestor::*[contains(., '22 days')][1]"), 1.3, now(), 1.0, { sx: 720, sy: 430 });
await change.evaluate((el) => el.classList.add("__hl"));
await until(now() + 3.0);
await key("7-jan-97");

// ================= 4. A week later: Sofie asks (35–60) =================
await signIn("sofie");
await goTo("/", "company-brain · Ask", () => app.locator("textarea, input[type=text]").first().waitFor({ timeout: 500 }));
const input = L("textarea, input[type=text]").first();
await focus(input, 1.3, now(), 1.0, { sx: 720, sy: 420 });
await click(input, 0.6);
await type(input, QUESTION, 2.4);
await click(app.getByRole("button", { name: "Ask", exact: true }), 0.5);
await cam(WIDE, now(), 0.8);
await until(now() + 3.0);
await key("8-reading");
const skip = app.getByText("Skip to the answer");
if (await skip.isVisible()) await skip.evaluate((el) => el.click());
const answer = app.getByText("22 days", { exact: true }).first();
while (!(await answer.isVisible())) await shot();
await app.evaluate(() => window.scrollTo(0, 0));
cursor.x = cursor.y = null;
const card = answer.locator("xpath=ancestor::div[.//*[contains(text(),'Ask Jan to confirm')]][1]");
await focus(card, 1.25, now(), 1.2, { sx: 720, sy: 430 });
await until(now() + 3.6);
await key("9-answer");
await focus(app.getByText(/we agreed 22 holiday days/).first(), 1.6, now(), 1.2, { sx: 720, sy: 420 });
await until(now() + 3.2);
await key("10-quote");
const contact = app.getByText(/Contact/).filter({ hasText: "Jan Wouters" }).first();
await cam(WIDE, now(), 0.6);
await bring(contact, 0.8);
await focus(contact, 1.5, now(), 1.4, { sx: 720, sy: 420 });
await until(now() + 3.4);
await key("11-contact");
await fade("black", 0, 1, END - 1.0, 1.0);
await until(END);

await browser.close();
if (PREVIEW) process.exit(0);
ff.stdin.end();
await new Promise((res) => ff.on("close", res));
console.log(`video done: ${frame} frames, ${(frame / FPS).toFixed(1)} s -> out/film-silent.mp4`);

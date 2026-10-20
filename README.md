<div align="center">

# Company brain

**Every answer your company knows, why you can trust it, and who to ask.<br>It keeps itself up to date from the work people already do.**

[Try the live demo](https://tavling-eight.vercel.app) · [Watch the 1-minute film](video/film-silent.mp4) · [Pitch script](docs/pitch-script.md) · [Trust engine](src/trust-engine/README.md) · Tectonic Hackathon 2026 · SD Worx challenge

Built by team Aleida.ai: Ilke Seynaeve, Isak Andersson, Noa Gradstock

<img src="docs/screenshots/mascot-meeting.gif" alt="Jef, the desktop mascot, listening in a team meeting and correcting a wrong number out loud" width="720">

<sub>Jef, our desktop mascot, hears "600 hours" in a meeting and corrects it: the trusted value is 650 hours.</sub>

</div>

## Overview

**The challenge.** SD Worx asked: *"Can your solution stay trusted without becoming another task?"* Knowledge lives in meetings, emails, Teams and people's heads. It goes out of date when the law changes, and it walks out the door when people leave. A wiki doesn't fix that, because nobody maintains it.

**What we built.** One trust engine with three ways in:

| | What it is | What it does for you |
|---|---|---|
| **Jef** | A small mascot on your desktop ([mascot/](mascot/README.md)) | Listens while you work. Silent when you are right, speaks up the moment an email or a meeting gets a number wrong. |
| **Ask** and **Brain** | The web app | One answer to any payroll question, with the exact source, a trust score you can follow step by step, and the person to ask. The Brain shows who knows what across the company. |
| **Live loop** | The web app, "What changed today" | Everything Jef heard and every change it made to an answer, as a log you can trace back. You confirm what is yours with one click, or not at all. |

**Why you can trust it.**
- **AI reads, code decides.** Every score comes from six visible rules, the same input always gives the same score, and every point is explained.
- **Every answer carries its evidence**: the verbatim sentence, where it came from, who said it and when.
- **It stays trusted by itself.** It learns from meetings, emails and documents, notices when the law changes, and only asks a person when their answer would change the outcome.

All people, clients and documents are fictional.

## Try it in 2 minutes (no password)

Open the [live demo](https://tavling-eight.vercel.app). You are signed in as **Sofie Maes**, a payroll consultant. You can also start from the sign-in page and pick a person.

<img src="docs/screenshots/login.png" alt="Sign-in page with 'Try it without a password': Try as Sofie (consultant) or Try as Jan (expert)" width="360">

1. **Ask:** *"How many holiday days does a full-time employee get?"* See the answer, how its score was built and who to talk to.
2. **Live loop:** this morning Jef heard a meeting, an email and a Teams message, and an agreement came in. Open **Why** on any entry to see the six checks.
3. **Switch to Jan** (bottom of the sidebar), the expert. Under **For you**, approve the agreement and watch *20 days* become *22 days* for Brouwerij De Kroon.
4. **Brain:** who knows what, how far each topic can be trusted, and what is worth a look.

**Reset the demo morning** in the sidebar puts everything back for the next person.

## A tour

### 1. Jef hears your work

Jef is a blob in an SD Worx cap that lives in the corner of your screen. It knows whether you are writing an email or sitting in a meeting, and it only speaks when something is wrong.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/mascot-meeting-correction.png" alt="In a meeting, Jef turns amber and shows: the last thing you said was off, 600 hours, the trusted value is 650 hours"><br><sub><b>In a meeting:</b> "600 hours" is outdated. Jef shows and says the trusted value, 650 hours, with its source.</sub></td>
<td width="50%"><img src="docs/mascot-warning.png" alt="While writing an email, Jef warns: you wrote 20 holiday days, but for Brouwerij De Kroon it is 22 days, trusted 98%"><br><sub><b>In an email:</b> 20 holiday days is wrong for this client. <b>Fix it</b> corrects the draft.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/mascot-meeting-sent.png" alt="The meeting ends and the transcript is sent to Company brain"><br><sub><b>After the meeting:</b> what was said goes to Company brain, where the speaker can confirm it.</sub></td>
<td width="50%"><img src="docs/screenshots/mascot-meeting-listening.png" alt="Jef listening quietly in the corner during a meeting"><br><sub><b>Most of the time:</b> quiet, listening, out of the way.</sub></td>
</tr>
</table>

| It knows where you are | What it does | Does it speak? |
|---|---|---|
| **Email** (Mail in front) | Reads the draft you are writing and checks every sentence that states a value (€, %, days, weeks, hours) against the brain, including client-specific agreements when the email names the client. Amber card with **Fix it**, **I know better** and **See in Company brain**. | Only when you talk to it |
| **Meeting** (Teams, Meet, Zoom in front) | Listens for wrong values and speaks up: *"Quick correction: 600 hours is outdated. It's 650 hours."* | Corrections and answers |
| **"Hey SD Worx"** (anywhere) | Opens a 30-second conversation: *"what's the right answer?"*, *"where does that come from?"*, *"how did you get this?"*, *"who should I ask?"*, *"fix my email"*. Answers on screen and out loud (ElevenLabs). | Yes |


**Speed:** all trusted facts are loaded when Jef starts and refreshed every 5 minutes, so a check runs locally in milliseconds; speech is cut as soon as you pause.
**Calm by design:** offline it sleeps (grey, eyes closed, mic off). Online it is silent until something is wrong. A warning stays exactly as long as the mistake is in your text.


### 2. Ask: one answer, and why you can trust it

<img src="docs/screenshots/ask-home.png" alt="Ask the company brain: a question box and example questions, with Jef next to the heading" width="100%">

Ask in any language. Company brain searches the law, SharePoint, Teams and email, sets aside what does not apply to your case, and gives one answer.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/ask-answer.png" alt="Answer card: €8.91, trusted 96, reliable, current, applies here, with the verbatim quote from the royal decree"><br><sub><b>The answer:</b> the value, the trust score, the exact sentence and its source. One click asks the right colleague to confirm.</sub></td>
<td width="50%"><img src="docs/screenshots/ask-checks.png" alt="How we got to 96%: six questions as a waterfall from 50%, and 'Will it hold?': trusted until 1 Jan 2027, then €9.50"><br><sub><b>How we got to 96%</b> (six questions, every point visible) and <b>Will it hold?</b> The same rules run forward: this answer changes on 1 January 2027.</sub></td>
</tr>
</table>

<img src="docs/screenshots/ask-who.png" alt="Who to talk to: contact Anna De Smet first, and who recently discussed this topic, including a colleague in Germany with a different rule" width="100%">

**Who to talk to** is computed from work that already happened: who was right before on this topic, who dealt with it recently, and whether it was about your country. Meetings show only that a topic was discussed, never what was said.

### 3. Live loop: what changed today

<img src="docs/screenshots/loop.png" alt="Live loop: Jef is listening, how it works in four steps, For you on the left and the log on the right" width="100%">

Everything Jef heard and every change it made, newest first. **How it works** sums it up in four steps: Jef **hears**, the brain **finds** the documents, **reads** the exact line, and **scores** it. Open **Why** on any entry:

<img src="docs/screenshots/loop-checks.png" alt="A log entry with the six checks: who said it, still current, who agrees, matches the law, fits your case, held up for others, and the result" width="760">

New entries open by themselves and tick the six checks off one by one, so you can watch the brain decide.

### 4. For you: confirm, correct, approve, or do nothing

<table>
<tr>
<td width="50%"><img src="docs/screenshots/jan-for-you.png" alt="For you, as Jan: a document to approve with its checks, and a meeting line that counts as his tomorrow unless he changes it"><br><sub><b>For you</b> (signed in as Jan): what was heard from you counts by itself after a day. Change it only if it's wrong.</sub></td>
<td width="50%"><img src="docs/screenshots/jan-approved.png" alt="The log: Jan Wouters approved the agreement, annual leave 20 days becomes 22 days for Brouwerij De Kroon, 100%"><br><sub>Jan approves the agreement: <b>20 → 22 days</b> for that client, logged with the reason.</sub></td>
</tr>
</table>

### 5. Import a whole document

<table>
<tr>
<td width="50%"><img src="docs/screenshots/import-dialog.png" alt="Import: meeting transcript, Teams message, email or document"><br><sub>Normally Jef does this by itself. You can also import a meeting, a message, an email or a document.</sub></td>
<td width="50%"><img src="docs/screenshots/import-document.png" alt="A client agreement checked: about Brouwerij De Kroon, signed on 2026-10-03, final version, 2 statements found"><br><sub>A client agreement is checked (client, signed, not a draft) and waits for an expert to approve it.</sub></td>
</tr>
</table>

### 6. Brain: who knows what

<img src="docs/screenshots/brain.png" alt="The Brain: a web of people and topics grouped in domains, coloured by trust, with 'Worth a look' and People on the right" width="100%">

<table>
<tr>
<td width="50%"><img src="docs/screenshots/brain-filter.png" alt="Only the topics where sources disagree, and the people who know them, are lit up"><br><sub>Click a status, e.g. <b>Sources disagree</b>, to light up those topics and the people who know them.</sub></td>
<td width="50%"><img src="docs/screenshots/brain-topic.png" alt="Topic panel for the end-of-year bonus: December for most, November for TechStart Gent, who knows it and where it is written"><br><sub>A topic: the answer, its forecast, clients with their own agreement, who knows it and where it is written.</sub></td>
</tr>
</table>

## How it works

### The circle: knowledge goes up, comes down, stays trusted

```mermaid
flowchart LR
    A["Ilke (expert) writes to a client:<br/>'22 holiday days for De Kroon'"] -->|"Jef: the brain says 20.<br/>Ilke clicks 'I know better'"| B["One sentence shared<br/>for review (50%)"]
    B -->|"Anna approves<br/>with one click"| C["Company brain<br/>22 days · 98%"]
    C -->|"read down"| D["Isak (first week) writes<br/>'20 holiday days'"]
    D -->|"Jef turns amber<br/>'Hey SD Worx, fix it'"| E["Email says 22 days"]
```

| Step | What happens | Who does anything |
|---|---|---|
| **Up** | Ilke writes "22 holiday days" in an email to Brouwerij De Kroon. Her Jef sees the brain says 20 (the law) and asks. She clicks **I know better**: that one sentence, and nothing else from her email, is shared for review. | Ilke: one click |
| **Approve** | The brain asks the best available colleague (never the author) to confirm. Until then the claim is capped at 50% and changes nobody's answer. Anna approves: 22 days for De Kroon, 98%. | Anna: one click |
| **Down** | A week later Isak, new on the job, writes "20 holiday days" to De Kroon. Jef turns amber: *"For Brouwerij De Kroon it's 22 days."* He says **"Hey SD Worx, fix it"** and the draft is corrected. Other clients keep 20. | Nobody |
| **Tomorrow** | When the law changes, older answers lose trust on their own; when a meeting says something wrong, Jef corrects it out loud; when something is unclear, one person gets one question. | Only when it changes the outcome |


```mermaid
flowchart LR
    A["Jef hears<br/>meeting · email · Teams · document"] --> B["Code extracts<br/>value · topic · speaker · quote"]
    B --> C["Six questions<br/>score it"]
    C --> D["Logged<br/>before → after, and why"]
    D --> E["Answer<br/>+ who to ask"]
    E -. confirm · correct · approve .-> C
```

### The six questions

Every statement starts at **50%**. Six questions move it up or down; the points are added and turned into a percentage (+2 ≈ 88%, −2 ≈ 12%). Weights are in [src/trust-engine/config.ts](src/trust-engine/config.ts).

| Question | What it checks | Points (examples) |
|---|---|---|
| **Who said it?** | The source | law or official +3 · signed client agreement +2.5 · expert +1 · new hire −0.5 · author has left −1 · said in a meeting −0.3 · sounded unsure −1 |
| **Still current?** | Age | −1 per half-life of the topic (max −2) · written before the rule changed −2.5 |
| **Who agrees?** | Others saying the same | expert approval +0.5 each · colleague says the same +0.7 · corrected by someone −1.5 |
| **Matches the law?** | The official rule | matches +2 · contradicts −3 · a client's own agreement +0.5 |
| **Fits your case?** | Your client, sector, country | client +1.5 · sector +1 · country +0.3 · other country: set aside |
| **Held up for others?** | Colleagues' feedback | weighted by role, max ±2 · nobody can vote down the law |

**Caps** stop a high sum from hiding a real problem: contradicts the law → max 20%, written before the current rule → max 30%, said in a meeting or uploaded and not yet confirmed → max 50%, nothing official or expert behind it → max 60%.

**Which answer wins:** the most specific trusted claim (75% or more). A client's own agreement beats the sector rule. Two trusted claims that disagree are shown as **sources disagree**, never guessed.

**Will it hold?** The engine takes the date as an input, so we run it forward 18 months. The first day today's answer stops being trusted is its best-before date, with the reason (a new rule takes effect, the sources get too old, sources start to disagree).

**Staying current without work:** what Jef heard from you counts as yours after a day unless you change it; asking a colleague to confirm goes to the best available person (never the author, at most three questions a week each); a newer approved agreement replaces the older one. Every step is a line in the log.

**Does it work?** `npm test` runs 70 tests, including 36 real-data questions over 28 topics in [data/salary](data/salary), and checks every answer.

## Privacy: it reads down, it never leaks up

Jef sits next to your email, so it has to be trustworthy itself.

| Principle | How it is built |
|---|---|
| **Off by default** | It starts offline: no reading, no listening. You switch it online. |
| **Reads down, never shares on its own** | Checking your email only *downloads* trusted answers; nothing you write is sent to the brain. The check runs on your device. |
| **Shares one sentence, only when you click** | **I know better** / **Share for review** sends exactly that sentence, never the email, the recipients or the thread. |
| **Nothing counts until a colleague approves it** | Shared knowledge is capped at 50% and changes nobody's answer until an expert other than you approves it (`review` rule in the trust engine). |
| **New topics stay on your device** | A value about a topic the brain does not know yet is kept as a local suggestion for the knowledge team, not uploaded. |
| **Only your own writing** | In Mail it reads the message body you are writing, not your inbox, To or Subject. It does not read other apps' messages. |
| **No surveillance** | Outside meetings the microphone only reacts to "Hey SD Worx". Meeting audio is never stored and never put in anyone's name: speakers come from the meeting tool, not from guessing. |
| **Stores claims, not text** | The brain keeps the verbatim sentence as evidence for a claim, never whole emails. Personal data is masked before any model call. |
| **AI reads, code decides** | Claude Haiku only classifies what you meant from a fixed list; every answer, score and correction is built by deterministic code from sources. |


## Run it

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 70 tests: engine, data, sessions, access
```

Without any setup you land as the demo persona Sofie. For your own accounts:

```bash
node scripts/create-users.mjs sofie jan anna tom
```

It prints a password per user and two lines, `SESSION_SECRET` and `AUTH_USERS`. Put them in `.env.local` (see `.env.example`); only scrypt hashes are stored. Optional settings: `GEMINI_API_KEY` (free-text questions; without it keyword matching still works end to end), `SESSION_HOURS` (how long a sign-in lasts), `QUIET_HOURS` (when something heard from you counts as yours, default 24), `DEMO_PERSONAS` (default `sofie,jan`), `DEMO_SEED=off` (start the demo empty) and `GUEST_ACCESS=off` (no personas, no guest).

**Jef, the desktop mascot:** `cd mascot && npm install && npm start` (macOS). Put `BRAIN_URL=http://localhost:3000`, `BRAIN_USER` and `BRAIN_PASSWORD` in the repo's `.env` to use a local server with your own account. `ELEVENLABS_API_KEY` enables listening and the voice. Details: [mascot/README.md](mascot/README.md).

**The 1-minute film:** [video/README.md](video/README.md) records it from the real app.

**Deploy:** the live demo runs on Vercel. Set `SESSION_SECRET` and `AUTH_USERS`, and add Upstash Redis from the Vercel Marketplace (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) so every server instance shares the same demo morning, votes and log.

## Security

Built for the checks of the Aikido AI Code Audit: authentication, authorization, IDOR and business logic.

### What Aikido found, and what we fixed

How we treat a finding: fix the cause rather than hide the warning, keep the fix small enough to review, and re-run the tests and the demo before pushing. Security is built in from the first commit (the model below); the scan is how we check we did not miss anything.

The first Aikido scan of this repo (20 Oct 2026) found three issues. All three are fixed in commits `fb0a257` and `f199b8d`:

<img src="docs/screenshots/aikido-before.jpg" alt="Aikido scan before the fixes: Next.js (critical), document write methods in stage.html (high), file inclusion via reading files in trust.mjs and brain-data.ts (high)" width="100%">

| Finding | Severity | Fix |
|---|---|---|
| Next.js 16.3.8: two CVEs (code injection, denial of service) | Critical | Upgraded to Next.js 16.4.1, the fixed version. |
| `video/stage.html` (the page that records the demo film) wrote markup with `innerHTML` | High | Markup is parsed inertly and rebuilt from an allowlist of tags with only a `class` attribute; anything else becomes plain text. |
| `trust.mjs` and `brain-data.ts` read files from a path held in a variable | High | `trust.mjs` reads only a fixed list of its own JSON files. `brain-data.ts` lists one fixed folder (`data/salary`) in a single call and skips symlinks. No path ever came from a request; now the code proves it. |

After the fixes: type check clean, 70 of 70 tests pass, production build passes, `npm audit --omit=dev` reports 0 vulnerabilities.

### Security model

- **Login: yes**, with password-free demo personas for the jury (real roles, real rules). Users have their own client portfolio, and votes, learned claims and answers change what colleagues see, so without a login this would be broken access control.
- **Roles** (from the server-side people list, never from the request): `guest` (shared demo visitor, read-only), `new` and `regular` consultants, and `expert`. People who left the company cannot sign in.
- **Tenants:** clients. A consultant sees only the clients in their own portfolio; an expert sees every client in their own country; country-wide knowledge is visible to that country's team. Defined in `src/lib/access.ts`.

| Object | Who may read | Who may change |
|---|---|---|
| Answers and trust receipts (`/api/trust/ask`, `/facts`) | Anyone signed in, for a case (client or country) they may use | Nobody: computed by the engine |
| Source documents (`/api/trust/source`) | Client sources: that client's consultants and experts; others: anyone signed in | Nobody (files in `data/salary/`) |
| Votes (`/api/trust/feedback`) | Their effect on scores is visible to everyone in that case | Signed-in non-guests, one vote per person per claim, only in a case the claim applies to and the voter may use; nobody confirms their own input |
| Learned claims (`/api/brain/ingest`) | As source documents | Signed-in non-guests, only for clients in their own portfolio; author is the session user (meeting speakers stay capped at 50% until they or an expert confirm) |
| Confirmation questions (`/api/brain/questions`) | The asker and the person asked | Asked by signed-in non-guests; the server picks who is asked; only the person asked can answer |
| Score history (`/api/brain/ledger`) and who-knows graph (`/api/brain/graph`) | Filtered to cases and sources the user may see | Nobody directly |

- **Flows that change shared state:** voting, teaching the brain, asking a colleague to confirm, and answering a confirmation. All are rate-limited per user, refuse guests, check the case against the user's portfolio on the server, and are idempotent (the same vote or sentence twice counts once). There is no money, credit or booking flow.

- **Login:** every page and API route needs a session, except the login page and "Continue as guest" (`src/proxy.ts`), and each route handler and data page checks it again (`currentUser()` in `src/lib/trust-server.ts`, `requireUser()` in `src/lib/session.ts`).
- **Sessions:** signed cookie (HMAC-SHA256), `HttpOnly`, `SameSite=Strict`, `Secure` and the `__Host-` prefix in production, valid for 8 hours by default (`SESSION_HOURS`, at most 30 days, for a demo machine) (`src/lib/auth.ts`). Logout revokes the session on the server, so a copied cookie stops working too. Changing a user's password ends all of their sessions.
- **Passwords:** scrypt hashes only, constant-time comparison, same answer and timing for unknown users. Login input is a strict zod schema (unknown fields are refused). Every attempt is counted *before* the password check and refunded after a correct one, so parallel guesses cannot slip through and the real user is never locked out by their own correct login. Limits per 15 minutes: 5 per account + IP, 50 per IP, 100 per account from any IP (stops guessing with rotating IPs). The client IP is only trusted on Vercel, which overwrites `x-forwarded-for`.
- **Voting:** the voter is always the signed-in user from the session, never a value sent by the browser. One vote per user per claim, and only for a case the source actually applies to, so nobody can hide a source for another country, sector or client. Users who left the company cannot sign in.
- **Abuse limits:** 30 questions, 60 votes and 20 learn requests (`/api/brain/ingest`) per user per minute; request bodies over 10 KB are refused with 413 (`src/proxy.ts`, and again while reading in `readJson`), and text to learn from over 6,000 characters is refused, not cut. Bodies may only contain the route's own fields: an extra `userId`, `role` or `author` gives 400 instead of being ignored.
- **Learning from work:** guests cannot teach the brain; only signed-in accounts can. For email and Teams the author is always the signed-in user, whatever the text says. A meeting statement is attributed to its speaker but stays capped at 50% until that speaker or an expert confirms it from their own account, so nobody can put trusted words in a colleague's mouth. Statements about a client are only learned when that client is in your portfolio, and the score history (`/api/brain/ledger`) only shows client entries to that client's consultants.
- **Client access:** consultants only see their own client portfolio, experts every client in their own country (`src/lib/access.ts`). Checked in every route: asking, voting, opening a document and the brain map. Another client's agreements and emails are never sent to the browser. Asking about, voting on or opening another client's data gives 404, so the answer does not reveal that it exists.
- **Demo personas and guest:** a visitor without a session is signed in as the first demo persona (`DEMO_PERSONAS`, default `sofie,jan`): a real, fictional colleague with that person's role and portfolio, nothing more. Demo sessions are marked, only valid while the persona is offered, and rate-limited per IP; "Reset the demo morning" works only from a demo session and a few times a minute. `GUEST_ACCESS=off` switches personas and guest off. The read-only guest (`/api/auth/guest`) remains for the desktop mascot.
- **Shared state:** revoked sessions, rate limits, votes, learned claims and the score history live in Upstash Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set (Vercel Marketplace, free tier), so every server instance sees the same state (`src/lib/store.ts`). Locally they are kept in memory. In production without Upstash the store fails closed (sessions and rate-limited routes are refused) unless `ALLOW_MEMORY_STORE=true` is set on purpose. Rate limits and the logout check also fail closed when the store is down.
- **CSRF:** POST routes refuse requests whose `Origin` does not match the `Host` header, and browser requests marked cross-site.
- **Desktop mascot:** Electron renderer pages run sandboxed with `contextIsolation`, no `nodeIntegration`, a strict CSP and no navigation or new windows; every IPC message checks its sender and validates input; only the main process talks to the network, and only to `BRAIN_URL` and ElevenLabs. It never sends what you write on its own: one sentence is shared only on "Share for review", as the signed-in user, and capped until an expert other than the author approves it. Keys stay in `.env`.
- **AI privacy:** names, clients, ages and identifiers are masked before a question is sent to Gemini (`src/lib/privacy.ts`), and Gemini never sees the sources or scores anything The question is sent as its own input, separate from our instructions and the topic list, and the answer can only be one of the known topic keys.
- **Headers:** `X-Frame-Options`, `Content-Security-Policy: frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, no `X-Powered-By`, and `Cache-Control: private, no-store` on every API answer (`next.config.ts`). Logs record only the event, never error objects, bodies or prompts.
- **Secrets:** no keys or passwords in the repo; all in environment variables, read only in modules marked `import "server-only"`.
- **Tests:** `npm test` covers sessions, tampering, logout revocation, password change, the login limiter (parallel attempts, refund, IP rotation), trusted IP, CSRF, the Upstash store and client access (`src/lib/auth.test.ts`). `scripts/attack-tests.mjs` runs 74 attacks against a local production build (no cookie, forged and tampered sessions, CSRF, IDOR on another client's data, mass assignment, bad input, XSS, prompt injection in questions, Teams messages and meeting transcripts, 20 parallel votes, logout replay, parallel and IP-rotating login guesses, headers); how to run it is at the top of the file. The git history was scanned for keys and passwords: none found. CI (`.github/workflows/ci.yml`) runs lint, tests, `npm audit` and the build on every push, with a read-only token and actions pinned by commit SHA. Run it against a local server only, never the live demo.
- **Known trade-offs:** `npm audit` reports a high advisory in `braces`, only through the dev-only lint tooling (`eslint-config-next`); `npm audit --omit=dev` is clean. The page CSP has no `script-src` (a nonce CSP would break static pages), so it does not stop XSS by itself; all user and model text is rendered as React text. The per-account login limit (100 per 15 minutes from any IP) means someone sending 100 wrong guesses can make a colleague wait up to 15 minutes; that is the price of stopping guessing with rotating IPs. Off Vercel the client IP is unknown, so only that per-account limit applies (no shared bucket that would lock everyone out); single sign-on would remove passwords altogether. When the shared store is down, rate-limited routes refuse with 429 rather than 503: still closed, only the status code is less precise.

## Data

All data is synthetic and fictional: people, clients, amounts, decrees and agreements.

- **136 documents** in [data/salary](data/salary): official notices and decrees, old manuals, SharePoint guides, Teams exports, client emails, meeting transcripts and agreements, in English, Dutch and French.
- **28 topics**, **153 claims**, **17 people**, **8 clients** across Belgium and the Netherlands.
- **Planted flaws** the brain has to handle: outdated versions, guides whose owner has left, Teams messages corrected by an expert, drafts, the wrong country, duplicate "- Copy" files, client exceptions, and a decree that takes effect next year. They are listed per topic in [data/salary/README.md](data/salary/README.md).
- **A demo morning** (`src/lib/demo-seed.ts`) runs through the real engine when the app starts, so "What changed today" is never empty.

## Structure

| Path | What |
|---|---|
| `src/app/` | Pages: Ask (`/`), Brain (`/brain`), Live loop (`/loop`), sign-in, and the API under `api/trust/`, `api/brain/`, `api/auth/` and `api/demo/` |
| `src/trust-engine/` | The engine: scoring (`score.ts`, weights in `config.ts`), extraction from everyday text (`extract.ts`), documents (`document.ts`), who to contact (`contacts.ts`), the knowledge web (`graph.ts`), forecasts (`forecast.ts`), tests |
| `src/lib/` | Server side: sessions and login (`auth.ts`), access rules (`access.ts`), learned claims and the log (`live.ts`), your own log (`mine.ts`), questions to colleagues (`questions.ts`), document intake (`intake.ts`), quiet consent (`consent.ts`), the demo morning (`demo-seed.ts`), shared store (`store.ts`) |
| `src/app/trust-visuals.tsx` | The waterfall, the six checks and the forecast line |
| `mascot/` | Jef, the desktop mascot (Electron): email and meeting checks, "Hey SD Worx", fix my email |
| `video/` | The 1-minute film, recorded from the real app |
| `data/salary/` | Fictional source files and the claims read from them |
| `docs/` | Final case, pitch, trust loop design, context library, screenshots |

## Unfinished

- **Extraction uses fixed rules** (value, known topic, unit, speaker, scope, hedges). The AI gates in [docs/trusted-tomorrow-algorithm.md](docs/trusted-tomorrow-algorithm.md) that would also catch new topics and subtler corrections are not built.
- **No real Microsoft 365 integration** (Graph). Jef reads Apple Mail drafts through macOS Accessibility and recognises Teams, Meet and Zoom by the app in front; meeting speakers come from `Name:` labels. In the film the hand-off from the meeting to the brain is simulated.
- **Jef is macOS only.**
- **Documents:** text files only; PDF and scanned documents (OCR) are not read yet. Agreements loaded from the data files cannot be marked as signed, so the demo agreement arrives through the import.
- **Track record** is shown (who was right before) but does not change the score yet; the score still uses the role.
- **Quiet consent** means a line someone else typed in your name becomes yours after a day if you never look. It is visible in "For you", logged and reversible; limiting it to what Jef heard on your own device would be stricter.
- **Accounts** come from an environment variable; in production this would be single sign-on (Microsoft Entra ID) with real roles and portfolios.
- **Without Upstash Redis**, everything learned, voted and logged lives in memory: it resets on restart and differs per server instance.
- **The client portfolio** per consultant is a fixed demo list in `src/lib/access.ts`.

## Team

Team **Aleida.ai**: Ilke Seynaeve, Isak Andersson and Noa Gradstock. Built at the Tectonic Hackathon final in Ghent, 20 October 2026, SD Worx track.

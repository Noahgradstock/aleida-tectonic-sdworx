# The live loop: how the brain learns from everyday work

Technical reference for teammates and their Claude sessions. Describes the design as built on 20 Oct 2026. Code is being edited in parallel, so this file names functions and files, not line numbers. If the code and this file disagree, the code wins; fix this file.

It answers the final case: "Could your solution learn from signals already created through everyday work, instead of requiring employees to maintain another knowledge system?" and "Who has dealt with this before? Who should I talk to?"

## The flow

```
everyday work                 extraction (code, no AI)          shared store            scoring              output
─────────────                 ────────────────────────          ────────────            ───────              ──────
meeting transcript ─┐         per sentence:                      live claims    ──▶   same six layers  ──▶  ledger entry: claim score
Teams message      ─┼──▶      · states a value? (€, %, days)  ──▶ (hash "live-     +    + new caps            before → after, answer
email draft        ─┘         · matches a known topic?            claims")              for the claim's       before → after, evidence
                              · unit fits that topic?                                    own scope
                              · speaker known? (meetings)                                                 ──▶  answer + who to contact
                              · scope: client > PC > country                                                   first + last updated
                              · hedged? ("I think", "maybe")
                              · quote = the sentence, verbatim
```

1. **Input.** `POST /api/brain/ingest` with a channel (`meeting`, `teams`, `email`), the text, and the case (client, or country + PC). In the demo the text is pasted on `/loop`; the desktop mascot is meant to send it in the background (see the integration guide below).
2. **Extraction** (`extractClaims` in `src/trust-engine/extract.ts`). Deterministic rules, no model call:
   - The text is split into lines and sentences. Only sentences that state a value become candidates: an amount (`€8.91`), a percentage (`92%`) or a duration (`20 days`, `8 weeks`, `3 months`). Values are normalised (`€8,91` → `€8.91`, `22 holiday days` → `22 days`).
   - The sentence must match a known topic (`matchFact`, the same keyword matching the ask route uses). Otherwise it is skipped: "States a value, but not about a topic the brain knows".
   - **Unit check:** the value's unit must match the units of claims the brain already has on that topic. "25 euros of holiday" is skipped for annual leave days, which are counted in days.
   - **Speaker:** in a meeting, each line can start with `Name: text` (full name or first name of a known person). That person becomes the claim's author. A meeting line without a known speaker is skipped ("Speaker unknown: nobody to confirm it with"). For email and Teams, the author is always the signed-in user, and speaker labels in the text are ignored, so nobody can put words in a colleague's mouth by typing their name.
   - **Scope:** a client named in the sentence (e.g. "Brouwerij De Kroon") gives client scope; else a `PC 200` in the sentence gives sector scope; else a country named in the sentence ("German", "Dutch"); else the speaker's own country (from their team, e.g. "Payroll DE"); else the case's country. Only what is actually said narrows the scope, so a general statement never becomes a client or sector exception by accident.
   - **Hedges:** "I think", "I guess", "probably", "maybe", "not sure", "if I remember", "I believe" set `hedged: true`.
   - **Quote:** the claim's text is the speaker's own sentence, verbatim.
   - **Stable id:** `live-<channel>-<hash(speaker | sentence)>`. The same sentence fed twice is the same claim and is reported as "Already known", so repeats never count twice.
3. **Storage** (`src/lib/live.ts`). New claims go into the shared store (`saveLiveClaim`, hash `live-claims`). `liveKb()` is the static knowledge base from `data/salary/` plus every live claim. All routes (`ask`, `feedback`, `ingest`, `ledger`) read from `liveKb()`, so a learned claim is visible everywhere at once.
4. **Scoring.** The same engine as the qualifier (`evaluateFact`, six layers, hard caps), with the new meeting and hedge rules below. Nothing about scoring is special for live claims except the source type.
5. **Ledger** (`recordChange` in `src/lib/live.ts`). Every change (a claim learned, confirmed, rejected or marked outdated) is evaluated twice, before and after, for the claim's own scope, and stored as one entry: claim score before → after, the answer (value, score, status) before → after, the evidence points and the caps. This is the "why did the score move" trail.
6. **Answer.** `POST /api/trust/ask` now also returns who to contact first (`rankContacts`) and when the brain last learned something on the topic (`lastUpdated`).

## New trust rules

All weights are in `src/trust-engine/config.ts`; the logic is in `src/trust-engine/score.ts`.

| Rule | Effect | Why |
|---|---|---|
| Source type `meeting` | −0.3 points (authority layer) | Said out loud, nobody wrote it down or reviewed it. |
| Meeting claim not confirmed | capped at **50%** | Spoken knowledge is usable, never trusted, until it is confirmed. |
| What lifts the 50% cap | a "correct" vote **from the speaker or an expert**, an expert reaction, or the value matching the official source | A colleague who was in the room cannot vouch for what someone else said. |
| Hedged speech ("I think…") | −1 point | The speaker doubts it themselves. |
| Guests | cannot teach the brain (ingest returns 403) and cannot vote | Learning changes what everyone sees, same rule as voting. |
| Client claims | only learned when the client is in the signed-in user's portfolio; others are skipped with "About a client outside your portfolio" | A consultant cannot write knowledge into another team's client. |
| Existing caps still apply | contradicts the law → max 20%, no expert or official backing → max 60% | A confident but wrong statement in a meeting still loses to the law. |

Example from the tests: "Tom Claes: I think everyone gets 25 days of holiday now." → new hire −0.5, meeting −0.3, unsure −1, contradicts law −3 → about 1%.

## Who to contact first

`rankContacts(result, ctx, kb, feedback, now)` in `src/trust-engine/contacts.ts`. Computed from work that already happened (claims written, reactions, confirmations). Nobody maintains an expert list.

**Who is considered:** everyone who left a trace on this fact: wrote a claim on it, reacted to one, or voted "correct" on one.

**Set aside (shown with the reason, never silently dropped):**
- Has left the company.
- Only spoke about it for another scope and never confirmed anything here, e.g. "Spoke about it 21 days ago in a meeting, but about DE, not BE".

**Points (higher is better, each with a reason string shown in the UI):**

| Signal | Points | Reason shown |
|---|---|---|
| Track record on this topic, in scope | `2 × logit((1 + right) / (2 + n))`, a Beta(1,1) prior, so one right answer is not proof. `right` = their in-scope claims that match the current answer | "Right 1 of 1 time on this topic" |
| Confirmed colleagues' answers | +0.4 each, max 3 | "Confirmed colleagues' answers 2×" |
| Role | expert +1, new hire −0.5 | "Expert, Payroll BE" / "New in the team" |
| Recency | `1.5 × 0.5^(days / 60)`, half-life 60 days, from their latest in-scope claim | "Dealt with it today in a meeting" |

Track record is only counted when the fact has an answer (status trusted or conflict). `lastSeen` carries the date, channel and quote of their latest in-scope claim.

`lastUpdated(result)` returns the newest claim behind the answer for this case: date, source title, author.

## API reference

All routes need a session cookie (`/api/auth/login`). POST routes also pass `sameOrigin` (see the mascot section). Errors are `{ error: string }` with status 400, 401, 403 or 429. A body over 10 KB is treated as empty and gets 400.

### POST /api/brain/ingest

Learns from a piece of everyday work.

Request:
```json
{
  "channel": "meeting",
  "text": "Jan Wouters: For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.",
  "context": { "client": "brouwerij-de-kroon" }
}
```
- `channel`: `"meeting" | "teams" | "email"`.
- `text`: up to 8,000 characters (longer text is cut).
- `context`: `{ "client": "<id>" }` or `{ "country": "BE", "pc": "200" }` (`pc` optional). Must be a case the user may work on, else 403.

Rules: guests get 403 ("Sign in with your own account to teach the brain"); 20 requests per user per minute, then 429.

Response:
```json
{
  "learned": [ LedgerEntry, ... ],
  "skipped": [ { "sentence": "…", "reason": "Speaker unknown: nobody to confirm it with" } ]
}
```
Skip reasons: not a known topic, unit does not fit, speaker unknown, already known, client outside your portfolio. Sentences without a value are ignored silently (small talk).

`LedgerEntry`:
```ts
{
  id: string;
  at: string;                 // ISO time of the change
  kind: "learned" | "confirmed" | "rejected" | "outdated";
  actor: string;              // signed-in user who caused it (reporter or voter)
  channel: string;            // meeting | teams | email | official | sharepoint
  factKey: string;  factLabel: string;
  claimId: string;  value: string;
  quote: string;              // verbatim sentence
  speaker: string | null;     // person id of the claim's author
  scope: { country: string; pc?: string; client?: string };
  claimScore: { before: number | null; after: number };   // 0..1, before is null for a new claim
  answer: {                   // the answer for the claim's own scope
    before: { value: string | null; score: number | null; status: "trusted" | "conflict" | "stale" | "orphan" };
    after:  { value: string | null; score: number | null; status: ... };
  };
  evidence: { layer: string; tag: string; label: string; points: number }[];
  caps: string[];             // e.g. "Capped at 50%: said in a meeting, not confirmed yet"
}
```

### GET /api/brain/ledger?fact=<factKey>

The latest 50 score changes, newest first. `fact` is optional. Entries about a client the user cannot see are left out.

Response: `{ "entries": [ LedgerEntry, ... ] }`

### POST /api/trust/ask (additions)

Request adds an optional `factKey`. When it is a known fact key, no matching is done at all (no keywords, no Gemini call):
```json
{ "question": "Annual leave days (full-time)", "context": { "client": "brouwerij-de-kroon" }, "factKey": "annual-leave-days" }
```
Response adds, when a topic matched:
```ts
contacts: {
  ranked: { person: Person; points: number; reasons: string[]; lastSeen: { date: string; channel: string; quote: string } | null }[];
  setAside: { person: Person; reason: string }[];
};
lastUpdated: { date: string; source: string; by: string | null } | null;
matchedBy: "picked" | "keywords" | "gemini" | "none";
```

### POST /api/trust/feedback (addition)

Unchanged request (`{ claimId, kind: "correct" | "wrong" | "outdated" | "not_applicable", context }`). The response now includes the ledger entry for the vote:
```json
{ "ok": true, "entry": LedgerEntry }
```
`entry` is `null` for `not_applicable`. `correct` → kind `confirmed`, `wrong` → `rejected`, `outdated` → `outdated`.

## Demo script on /loop

Data: `data/salary/sources-holiday-days.json` (annual leave days, all fictional). Before the demo: Belgian law 20 days (official), Anna's Teams message 20 days (expert, matches the law), Koen's 2021 manual 24 days (Koen has left), Lukas Becker (Payroll DE) said 30 days in a payroll sync meeting, about Germany.

Sign in as **Sofie** (Brouwerij De Kroon is in her portfolio). Open `/loop`, case "Brouwerij De Kroon (BE, PC 200)", topic "Annual leave days".

1. **The answer now:** 20 days, 96%, from the official source. Who to contact first: Anna (right 1 of 1, expert). Set aside: "Not Koen Maes: Has left the company", "Not Lukas Becker: Spoke about it … in a meeting, but about DE, not BE". A fresh statement from another country does not change a Belgian answer.
2. **Feed the meeting transcript** (the "Meeting transcript" tab, exact text):
   ```
   Jan Wouters: For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.
   Sofie Maes: Good, I'll put that in the payroll file.
   Tom Claes: I think everyone gets 25 days of holiday now.
   ```
   Result: learned 2. Sofie's line has no value and is ignored. Jan's sentence becomes a client claim for Brouwerij De Kroon: expert +1, meeting −0.3, client exception +0.5, client-specific +1.5, **capped at 50%** until confirmed. Tom's becomes a Belgian claim: new hire, meeting, unsure, contradicts law → about 1%.
3. **Why the score moved:** the ledger shows both entries with quotes, evidence chips and caps. The answer for De Kroon now says sources disagree (a 50% client claim says 22, the law says 20), and under Jan's entry: "Waiting for Jan Wouters or an expert to confirm with one click."
4. **Sign in as Jan** and click "✓ Still right". Jan's claim goes from 50% to about 97% (the meeting cap lifts, his confirmation adds points). The answer for Brouwerij De Kroon becomes **22 days, trusted**. Who to contact first is now Jan: right 1 of 1, expert, dealt with it today in a meeting.
5. The general Belgian case ("Belgium · PC 200") still answers 20 days: the client exception stays with the client.

The other two tabs: "Teams message" ("Reminder for the team: a full-time employee in a five-day week gets 20 days of annual leave.") is learned as Sofie's claim and matches the law; "Email draft" ("Dear client, your employees are entitled to 24 days of annual leave this year.") is learned as Sofie's claim, contradicts the law and is capped at 20%. That low score also feeds her track record on the topic.

Exact percentages can shift if weights in `config.ts` change; the order of events does not. The scenario is covered by `src/trust-engine/loop.test.ts`.

## Mascot integration guide (for Isak)

Goal: the mascot (`mascot/brain.js`, main process only) sends what it already sees and hears to `POST /api/brain/ingest`, so nobody pastes anything. Today it only reads (`/api/trust/ask` as the guest).

### What the server requires

- **A real account, not the guest.** Ingest returns 403 for the guest session. Sign in with `POST /api/auth/login` `{ "username": "sofie", "password": "…" }`. The username must be a person in the knowledge base who has not left, and must be in the server's `AUTH_USERS` (create with `node scripts/create-users.mjs <id>`). The response sets the `session` cookie and returns `{ user: { id, name, role } }`. Sessions last 8 hours; on 401, sign in again.
- **Credentials from env, never committed.** Add `BRAIN_USER` and `BRAIN_PASSWORD` to the repo-root `.env` (already ignored by `.gitignore`) and add both names to `KEYS` in `mascot/env.js`. Without them the mascot falls back to the guest and only reads.
- **Same-origin check** (`sameOrigin` in `src/lib/auth.ts`, applied to login, ask, feedback and ingest). The rule: if the request has an `Origin` header, its host must equal the host the server sees in the request URL; if there is no `Origin` header, the request is refused only when `Sec-Fetch-Site: cross-site`. Node's `fetch` sends neither header, so requests pass today. Send `Origin: <origin of BRAIN_URL>` anyway: it states intent and keeps working if the check is tightened to require an Origin. Use exactly `new URL(BRAIN_URL).origin` (scheme + host, no path, no trailing slash).
- **Limits:** 20 ingest calls per user per minute, text up to 8,000 characters, body up to 10 KB.
- **Context:** the mascot's fixed case `{ country: "BE", pc: "200" }` is fine for any Belgian account.

### Ready-to-paste code for brain.js

Replaces `signIn` and `post`, adds `learn`. Matches the existing style (CommonJS, main process only, summarised output, never raw server data to a page).

```js
const ORIGIN = new URL(BRAIN_URL).origin; // sameOrigin check on the server
let me = null; // { id, name, role } of the signed-in account, null for the guest

// A real account can teach the brain; the guest can only ask.
async function signIn() {
  const account = env.BRAIN_USER && env.BRAIN_PASSWORD;
  const res = account
    ? await fetch(`${BRAIN_URL}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: JSON.stringify({ username: env.BRAIN_USER, password: env.BRAIN_PASSWORD }),
      })
    : await fetch(`${BRAIN_URL}/api/auth/guest`, { method: "POST", headers: { origin: ORIGIN } });
  if (!res.ok) throw new Error(`Sign-in failed (${res.status})`);
  cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  me = account ? (await res.json()).user : null;
}

async function post(path, body, retry = true) {
  if (!cookie) await signIn();
  const res = await fetch(`${BRAIN_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, cookie },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && retry) {
    cookie = null;
    return post(path, body, false);
  }
  if (!res.ok) throw new Error(`Brain error (${res.status})`);
  return res.json();
}

// Teaches the brain from everyday work. channel: "meeting" | "teams" | "email".
// Returns only what the mascot shows: what was learned, and whether it waits for a confirmation.
async function learn(text, channel) {
  if (!me) return { learned: [], skipped: 0 }; // guest: read-only
  if (!(text.match(VALUE) || []).length) return { learned: [], skipped: 0 }; // no value, nothing to learn; saves the rate limit
  const r = await post("/api/brain/ingest", { channel, text: text.slice(0, 8000), context: CONTEXT });
  return {
    learned: r.learned.map((e) => ({
      topic: e.factLabel,
      value: e.value,
      score: Math.round(e.claimScore.after * 100),
      waiting: e.caps.some((c) => /not confirmed/.test(c)), // meeting claim capped at 50% until the speaker or an expert confirms
      claimId: e.claimId,
    })),
    skipped: r.skipped.length,
  };
}

module.exports = { ask, check, learn, warmUp };
```

### When to call it

- **Meetings** (`onSegment` in `main.js`, after the wake-word check and only when the segment is not a question to the mascot): the extractor needs a speaker label for meeting text. Today the listener hears the user's own microphone only, so prefix the segment with the signed-in user's name: `` brain.learn(`${me.name}: ${text}`, "meeting") `` (export `me` or a `whoAmI()` helper). If diarization arrives later (system audio, a meeting bot), send one `"Full Name: text"` line per speaker turn. Unknown speakers are skipped on the server, which is the safe default.
- **Email and Teams** (the watcher and the demo compose window): send the user's own writing as `"email"` or `"teams"`. The author is always the signed-in user, whatever the text says. Do not send on every keystroke: half-typed values would become claims. Send when the message is sent, or when the text has not changed for about 10 seconds and the sentence ends with punctuation. The same sentence sent twice is deduplicated on the server.
- **Do not send** wake-word questions, small talk, or anything while offline. The online switch stays the single consent: offline means nothing is read, heard or sent.
- **Wrong values are still learned**, as low-scoring claims (e.g. capped at 20% when they contradict the law). That is intended: it feeds the writer's track record and the ledger. The warning (`check`) and the learning (`learn`) are independent; call `check` first so the user sees the warning.

### Showing the states

Map the `learn` result to quiet states. No pop-ups; this is background work.

| Result | Mascot state | Suggested text (on hover or in the card) |
|---|---|---|
| `learned` empty | stay calm | nothing |
| learned, `waiting: false` | brief nod, back to calm | "Learned: annual leave days 20 days (96%)" |
| learned, `waiting: true` | small dot or badge, not amber | "Learned from the meeting: 22 days for Brouwerij De Kroon. Waiting for Jan to confirm." |
| `ingest` 403 | calm, card shows a hint | "Sign in with your own account to teach the brain" |
| `ingest` 429 | ignore, retry the next segment | nothing |

If the signed-in user is the speaker of a waiting claim, or an expert, the card can offer "✓ Still right" / "✗ Wrong": `POST /api/trust/feedback { claimId, kind: "correct" | "wrong", context: CONTEXT }` (use `{ client }` as the context for a client claim, as `/loop` does). The response's `entry.claimScore.after` is the new score. To pick up confirmations by others, poll `GET /api/brain/ledger?fact=<factKey>` (send the cookie) and look for an entry with `kind: "confirmed"` and the same `claimId`.

## Not built yet, next steps

- **AI gates A1–A4** from `docs/trusted-tomorrow-algorithm.md` (is this knowledge, speech act, extract + quote, stance). Extraction is rules only: it catches values, topics, speakers, scope and common hedges, but not corrections ("no, it's 22"), questions that contain a value, or new topics. The gates would add those, with the same rule: the model reads, code validates (verbatim quote, unit, scope registry) and decides.
- **Real Teams, Outlook and meeting integration** (Microsoft Graph, OAuth, meeting transcripts with speaker metadata). Today input comes from `/loop` or the mascot.
- **Verification budget and lanes D4/D5:** asking only when a human answer would change the outcome, at most 3 questions per person per week, picking the verifier by track record. Today the claim simply waits for its speaker or an expert.
- **Best-before dates and headroom** (`forecast.ts`) and track-record authority inside the score itself (today track record is only used to rank contacts).
- **Persistence:** with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set, live claims and the ledger are shared by every server instance and survive restarts. Without them they live in memory: lost on restart and not shared between Vercel instances.
- No way yet to delete or correct a wrongly extracted claim other than voting it down.

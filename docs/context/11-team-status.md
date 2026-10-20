# Team status: what exists, what is planned, what is open

Snapshot of 20 Oct 2026, early afternoon. Update this file (pull, edit, push) whenever something lands, so every Claude session starts from the real state.

## The product in one line

**A calm desktop companion (the mascot) that checks what you write against Company brain, stays silent when you are right, and only interrupts when a trusted answer disagrees. Behind it, a trust loop keeps answers trusted over time and asks one expert one question only when their answer would change the outcome.**

It answers the final case: "Can your solution stay trusted without becoming another task?" and the briefing's "think electricity, think wifi" and "thousands of mentors".

## What is built

| Piece | Where | State |
|---|---|---|
| Company brain web app + trust engine (qualifier) | `src/`, `data/salary/` | Works. Six layers, hard caps, login, per-client access. Deployed at https://tavling-eight.vercel.app (Vercel project `tavling`). |
| **Desktop mascot** (Isak) | `mascot/` | Works. Electron, always on top, blob in an SD Worx cap. States: calm, thinking, warning. Click to ask a question; `Cmd+Shift+E` opens a demo email. Writing a wrong value (e.g. meal voucher €6.91) turns it amber with "Fix it". Talks to the deployed brain through a read-only guest session (`BRAIN_URL` to override). Hardened: contextIsolation, sandbox, CSP, IPC sender checks. |
| Email check | `mascot/brain.js` | Deterministic: sentences containing a value (€, %, days, weeks, months) are sent to `/api/trust/ask`; warns if the trusted value differs. No AI in the decision. |
| Context library | `docs/context/` (start at `README.md`) | Event, SD Worx, round 1, AI patterns, research on routing and cascades, Belgian payroll domain, playbook, final task analysis, our round 1 solution. |
| **Live loop** | `src/trust-engine/extract.ts`, `contacts.ts`, `src/lib/live.ts`, `/api/brain/ingest`, `/api/brain/ledger` | Works. Meeting transcript, Teams message or email in → deterministic extraction (value, topic, unit check, speaker, scope, hedges, verbatim quote) → live claims in the shared store → same six layers → ledger entry with every score before/after. Meeting claims −0.3 and capped at 50% until the speaker or an expert confirms; hedges −1; guests cannot teach; client claims only inside your portfolio. Answers now include "who to contact first" (scope, track record, confirmations, role, recency) and "last updated". 40 tests pass. Reference: `docs/context/12-live-loop.md`. |
| **`/loop` page** | `src/app/loop/` | Works. Feed text in, see the answer, who to contact, and why each score moved; one-click "Still right" for the speaker or an expert. Demo data: `data/salary/sources-holiday-days.json`. |
| Mascot → ingest | `mascot/brain.js`, `mascot/main.js` | Works for writing. With `BRAIN_USER` / `BRAIN_PASSWORD` in `.env` the mascot signs in as that user and, while online, sends what you wrote to `/api/brain/ingest`: the Apple Mail outgoing message and the demo compose window (after the text settles for 10 s and the sentence is finished). A quiet pill shows "Learned: …". Not from other apps (the focused element can hold messages by others) and not from meeting audio (the microphone cannot tell speakers apart, so nothing is put in your name). Meetings need speaker metadata first. Without an account it stays the read-only guest. The user must be in `AUTH_USERS` on Vercel. |
| Trust loop algorithm (proposal v2) | `docs/trusted-tomorrow-algorithm.md` | Partly built: the meeting setting (S1), track record for contacts, the ledger. Not built: AI gates A1–A4, best-before, lanes D1–D5, verification budget. |
| **Brain** (one living web, merged from Brain map + Who knows what) | `src/trust-engine/graph.ts`, `src/lib/brain-data.ts`, `/api/brain/graph`, `/brain` | Works. Force graph with topics in 5 domain regions (Pay, Benefits, Leave & absence, Working time, Contracts), coloured by trust status for the reference client. Two lenses on the same nodes: **People** (who knows what, knowledge CV per person) and **Sources** (documents by channel; click opens the document viewer with the quote highlighted). Brain health panel lists the topics that need a human. Polls every 8 s, so what the mascot learns appears live. The old mind map stays at `/brain/classic`; `/graph` redirects to `/brain`; the pipeline explanation moved to `/loop`. |

## The trust loop (full design, from `docs/trusted-tomorrow-algorithm.md`; the live loop above is the first built slice)

Rule: **AI at the edges, determinism in the core.** The model only reads; code decides; people confirm only when it changes the outcome.

- **S1 source setting switch:** gazette, policy, Teams, email, meeting, payroll runs each get a profile (prior, half-life, required AI gates, trust ceiling). Data in `config.ts`.
- **AI gates A1–A4** (Haiku, then Sonnet, then abstain): is this knowledge, speech act, extract value + verbatim quote, stance. Code validates every answer; results cached so scores replay deterministically.
- **Core upgrades:** authority from **track record** (Beta posterior, not job title), freshness counted from the last check, guarded silent confirmation from payroll usage.
- **Best-before date + headroom:** run the engine at future dates; the answer shows when it will stop being trusted and why.
- **S2 conflict types:** temporal, scope, hierarchy auto-resolve; reading re-runs AI; only genuine conflicts reach a human.
- **Lanes D1–D5:** AUTO-FIX · SILENT · WATCH · VERIFY (one click) · ESCALATE. D4 simulates the expert saying yes and no; if neither changes the answer, nobody is asked.
- **Verifier pick:** best track record on the topic, max 3 questions a week, piggyback on what they are already doing, ask leavers first.

Build order: `forecast.ts` → `lanes.ts` → `verifiers.ts` → setting profiles in `config.ts` → `src/lib/gates.ts` (with `MOCK_LLM=1`) → `lanes.test.ts`.

## Demo story (current draft)

Built today on `/loop` (topic: annual leave days, client Brouwerij De Kroon, signed in as Sofie):

1. The answer is 20 days (Belgian law, 96%). Who to contact: Anna. Set aside: Koen (left the company), Lukas (spoke about it in a meeting, but about Germany).
2. A meeting transcript goes in. Jan: "For Brouwerij De Kroon we agreed 22 holiday days…" becomes a client claim, capped at 50% and waiting for Jan. Tom's "I think everyone gets 25 days" is learned at about 1% (new hire, hedged, contradicts the law).
3. Jan clicks "Still right" once: his claim goes from 50% to about 97%, De Kroon's answer becomes 22 days, and Jan is now the first person to contact. The ledger shows exactly which points moved.

In the mascot (Isak): the email check turns amber on a wrong value with "Fix it"; next step is the mascot feeding meetings and emails to the same ingest route.

## Feedback principles (agreed in chat)

- Seed set is fixed: law, official notices, client agreements. Feedback cannot vote them down (TrustRank idea).
- Feedback weight = the giver's track record on that topic.
- Outcomes (payroll corrected, answer sent with no correction) outweigh opinions.
- One person counts once per claim; copies do not count; signals decay.
- Disagreement ("I know better") never changes a score directly. It can only trigger a question to someone with more authority.
- The mascot only reacts to factual statements in work apps, stores claims not text, and masks personal data before any LLM call. It is not "fly on the wall" surveillance.

## Open decisions

- Who builds the rest of the trust loop core (`forecast.ts`, `lanes.ts`, AI gates), or do we stop at the live loop.
- Who owns the pitch deck (PPT/PDF, 3 minutes). We cannot use our own device, so the demo must be a recording or screenshots inside the slides.
- Does the demo show the loop in the web app, in the mascot, or both.
- Aikido baseline: not yet run on this repo.

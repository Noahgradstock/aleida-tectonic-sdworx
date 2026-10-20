# Team status: what exists, what is planned, what is open

Snapshot of 20 Oct 2026, late morning. Update this file (pull, edit, push) whenever something lands, so every Claude session starts from the real state.

## The product in one line

**A calm desktop companion (the mascot) that checks what you write against Company brain, stays silent when you are right, and only interrupts when a trusted answer disagrees. Behind it, a trust loop keeps answers trusted over time and asks one expert one question only when their answer would change the outcome.**

It answers the final case: "Can your solution stay trusted without becoming another task?" and the briefing's "think electricity, think wifi" and "thousands of mentors".

## What is built

| Piece | Where | State |
|---|---|---|
| Company brain web app + trust engine (qualifier) | `src/`, `data/salary/` | Works. Six layers, hard caps, login, per-client access, 33 tests pass. Deployed at https://tavling-eight.vercel.app (Vercel project `tavling`). |
| **Desktop mascot** (Isak) | `mascot/` | Works. Electron, always on top, blob in an SD Worx cap. States: calm, thinking, warning. Click to ask a question; `Cmd+Shift+E` opens a demo email. Writing a wrong value (e.g. meal voucher €6.91) turns it amber with "Fix it". Talks to the deployed brain through a read-only guest session (`BRAIN_URL` to override). Hardened: contextIsolation, sandbox, CSP, IPC sender checks. |
| Email check | `mascot/brain.js` | Deterministic: sentences containing a value (€, %, days, weeks, months) are sent to `/api/trust/ask`; warns if the trusted value differs. No AI in the decision. |
| Context library | `docs/context/` (start at `README.md`) | Event, SD Worx, round 1, AI patterns, research on routing and cascades, Belgian payroll domain, playbook, final task analysis, our round 1 solution. |
| Trust loop algorithm (proposal v2) | `docs/trusted-tomorrow-algorithm.md` | Design only, not built. See below. |

## The trust loop (planned, from `docs/trusted-tomorrow-algorithm.md`)

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

1. Consultant writes a client email with an outdated value. The mascot stays quiet while typing, then turns amber: trusted value, score, source, expert. "Fix it".
2. Consultant clicks "I know better": nothing is overwritten; the code checks whether an expert's answer would change the outcome, and sends one Teams-style card to the best verifier.
3. The expert clicks once; the click becomes quoted evidence and resets freshness.
4. Brain health line: "1,240 facts · 1,236 maintain themselves · 4 needed a human".

## Feedback principles (agreed in chat)

- Seed set is fixed: law, official notices, client agreements. Feedback cannot vote them down (TrustRank idea).
- Feedback weight = the giver's track record on that topic.
- Outcomes (payroll corrected, answer sent with no correction) outweigh opinions.
- One person counts once per claim; copies do not count; signals decay.
- Disagreement ("I know better") never changes a score directly. It can only trigger a question to someone with more authority.
- The mascot only reacts to factual statements in work apps, stores claims not text, and masks personal data before any LLM call. It is not "fly on the wall" surveillance.

## Open decisions

- Who builds the trust loop core (`forecast.ts`, `lanes.ts`, `verifiers.ts`). Isak dropped his claim on it.
- Who owns the pitch deck (PPT/PDF, 3 minutes). We cannot use our own device, so the demo must be a recording or screenshots inside the slides.
- Does the demo show the loop in the web app, in the mascot, or both.
- Aikido baseline: not yet run on this repo.

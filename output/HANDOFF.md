# HANDOFF: Quiet Quorum (build session)

**One-liner:** "Your consultants already correct their AI agents every day. Quiet Quorum turns those corrections into trust, so nobody has to maintain anything."

All data in the demo is synthetic.

## A. The film (~3 min)

| Time | On screen | Said |
|---|---|---|
| 0:00–0:30 | Sofie's agent queue on Tuesday, cut-off Thursday. A meal-voucher draft for a PC 200 client shows full voucher days for a part-timer. | "Since June, 500 Belgian payroll consultants each run 7 AI agents. Sofie fixes this draft again. Is it her client, or is the agent wrong for everyone? Nobody can maintain documentation for 3,500 agents." |
| 0:30–0:50 | The trust card for the rule "meal vouchers: part-time days" shows **green 0.86**, with a small evidence strip. | "The agent is confident. So was the card. Stale, silently." |
| 0:50–1:40 | Sofie edits and submits. In the background, the diff is detected, the claim and quote are extracted, and the quote is verified. Evidence counter: **2 → 3 consultants, 2 teams**. | "We do nothing extra. Her correction is a signal. Code groups it by rule and scope. The LLM only extracts; code decides." |
| 1:40–2:10 | **WOW:** the card flips to **amber "disputed"** live. The Beta score falls and its formula is visible. The agent's next draft says *"Disputed rule, I won't guess. Ask Marc (validated 9 PC 200 rules)."* | "Three people, two teams, thirty days. The system goes quiet instead of being confidently wrong." |
| 2:10–2:35 | Marc's existing queue shows a two-line diff (old vs new claim, the 3 quotes) with **Confirm / Narrow scope / Reject**. Marc taps Confirm. The card turns **green with Marc's quote**, and the next agent draft is correct. | "Human judgement exactly once, where it adds value. One tap." |
| 2:35–3:00 | Impact strip (assumptions labelled): about 17 repeat corrections avoided per stale rule per month, expert effort of one tap instead of review cycles, and a privacy line saying it is aggregated, opt-in and has no per-person counts. | "Find it, trust it, keep it trusted, effortlessly. Turn complexity into confidence." |

## B. Build plan

### MUST features (the WOW first)
1. **Quorum engine.**
   - Build: a correction event of `{draft, final, author_team, scope}`.
   - Build: the LLM extracts `{claim_key, old_value, new_value, quote}`, and the code checks that the quote is in `final`.
   - Build: group by `claim_key + scope`, then a state machine `confident → disputed → validated`, with k≥3 authors, 2 or more teams and a 30-day window.
2. **Trust card UI.**
   - Build: state badge, Beta(α,β) score with the formula visible, aggregate evidence, scope chips, "ask Marc" route, and an "I don't know" state.
3. **Expert one-tap.**
   - Build: two-line diff, Confirm / Narrow / Reject, and write-back that makes the card validated so the next draft uses it.

**What we fake:**
- The payroll agents are canned drafts that read the card state.
- Teams and the queue are our own simple screens.
- The other consultants' corrections are seeded.
- Mock mode (`MOCK_LLM=1`) returns canned extraction JSON.

### Component contracts (agree before splitting the work)
- `POST /api/corrections` takes `{draftId, finalText}`, with the session giving the author. It returns `{cardId, state, evidence:{authors, teams}}`.
- `GET /api/cards/:id` returns `{claim, scope, state, alpha, beta, score, evidence[], expert, validatedQuote?}`, scoped to the session user.
- `POST /api/cards/:id/verify` takes `{action: confirm|narrow|reject, scope?}`. Expert role only. Code enforces the transition `disputed → validated`.
- `getDraft(agentId)` returns `{text, confidence | abstain, route?}` from the card state.

### Roles
- **Dev 1:** security core (auth, sessions, roles: consultant and expert), and the quorum engine plus its state machine and tests.
- **Dev 2:** LLM extraction (one client module, zod, quote check, mock mode) and synthetic data.
- **Dev 3:** UI: agent queue, trust card, expert one-tap, impact strip.

**Stack:** Next.js App Router, Tailwind, SQLite or in-memory, zod, Anthropic SDK, Vercel.

### Synthetic data
- 3 Belgian rules (meal-voucher part-time, eco-vouchers, PC 200 indexation).
- 6 consultants in 3 teams, 1 expert (Marc).
- 2 seeded corrections on rule 1, plus 1 control rule with a client-specific correction that must **not** reach quorum.

### Scenarios
- **A:** quorum is reached and the expert confirms (the demo).
- **B:** one team corrects only its own client, so scope keeps it from leaking and there is no flip.

## C. Safe and clean
- Synthetic data only, secrets in env vars, no `NEXT_PUBLIC_` keys.
- Human sign-off on every validation, enforced on the server by role.
- Follow `AIKIDO-INSTRUCTIONS.md`: Section 1 (top 15 rules), Section 3 (agent contract) and Section 5 (security core).
- Specific to this build:
  - Author and team come from the session, never the body.
  - Verify requires the expert role.
  - Card lookups are scoped (no IDOR).
  - Rate-limit and size-limit the LLM route.
  - Treat draft and final text as untrusted.
- Privacy: aggregate evidence only, no per-person counts, and a retention note.

## D. Pitch
- **One-liner:** "We don't ask anyone to maintain knowledge. We listen to the corrections they already make."
- **Hard questions:**
  1. *"Three can be wrong."* Quorum only makes the agent abstain. Only an expert promotes. Scope blocks client quirks.
  2. *"Surveillance?"* It is aggregated per rule, opt-in, and has no person metrics. It is designed for works-council review.
  3. *"Isn't this your qualifier again?"* No. TrustLens needed owners and review dates. Here trust is a by-product of work.
- **Backup:** record the demo by 15:00, and keep screenshots of all 4 states (confident, disputed, verify, validated).

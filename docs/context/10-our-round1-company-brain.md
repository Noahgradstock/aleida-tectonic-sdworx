# Our Round 1 solution: Company Brain (Aleida.ai)

- Repo: https://github.com/Noahgradstock/company-brain
- Live: https://tavling-eight.vercel.app (Vercel project `tavling`, team `isaks-projects-e1e37b6a`, Node 24)
- Vercel env: `GEMINI_API_KEY`, `SESSION_SECRET` (dev + prod). `AUTH_USERS` is missing, so the demo runs in guest mode. No Upstash Redis, so votes/sessions are kept in memory.
- Team: Ilke Seynaeve, Isak Andersson, Noa Gradstock
- Stack: Next.js (App Router) + TS, deterministic trust engine in `src/trust-engine/` (~900 lines, no AI in scoring), Gemini only for question routing.

## Pitch in one sentence
"One answer from policies, Teams, email and the law, and the reason you can trust it."

## Flow
Ask (any language, Gemini routes to a topic) → Search (law, SharePoint, Teams, email) → Filter (does this apply to this customer? if not, filtered out with a reason) → Score (six layers) → Decide (answer, conflicts, expert) → Learn (feedback: correct / wrong / outdated / not my case).

## Trust algorithm (log-odds)
Each source is split into **claims** (one statement, one value, one scope: country/PC/customer). Starts at 50%, layers add/subtract points (log-odds: +2 ≈ 88%, −2 ≈ 12%).

| Layer | Question | Points |
|---|---|---|
| 1 Authority | Who said it? | official +3 · expert +1 · new hire −0.5 · author has left −1 |
| 2 Freshness | Still current? | −1 per half-life of the topic (max −2) · written before a rule change −2.5 |
| 3 Corroboration | Who agrees? | expert 👍 +0.5 each · colleague says the same +0.7 · corrected in a reply −1.5 |
| 4 Consistency | Matches the law? | match +2 · contradicts −3 · customer contract that deviates = exception +0.5 |
| 5 Relevance | Fits the case? | customer +1.5 · sector +1 · country +0.3 · other country/sector: excluded |
| 6 Feedback | Did it work for others? | votes weighted by role, max ±2, cannot outvote the law |

**Hard caps:** contradicts the law → max 20% · written before the current rule → max 30% · no expert/official source → max 60%.
**Winner:** the most specific trusted claim (≥ 75%). Customer contract beats sector rule. Two trusted claims with different values → "experts disagree".
**Fact status:** trusted / conflict / stale / orphan. 3 "not my case" votes from the same country+sector → the claim is hidden there (learns scope).

24 test questions across 19 payroll topics, all pass (`npm test`).

## Security (already done, Aikido-aligned)
Session cookie HMAC, scrypt, rate limits, per-customer access in every route, voter = session user, CSRF protection, PII masking before Gemini, security headers, guest read-only. One Aikido autofix (file inclusion) merged.

## "Unfinished" in Round 1 = exactly what the final asks for
| Unfinished in Round 1 | The final's question |
|---|---|
| Claims are written by hand in `sources.json`. LLM extraction ("Layer 0") not built | "Automate what can reasonably happen in the background", "without asking people to document" |
| Author's track record is a fixed role, not computed from history | "Who really knows this? Learn from signals created through everyday work" |
| Feedback is kept in memory | "Stay useful, reliable and up to date" |

## The data
`data/salary/`: 19 topics (meal vouchers, eco vouchers, company car, indexation, sick leave, telework, students, dismissal, mileage, minimum wage, overtime …), each topic with an official text, a Teams export (JSON), a SharePoint guide (md), a customer email (eml). `meal-voucher-scenario/` has people.json, usage_log.json, teams_questions.json: good raw material for signals.

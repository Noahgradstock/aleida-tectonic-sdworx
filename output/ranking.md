# Judge: jury simulation and ranking

# Jury simulation: Tectonic final, SD Worx track

## 1. Juror reactions to each 3-minute demo

| Idea | SD Worx product lead | Senior payroll/legal expert | Business juror |
|---|---|---|---|
| **H1 Quiet Quorum** | "This plugs into our June agent rollout. Who keeps 500 consultants' agents current? This does." | "Quorum plus scope tags plus an expert sign-off. That is how we already settle disputed rules." | "Three people fix the same thing and the system notices. I get it in 10 seconds." |
| **S2 Practice-vs-Paper** | "Useful, but it is a procedure-audit tool, not calm tech." | "Thirty-one deviations could be thirty-one compliance breaches. Careful." | "The '31 of 36' number lands." |
| **S3 Silent Dissent** | "Right signal, but where does the consultant see why?" | "Three corrections without scope are noise." | "Clever, but it feels like a backend." |
| **H3 Tripwire** | "Legal Watch already owns the law-change moment." | "Re-checking past answers has real value, but who sends the correction?" | "The timeline lighting up is nice, but I have seen it before." |
| **H2 Last Week Before Leaving** | "Good for acquisitions, but it fires once and then goes stale." | "Leavers often leave before anyone asks them." | "Handover packs are not new." |
| **S4 Shadow Twin** | "Predicting every expert answer means reading all of Teams. No." | "An LLM grading legal nuance? I would not trust it." | "'Card says 3 months, Marc said 6' is a strong line." |
| **S1 TrustLens Autopilot** | "Your qualifier plus a decay curve." | "Where do the weights come from?" | "Every team has trust cards today." |
| **TrustLens-extended (bar)** | "Owners and review dates: that is the maintenance we said we cannot ask for." | "Solid citator logic." | "It is a chatbot with badges." |

## 2. Weights (as instructed)

| Criterion | Weight | Official criterion it feeds |
|---|---|---|
| Customer understanding (CU) | 15 | Fit |
| SD Worx fit, including "stays trusted without another task" | 15 | Fit |
| Originality | 15 | Creativity |
| Story and WOW | 15 | Creativity |
| Trust and explainability | 10 | Fit and Creativity |
| Technical complexity | 10 | Technical ability |
| Impact | 10 | Fit |
| Complete and visual (buildable by 3 people in ~5h) | 10 | Technical ability |

Security (10%) is a constant across ideas. It is handled through the Aikido rules and scored on execution, not on the idea.

**Score justifications, one line per idea:**
- **H1:** a real moment (CU 4); hits the agent rollout and needs no new task (Fit 5); a rare developed signal (Orig 4); a live flip and one tap (Story 4); visible quorum math plus quote evidence (Trust 4); diff, clustering, quorum and Beta score (Tech 4); impact can only be argued from assumptions (Impact 3); all synthetic diffs, so feasible (Build 4).
- **S2:** Marco's doubt is vague (CU 3); still document-centric (Fit 4); fresh (Orig 4); strong number (Story 4); good evidence (Trust 4); step extraction plus diff (Tech 4); assumptions only (Impact 3); needs a realistic procedure and 36 tickets (Build 3).
- **S3:** CU 4, Fit 4, Orig 4. No narrative arc (Story 3) and no visible "why" (Trust 3). Tech 4, Impact 3, Build 4.
- **H3:** CU 3, and Legal Watch overlap (Fit 3, Orig 3). Story 4, Trust 4, Tech 3, Impact 3, Build 3.
- **H2:** a sharp role-change moment (CU 4), but it fires once and does not keep anything current (Fit 3). Orig 3, Story 3, Trust 3, Tech 3, Impact 3, Build 4.
- **S4:** CU 3, Fit 3. Novel (Orig 4) with a good line (Story 4). An unreliable LLM judge (Trust 3, Tech 3). Impact 2, Build 3.
- **S1:** CU 3, Fit 3. Crowded (Orig 2). Story 3, Trust 4, Tech 3, Impact 2, Build 4.
- **TrustLens-extended:** CU 3. It needs maintenance (Fit 2). Already seen (Orig 2). Story 3, Trust 4, Tech 3, Impact 2, Build 4.

## 3. Ranked table

| # | Idea | CU | Fit | Orig | Story | Trust | Tech | Impact | Build | **Weighted /5** | Strongest objection, then fix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **H1 Quiet Quorum** | 4 | 5 | 4 | 4 | 4 | 4 | 3 | 4 | **4.05** | "Three consultants can all be wrong, and corrections are client-specific." **Fix:** scope tags (country, PC, client); require authors from 2 or more teams; quarantine means the agent abstains, never rewrites; only the expert promotes the replacement. |
| 2 | S2 Practice-vs-Paper | 3 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | **3.65** | "It legitimises non-compliance." **Fix:** drift never promotes itself; an expert labels it "new standard" or "compliance flag". |
| 3 | S3 Silent Dissent | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3.65** | "It is an invisible backend." **Fix:** add a trust card and a human route, which turns it into H1. |
| 4 | H3 Tripwire | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 3 | **3.25** | "This is Legal Watch's turf." **Fix:** position it as Legal Watch's downstream consumer, with private draft corrections. |
| 5 | H2 Last Week Before Leaving | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 4 | **3.25** | "It fires once and goes stale." **Fix:** none within the case. |
| 6 | S4 Shadow Twin | 3 | 3 | 4 | 4 | 3 | 3 | 2 | 3 | **3.20** | "It is surveillance, and the LLM judge is unreliable." **Fix:** limit it to the ticket pipeline and abstain below N=5. |
| 7 | S1 TrustLens Autopilot | 3 | 3 | 2 | 3 | 4 | 3 | 2 | 4 | **2.95** | "It is the qualifier plus a formula." **Fix:** it needs an unmaintained signal source, which is H1. |
| 8 | TrustLens-extended (bar) | 3 | 2 | 2 | 3 | 4 | 3 | 2 | 4 | **2.80** | "It runs on owners and review dates, which is maintenance." **Fix:** replace review dates with work signals, which is H1. |

## 4. Winner: H1 Quiet Quorum. Backup: S2 Practice-vs-Paper

**Why H1 wins:**
- It is the only candidate whose trust signal is a by-product of work that already exists: consultants correcting agent drafts after the June 2026 rollout.
- It answers all 5 case questions with one mechanism, and the human acts only at quorum.
- It beats S2 because it improves trust continuously rather than auditing a document, and carries no compliance risk.
- It beats TrustLens-extended because the review dates, the maintenance the organiser ruled out, are replaced by corrections nobody has to make on purpose.
- S2's ticket-deviation signal can be added later as a second H1 input.

## 5. Winner details

**Protagonist and moment of doubt:**
- Sofie is a Belgian SME payroll consultant running 7 agents, on Tuesday before Thursday's cut-off.
- Her meal-voucher agent confidently drafts part-time voucher days for a PC 200 client (synthetic data).
- She has corrected the same thing before. Is it her client's quirk, or is the agent wrong for everyone? She has no time to ask around.

**WOW in one sentence:**
- Sofie's correction is the third, from two teams, within 30 days.
- Live on stage, the trust card flips to "disputed", the agent stops guessing and says "disputed, ask Marc", and Marc confirms a two-line diff with one tap in his existing queue.
- The card turns green with his quote, and the next consultant's draft comes out right.

**3 MUST features:**
1. **Correction capture with scoped quorum.**
   - Compare the agent draft with the final version Sofie submits.
   - The LLM extracts a structured claim plus a verbatim quote; the quote is checked against the source, and the claim is dropped if the check fails.
   - Code groups corrections by claim key and scope (country, PC, client).
   - Code enforces the state machine: confident → disputed (agent abstains) once k≥3 distinct authors from 2 or more teams correct within the window.
2. **Trust card with visible rules.**
   - A Beta(α,β) score from confirmations and corrections, with weights shown and editable.
   - Evidence shown in aggregate only ("3 consultants, 2 teams"), plus scope and "last confirmed by Marc, 20 Oct".
   - An explicit "I don't know, ask Marc" state.
3. **One-tap expert verification inside the existing workflow.**
   - A two-line diff with three choices: confirm, narrow the scope, or reject.
   - The result is written back as a new validated card that the agents use immediately.
   - Expert attribution only with opt-in consent.
   - Privacy: no per-person correction counts, data minimisation and retention limits, an opt-out, and a works-council note in the README.

**Impact: assumptions only, no results.**
- Assume 500 consultants and one stale rule that would be corrected about 20 times a month across teams.
- Quorum then stops repeat corrections after 3, which would avoid roughly 17 corrections per rule per month.
- Label every figure in the pitch as an assumption.
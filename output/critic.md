# Red team critic

# Red-team review: 30 ideas, Tectonic final (SD Worx)

## 1. Convergence map (crowded: other teams will pitch these too)

| Theme | Agents | Verdict |
|---|---|---|
| Trust that decays and heals from evidence, not review dates (Autopilot, Half-Life, Living Claims, Error Budget, Trust by Practice) | B, C, D, E, F, H, I, J | **Very crowded.** Any team with a qualifier "trust card" will pitch "self-healing trust". |
| Expert's chat reply becomes a credited card (Answer Exhaust, Mentor Residue, Echo, Quiet Mentor, Relief) | A, E, H, I, J | **Crowded**, and close to bans 3 and 5. |
| Role-change handover brief (Inheritance Mode, Client Scars, Portfolio Brief) | A, B, C, D, F, J | **Crowded.** |
| Law-change blast radius | A, B, C, E, F, G, H, J | **Crowded**, and next to Legal Watch. |
| Time-scrubber or replay as the WOW | F, H, I, J | **Crowded.** A replay also feels like a simulation, not a live event. |
| Bus-factor or single-point-of-knowledge map | B, D, F | Crowded. |
| Agent corrections as a signal | A, B, C, D, F, I, J (raw lists); C and F developed it | Crowded in the raw lists. **Rare as a developed idea**, which makes it our best lead. |

## 2. Kill list

- **Mentor Ledger / Interruption Ledger (J-C, D-6):** counting named people's repeat answers is an individual activity metric. Works councils will refuse it.
- **Quiet Mentor Ledger (G-B), Quiet Mentors (F-B):** an expert finder with a consent screen is still ban 4.
- **Attention Budget (D-C):** the protagonist is a CFO, not a person in doubt. Every input is invented euros. Keep only its value-of-information ranking as a mechanism.
- **Retro-Radar (G-C):** encoding payroll law as rules duplicates the internal 2025 hackathon winner and pre-run validation tools (Papaya, ADP). It cannot be credible in 5 hours and does not address knowledge decay.
- **Why Ledger standalone (E-C):** it needs causal config-change logs nobody has. Keep "reason expired" as a sub-feature.
- **Wikipedia-bot auto-fix (H-7):** the AI changes knowledge with no human. Unsafe.
- **Answer bonds (I-9), wrong-answer insurance (D-7):** reputation staking and blame tracing. Toxic.
- **Acquisition Rosetta/dialect map:** never developed, no mechanism.
- **Trust Error Budget (H-A):** this is TrustLens with an SRE chart. Merge it into S1.

## 3. Survivors and the strongest juror objection

**S1 TrustLens Autopilot.** Pitch: trust cards that score themselves from tickets, reuse and law events, with no review dates. Protagonist: Giulia, ex-HR Service Srl, week 2. WOW: an injected CAO change turns the dependent cards amber. Mechanism: Beta(α,β) per claim with decay.
- **Objection:** "It's your qualifier plus a formula. Who decides that a ticket 'contradicts' a card, and where do the weights come from?"
- **Fixable:** name one signal source that nobody maintains and nobody else has (see H1), and show the weights as editable.

**S2 Practice-vs-Paper.** Pitch: compares procedures with what resolved tickets show people actually do. Protagonist: Marco, inheriting 40 clients. WOW: 31 of 36 tickets deviate from step 7. Mechanism: LLM extracts steps, code diffs them, threshold of 5 or more cases and 70% agreement.
- **Objection:** "The deviation might be non-compliance. You would make bad practice official."
- **Fixable:** drift never promotes itself. An expert labels it "new standard" or "deviation", and a deviation becomes a compliance flag.

**S3 Silent Dissent / Correction Capture.** Pitch: consultants' fixes to agent output act as votes, and a rule is quarantined at a quorum. Protagonist: Sofie, who runs 7 agents. WOW: three corrections and the agent switches from confident to abstaining. Mechanism: diff of draft against final, embedding clusters, k≥3 independent authors within a time window.
- **Objection:** "Corrections are noisy and often client-specific. Three consultants can all be wrong."
- **Fixable:** tag scope (country, PC, client), make quarantine mean "abstain" rather than "rewrite", and have an expert approve the replacement.

**S4 Shadow Twin.** Pitch: the system silently predicts the expert's answer, and agreement becomes the trust score. WOW: "Card says 3 months, Marc said 6."
- **Objection:** "You predict on every human question, so you read all Teams traffic. An LLM judge cannot reliably compare nuanced legal answers."
- **Fixable:** limit it to the agent and ticket pipeline, and abstain below N=5.

**S5 The Payslip Is the Test.** Pitch: a card used before a payroll retro-correction loses trust. WOW: the card flips before anyone complains.
- **Objection:** "Correlation is not cause, and card-use logging is new instrumentation."
- **Minor:** use a Wilson lower bound and an abstain state. It also works as a signal inside H1.

**S6 Answer Exhaust.** Pitch: an expert's normal reply becomes a scoped, quoted card.
- **Objection:** "Copilot already does this. Publishing my chat sentence under my name without asking is attribution without consent."
- **Fixable but weak:** require opt-in and a veto. Creativity stays low.

**S7 Inheritance Mode + Client Scars.** Pitch: a role-change event builds a per-client list of deviations with evidence.
- **Objection:** "This is your Handover Copilot. The leaver is often already gone."
- **Fixable:** frame it as deviation detection run before the leaver goes.

**S8 Seven Questions.** Pitch: a leaver answers only the topics where they are the only answerer. WOW: the "only Marc knows" map shrinks.
- **Objection:** "That is still a task, and ranking who is irreplaceable is profiling."
- **Minor:** it is the one valuable human moment. Keep it as a component, because it is a one-off and does not keep anything trusted over time.

**S9 Blast Radius.** Pitch: after a rule changes, find answers already given that used the old rule. WOW: past answers light up on a timeline.
- **Objection:** "A list of who gave wrong answers is a blame list."
- **Fixable:** show each author only their own items, as private "draft corrections ready".

**S10 Pheromone Trails.** Pitch: routes to people decay and are reinforced only by resolved cases.
- **Objection:** "That is expertise profiling of personal data plus an ant animation. It is ban 4 with buzzwords."
- **Fatal as the main pitch.** It can survive as a one-line route under a card.

## 4. Hybrids

**H1 Quiet Quorum (S1 + S3 + S5 + S6).** Pitch: trust cards maintained by corrections people already make.
- **Protagonist:** Sofie, a Belgian SME consultant running 7 agents, two days before cut-off.
- **WOW, live:** three scripted consultants correct the same meal-voucher output. The card flips red with the evidence. The agent says "disputed, ask Marc". Marc taps confirm on a two-line diff. The card goes green with his quote, and the agent is confident again.
- **Mechanism:** draft-vs-final diff, scope tagging, k≥3 quorum, a Beta score computed by code, and quote-verified extraction.
- **Why it beats its parents:**
  - TrustLens lacked a signal source nobody has to maintain.
  - Silent Dissent lacked a visible trust explanation and a route to a human.
  - It answers "who keeps the agents' knowledge current?" for the June 2026 rollout to 500+ consultants.

**H2 Last Week Before Leaving (S7 + S8 + Attention Budget's value-of-information ranking).** Pitch: a role change produces a client brief built from work records, and the leaver is asked at most 3 high-value questions.
- **Why it beats its parents:** the brief alone is a summary, and the questions alone have no context.
- **Weakness:** it is event-driven, so it does not answer "stays trusted over time".

**H3 Tripwire (S9 + S2 + "reason expired").** Pitch: a Pay Transparency or CAO change flags cards whose reason has expired and the author's own past answers, with corrections drafted for the author to send.
- **Why it beats its parents:** Legal Watch only looks forward.
- **Risk:** it sits on Legal Watch's turf.

## 5. Against the bar to beat (TrustLens + Capture Loop + Ask-an-Expert)

- **S1 alone is not better.** It is the bar plus a decay curve, and many teams will pitch it.
- **S6 and S10 are not better than Capture Loop and Ask-an-Expert.** They are just as crowded and carry more GDPR risk.
- **H1 is genuinely better for this case:**
  1. The signal is created by the work itself, which is exactly the case's "learn from signals already created".
  2. The human acts only at quorum, which matches "verification when valuable".
  3. It is tied to a current SD Worx event that no competitor covers.
  4. It is buildable on synthetic diffs with `MOCK_LLM`.
- **H2 is our second choice.**
- **Recommendation:** build H1. Use a live injected correction as the WOW instead of a replay slider, and add S5 as a second signal only if there is time.
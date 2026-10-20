# Raw ideas (10 ideators)

# Lens 1: Internal user shadow

## 10 raw ideas
1. Answer Exhaust: an expert's thread reply becomes a scoped, quoted rule.
2. Inherited Portfolio Brief: a role change auto-writes "what's unusual about your clients".
3. Shadow Twin: the system predicts the expert's answer silently, and agreement or disagreement becomes the trust signal.
4. Team-level "who gets asked what" heatmap, with no individual profiles.
5. Acquired-team dialect map: HR Service Srl terms mapped to SD Worx terms.
6. Cut-off-day "last handled by" trail.
7. Agent-override mining: consultants correcting their AI agents shows which rules drifted.
8. Law-change ripple: a Pay Transparency update flags the practices it breaks.
9. Mentor credit ledger: the repeat-question load an expert absorbs.
10. Decision archaeology: "why" reconstructed from past ticket corrections.

Kept: 1 (solid), 2 (solid), 3 (bold, the one other teams won't think of).

---

## A. Answer Exhaust (solid)
**Pitch:** The expert's normal reply becomes trusted knowledge, with no extra step.

- **Customer:** Giulia, an ex-HR Service Srl consultant in week 2, asks in Teams: "Do we pro-rate this bonus for a mid-month exit?" She needs an answer, a name and the scope it applies to.
- **Movie:** Giulia asks. The colleague Marc replies as usual. A background extractor proposes a rule card (scope: BE, PC 200, exits) quoting Marc verbatim. Marc gets a one-tap "yes, that's what I meant" under his own message. Two weeks later, a colleague asks the same thing and gets the card with Marc's name.
- **WOW:** The card appears from a reply nobody wrote as documentation.
- **Fit:** It extends TrustLens, and the trust card is now produced rather than maintained. It differs from Guru-style nags because there is no review queue.
- **Five questions:**
  1. Automatic: extraction, scope tagging, and dedup against existing cards.
  2. Human: one tap, only when the card would be reused.
  3. Burden: nothing to maintain, because cards expire on observed contradiction rather than a review date.
  4. Workflow: it stays inside Teams and tickets.
  5. Transparency: the card shows the quote, the person and the date.
- **Trust and safety:** The LLM extracts JSON and the code checks that the quote exists verbatim. Opt-in per channel, and the expert can detach their name. Synthetic data only.
- **Tech:** Structured extraction with zod validation, substring quote verification, and embedding-based dedup. The reuse count is rules-based.
- **Numbers:** [ASSUMPTION] An expert answers about 20 repeat questions a month at about 10 minutes each, which is about 3.3 hours. If 60% are deflected, that saves about 2 hours per expert per month. With 500 consultants, that is about 1,000 hours a month. This is illustrative, not measured.
- **Why now:** The June 2026 acquisition of HR Service Srl brings in a team whose tacit knowledge must merge.
- **Risk:** Low. This is the baseline demo and is buildable in 5 hours.

## B. Inherited Portfolio Brief (solid)
**Pitch:** When a colleague changes role, their clients' hidden quirks brief you automatically.

- **Customer:** Tom takes over 40 SME payroll clients on cut-off day minus 2. His doubt: "What did Sofie know that isn't in the file?"
- **Movie:** The role change in the HR feed triggers the system. It diffs each client's history against the standard procedure and lists deviations ("this client's meal vouchers are paid net, approved by the owner in March"). Tom sees a one-page brief ranked by risk before the run, and one sentence says whom to ask.
- **WOW:** "Sofie's 11 undocumented habits" listed with evidence, before she has left.
- **Fit:** It answers "who knows this customer" and "why we do it this way", and it serves the 500+ consultants in the agentic rollout. It is more than the existing handover pack because it surfaces deviations, not summaries.
- **Five questions:**
  1. Automatic: deviation detection.
  2. Human: Sofie confirms only high-risk items, in 2 minutes.
  3. Burden: it is triggered by an event, not a schedule.
  4. Workflow: the brief arrives in the consultant's existing queue.
  5. Transparency: each item links to its source cases.
- **Trust and safety:** The detection rules are transparent and an LLM only phrases the result. Case data is already processed under contract, with no profiling of people.
- **Tech:** Case-history vs baseline-rule diff, with a risk score from fixed weights (amount, legal exposure, recency).
- **Numbers:** [ASSUMPTION] A handover takes about 8 hours of shadowing today. A brief could save about half, so 4 hours across roughly 100 handovers a month is about 400 hours.
- **Why now:** The agentic rollout means portfolios are reshuffled constantly.
- **Risk:** Medium. It needs convincing synthetic case history.

## C. Shadow Twin (bold)
**Pitch:** Trust measured by how often knowledge predicts what experts actually do.

- **Customer:** Anneleen, a senior payroll legal expert, is tired of reviewing cards. She wants to know which rules are still true without being asked.
- **Movie:** Every incoming question is answered silently by the system before a human replies. When the human answers, the two are compared. Agreement raises that card's trust, and disagreement drops it and shows Anneleen a two-line diff: "Card says 3 months, Marc said 6 after the new CAO." A new card is drafted from Marc's reply.
- **WOW:** A card turns red live when a "stale" fact is contradicted, with no review date involved.
- **Fit:** This is the "silent accuracy" half of Legal Watch's "AI drafts, human validates", turned into a continuous backtest. No competitor shows predictive calibration of knowledge.
- **Five questions:**
  1. Automatic: the prediction, comparison and scoring.
  2. Human: only on disagreement.
  3. Burden: the work experts already do is the test set.
  4. Workflow: nothing changes for the expert.
  5. Transparency: the score is "predicted correctly in 14 of 16 recent cases".
- **Trust and safety:** The score is computed by code from agreement counts. The LLM only judges "same answer?" and returns a label with a quote. Experts are never ranked and agreement is aggregated per card.
- **Tech:** Prediction backtesting, a Beta-posterior trust score with time decay, and an LLM judge constrained to a JSON verdict.
- **Numbers:** [ASSUMPTION] If review is replaced by about 20% disagreement events, reviewer effort falls by about 80%. This is unmeasured.
- **Why now:** About half of employees trust how their employer uses AI (SD Worx research), and the score makes trust visible.
- **Risk:** Medium to high. The judge must be reliable, so mock mode needs scripted disagreements to guarantee the WOW.

---

## Insight
Experts' ordinary replies are the free ground truth. Make trust a by-product of work they already do (agreement and disagreement), not a score someone must refresh. Pitch it as "the expert never opens our tool".

# Lens 2: Handover & onboarding

## 10 raw ideas
1. Trust decays from practice drift, not review dates.
2. Client "scars" card for an inheriting consultant: what went wrong before, and why.
3. Leaver's "7 questions": ask only what nobody else can answer.
4. Tacit-diff for acquired teams: their actual practice against SD Worx procedure.
5. Orphan-topic radar: topics where one person is the only answerer.
6. Auto-successor routing: when someone changes role, questions reroute to whoever answered next.
7. Day-30 newcomer "unknown unknowns" digest from the questions peers asked in their first month.
8. Agent-memory drift: flag payroll agents' knowledge when the humans they shadow change behaviour.
9. Mentor credit ledger: shows the expert how many repeat questions they were spared.
10. Law-change blast radius mapped onto how people actually work.

Kept: **A** (solid, extends TrustLens), **B** (solid), **C** (bold, the one other teams won't pick).

---

## A. TrustLens Live
**Pitch:** Trust cards that age and heal from observed practice, never from review reminders.

- **Customer:** Giulia, an ex-HR Service Srl payroll consultant in week 2. She asks "how do we handle a retro correction after cut-off here?" and needs to know whether people actually do it that way, not only what the manual says.
- **Movie:**
  1. Giulia gets the documented procedure.
  2. Its card is amber: 70% of the last 40 comparable cases were handled differently since the Pay Transparency change.
  3. The card shows the dominant real path and who handled most of those cases.
  4. One tap routes the question to her, with the two-line context pre-filled.
- **WOW:** A card flips green to amber live as synthetic case events stream in. No one reviewed anything, and the card says why in a sentence.
- **Fit:** Builds on TrustLens, which is the stated expectation ("don't start over"). Guru, Glean and Copilot use review nags and recency. Nobody scores trust by behavioural divergence. [ASSUMPTION: we found nothing doing this; not searched.]
- **Five questions:**
  1. Automatic: step extraction, event matching, drift score.
  2. Human: only when drift passes a threshold, one expert confirms "new standard" or "deviation".
  3. Burden: zero review dates, and alerts fire only on divergence.
  4. Workflow: a card chip sits inside the ticket or Teams reply.
  5. Understandable: one-sentence "why amber", with the cases listed.
- **Trust and safety:**
  - Code computes the score with visible rules.
  - The LLM only parses procedure steps into checkable predicates.
  - Signals are team-level, minimum 5 cases, with no individual ranking.
  - A works-council-friendly data-protection impact assessment note goes in the README.
- **Tech:**
  - Procedure-to-predicate extraction (structured JSON, verbatim-quote evidence).
  - Case-event log matching.
  - Drift = share of recent cases violating a predicate, with an exponentially weighted window.
  - Thresholded state machine.
- **Numbers:** [ASSUMPTION] 500 consultants × 15 min/week spent on "is this still how we do it?" ≈ 1,875 h/week. Even 20% saved is about 375 h/week, roughly 9 FTE. These are our estimates, not SD Worx data.
- **Why now:** The June 2026 Pay Transparency deadline made procedures stale overnight, and the agentic rollout means agents inherit stale rules.
- **Risk:** The event stream is synthetic, so the jury must accept it as a stand-in for ticket and payroll-run logs. Buildable in about 4h.

## B. Client Scars
**Pitch:** Inheriting a client? Get the history of what bit the last owner.

- **Customer:** Pieter, a Belgian SME payroll consultant taking over 40 clients when a colleague moves role. His moment of doubt is the day before a client's first run: "what do I not know about this client?"
- **Movie:**
  1. Pieter opens one client.
  2. Three "scars" appear: a PC 200 sector exception, a bank-cutoff quirk, and a manager who sends changes late.
  3. Each scar links to the ticket or email thread that proves it.
  4. The previous owner gets a one-line "still true?" only on scars the system cannot confirm from recent runs.
- **WOW:** Pieter picks a client and sees a scar timeline from corrections and reopened tickets. The previous owner confirms one with one tap.
- **Fit:** Portfolio rotation is real, and Belgian SME consultants are the agent-rollout group. Handover tools list documents. Scars come from failures, where the tacit "why" lives.
- **Five questions:**
  1. Automatic: scar mining from reopened tickets, corrections and escalations.
  2. Human: owner confirms only low-corroboration scars.
  3. Burden: nothing is written ahead of time.
  4. Workflow: a client sidebar in the existing tool.
  5. Understandable: each scar shows its evidence count.
- **Trust and safety:**
  - A scar needs 2 or more independent incidents, or it is labelled "single signal".
  - It carries no personal data about client employees.
  - Employee names are masked.
- **Tech:**
  - Event clustering (embeddings plus rules) of incidents per client.
  - LLM extraction of cause and fix with a verbatim quote.
  - Rule-based corroboration score.
- **Numbers:** [ASSUMPTION] If a handover costs 2 h per client of reading and asking, 40 clients is 80 h, and a 50% cut saves 40 h per rotation.
- **Why now:** The agentic rollout is reshuffling portfolios.
- **Risk:** Scar quality depends on the synthetic incident design. Feasible in about 5h.

## C. The Seven Questions (bold)
**Pitch:** When an expert changes role, ask them only what nobody else knows.

- **Customer:** Marc, a senior legal-payroll expert moving teams next month, with 12 years of tacit knowledge and no time to write it down.
- **Movie:**
  1. HR marks Marc's role change.
  2. The system ranks topics where Marc was the sole or dominant answerer.
  3. It prepares 7 specific questions, each tied to a past case ("In case X you advised Y, why?").
  4. Marc answers by voice in 10 minutes, and each answer becomes a signed, dated card.
- **WOW:** A leaver heat map of "only Marc knows" topics shrinks live as he answers, and a newcomer then gets the answer with his name credited.
- **Fit:** Talent shortage, with experts leaving or moving. It targets the "why we do it this way" the organiser asked for. Marc gets credit and approves what is attributed to him. Human judgement is used exactly where it adds value.
- **Five questions:**
  1. Automatic: answerer concentration, question drafting, card creation.
  2. Human: the leaver validates 7 answers, which is the one moment of value.
  3. Burden: ten minutes, once, and only for unique knowledge.
  4. Workflow: voice or Teams message.
  5. Understandable: the risk map shows before and after.
- **Trust and safety:**
  - Consent is required, and answers are revocable.
  - Only routing metadata is used (who answered which topic), not message content ranking people.
  - The output is a topic risk, not a performance score.
- **Tech:**
  - Single-point-of-failure (bus-factor) metric: topic-level answerer entropy, with a threshold.
  - Case-grounded question generation.
  - Speech-to-text.
  - Validate-and-store with attribution.
- **Numbers:** [ASSUMPTION] If one departure costs 3 months of reduced productivity for 2 successors, even a 20% cut is real money, but we won't claim a figure in the demo.
- **Why now:** Acquisitions bring ex-owners and leavers at the same time.
- **Risk:** The voice flow is a stretch, so fall back to text. The entropy map is easy to build, about 4h.

---

## Insight
Trust should decay and recover from what people **do**, with human attention reserved for the single moment of highest value (a leaver, or a rule that visibly stopped being followed). Pitch it as "we replaced the review cycle with evidence."

# Lens 3: SD Worx strategist

# Lens: SD Worx strategist

*Annual-report test: "Knowledge that maintains itself while 500+ consultants run AI agents, and acquired teams merge faster." No web search used; facts come from the team briefing.*

## Raw ideas
1. Trust scores computed from work exhaust, not review dates.
2. Consultant overrides of agent output act as free validation or dissent.
3. Legal Watch events automatically invalidate dependent cards (dependency graph).
4. Value-of-information exit interview: ask a leaver 3 questions, not 300.
5. Acquisition merge map: "how HR Service Srl does X vs how we do X".
6. Mentor dividend: experts see deflected questions and control attribution.
7. Decision "why-trail" mined from ticket and PR comments.
8. Trust decay as a half-life that only shows at the moment of use.
9. Aggregated, opt-in "routes of asking" instead of a skills directory.
10. Shadow-mode agent playbooks learned from consultant corrections.

Kept: A (solid), B (solid), C (bold).

---

## A. TrustLens Autopilot
**Pitch:** Trust cards that re-grade themselves from daily work signals, with zero review chores.
- **Customer:** Giulia, a payroll consultant, 2 days before the cut-off. She finds a rule about meal vouchers. She needs to know whether it is still true for this PC (joint committee).
- **Movie:** She opens the card inside her normal tool. It shows amber: "Contradicted by 3 resolved tickets this month, and a CAO update landed Tuesday. Last confirmed by Marc, 4 months ago." Nobody was asked to review anything. One click pings Marc with the evidence.
- **WOW:** We inject a synthetic CAO change live. Cards that depended on it turn amber within seconds. Nobody touched the wiki.
- **Fit:** It extends our qualifier TrustLens and follows the Legal Watch pattern (AI detects, expert validates). Competitors' Guru-style freshness depends on nag reminders.
- **Five questions:**
  1. Automatic: signal ingestion, scoring, impact tracing.
  2. Human: only when a card's score drops below a threshold AND it is used often.
  3. Maintenance: there are no review dates. Decay is driven by evidence.
  4. Workflow: the card appears where the answer is used.
  5. Understandable: it shows 1 colour and 1 sentence, and the full receipt expands on demand.
- **Trust:** Code computes the score from visible rules (weighted signals: contradiction, confirmation, source change, age). The LLM only extracts claims and quotes, and drops claims with no verbatim evidence. The signals are about content, not people.
- **Tech:** Claim extraction to JSON with zod validation; a claim-to-source dependency graph; Bayesian-style Beta(α,β) confidence updating per claim (confirm +α, contradict +β, time decay).
- **Numbers:** If 2,000 cards are reviewed 2 times a year at 15 min each, that is 1,000 hours a year. We replace this with roughly 5% escalations [ASSUMPTION].
- **Why now:** The Pay Transparency Directive changes rules, and Legal Watch rolls out.
- **Risk:** Low. It is buildable in 5 hours, but it can look like "just the qualifier again".

## B. Inheritance Without Interview
**Pitch:** Portfolio handover assembled from exhaust, asking the leaver only what matters most.
- **Customer:** Tom takes over 40 SME clients from a colleague who changes role next week. He needs to know "how we do it for each client, and why".
- **Movie:** The system builds a per-client brief from tickets, past payroll corrections and email threads. Each line carries a confidence. The leaver gets one 5-minute prompt with the 3 questions that would remove the most uncertainty.
- **WOW:** A ranked "3 questions worth asking" list. It shows that the other 297 questions were answered from exhaust.
- **Fit:** It is needed for agentic AI (agents also inherit portfolios) and for acquisitions (HR Service Srl: about 350 clients). It is not a chatbot over documents.
- **Five questions:**
  1. Automatic: draft brief, gap detection.
  2. Human: the leaver answers only high-impact gaps.
  3. Maintenance: it is generated on demand, never stored as a document that goes stale.
  4. Workflow: it is a ticket-tool side panel.
  5. Understandable: gaps are marked "unknown, ask X".
- **Trust:** Every line has a quote. Abstention is explicit. Client data is synthetic.
- **Tech:** Retrieval plus claim-level entailment checking; value-of-information ranking (uncertainty × client impact × frequency).
- **Numbers:** If a handover takes 6 hours and we cut it to 2, 4 hours are saved per handover [ASSUMPTION]. At 100 handovers a year, that is 400 hours.
- **Why now:** The June 2026 acquisition and the payroll team restructuring.
- **Risk:** Medium. The VOI ranking must look credible, and the data is synthetic.

## C. Silent Dissent (bold)
**Pitch:** Every agent correction is a vote; knowledge self-heals when consultants disagree repeatedly.
- **Customer:** Sofie, a consultant managing 7+ agents. Her agent applies an outdated rule, and she fixes it in 10 seconds without writing any note.
- **Movie:** Her fix is silently recorded as a signed dissent. Two other consultants correct the same rule. The rule is quarantined, so agents stop using it and flag "unsure". One expert receives one proposed fix with the 3 anonymised cases, and approves it with one click.
- **WOW:** Three scripted consultants "fix" the same agent output. The knowledge card flips red and the agent switches from confident to abstaining, live.
- **Fit:** Nobody has a closed loop from consultant behaviour to agent knowledge. It answers "who keeps agents' knowledge current?" directly. The idea is not in the competitor list, which covers Workday, ADP and others.
- **Five questions:**
  1. Automatic: capturing edits, clustering, quarantining.
  2. Human: one expert, only at quorum.
  3. Maintenance: the corrections are the maintenance.
  4. Workflow: consultants do nothing new.
  5. Understandable: the agent says "this rule is disputed" in plain language.
- **Trust:** Quarantine is deterministic (k≥3 independent consultants, within a time window). The LLM only classifies what changed. Dissent is aggregated and anonymised, which is the GDPR and works council answer: no individual scoring.
- **Tech:** Diff of agent output vs final output; embedding clustering of corrections; quorum threshold with a per-rule dissent counter.
- **Numbers:** If 500 consultants make 3 corrections a week, that is 1,500 signals a week [ASSUMPTION]. Previously, none of them were reused.
- **Why now:** The agentic rollout started in June 2026.
- **Risk:** Medium-high. Simulated corrections must look real, and the quorum rule needs careful tuning.

---

## Insight
Do not make "keeping it trusted" a feature. Make **every normal action a trust signal** (a correction, a resolved ticket, a legal update) and only surface people at the moment of highest value. The line for the stage and the README is: "We replaced review dates with evidence, and review meetings with one-click decisions." Always show the **count of chores removed** next to the one human decision left.

# Lens 4: Business value / CFO

## Raw ideas (10)

1. Interruption Ledger: meter repeat questions per expert in euros and auto-deflect them.
2. Trust half-life: each answer decays with evidence (law feed, corrections, owner change) instead of review dates.
3. Inheritance Mode: a role change in the HRIS triggers an auto-built portfolio handover.
4. Attention Budget Allocator: ask humans only where expected loss exceeds the cost of their minutes.
5. Acquisition Rosetta: map the tacit "how we did it" of HR Service Srl onto SD Worx processes.
6. Time-returned receipt: a weekly statement to each expert of the minutes the system saved them.
7. Wrong-answer insurance: log every answer used in a payroll run and trace errors back to the card.
8. Single-point-of-knowledge radar: flag topics where one person answers more than 80% of questions.
9. Agent knowledge steward: keep the 7+ payroll agents per consultant fed with current rules.
10. Exit-interview-by-exception: a 3-minute voice debrief, only for single-point topics.

**Kept:** #3 (solid), #2+#6 (solid), #4+#8 (bold, the one other teams won't think of).

---

## Idea A: Inheritance Mode (solid)
**Pitch:** When a consultant changes role, their portfolio's tacit knowledge hands itself over.

- **Customer:** Giulia, a payroll consultant. On Monday she inherits 60 SME clients from Marc, who has moved to the agentic-AI team. Her doubt: "What did Marc know about these clients that isn't in the file?" She needs to see what is solid and what is a gap.
- **Movie:**
  1. HRIS role-change event fires.
  2. Per client, a brief is built from past tickets, corrections and thread resolutions. Each quirk is shown with its evidence quote.
  3. Topics that only Marc ever answered are flagged "single point of knowledge".
  4. Marc gets one 3-minute question list, only for those items.
- **WOW:** Giulia opens client #14. The brief says "Meal vouchers: paid per worked day, not per contract day. Source: 3 corrections, last one in March. Only Marc knew; confirm with him (2 min)." She taps Confirm and a validated card exists.
- **Fit:** Mirrors "AI drafts, expert validates" (Legal Watch). It is not a chatbot, search bar or expert directory. Handover is a trigger, not a Q&A.
- **Five case questions:**
  1. Automatic: briefs are built from the role-change event and existing tickets.
  2. Human: only for single-point items, once.
  3. Maintenance: no documentation step. It is regenerated from signals.
  4. Workflow: the brief appears in the case tool when the portfolio is assigned.
  5. Understandable: a one-page brief with a green, amber or grey state per quirk.
- **Trust and safety:** Code decides the state, from rules: n corroborating signals means green, one source means amber, none means grey. The LLM only extracts quirks and quotes, and drops any claim whose quote isn't found. Uses ticket and case data only, not individual activity profiling, so the GDPR footprint is small. Works-council friendly.
- **Tech:** Structured-output extraction with verbatim-quote verification. Entity linking from client to ticket. Single-point detection through answer-share concentration (Herfindahl index) per topic.
- **Numbers:** [ASSUMPTION] 15% of the 500+ Belgian consultants change portfolio per year, which is 75 handovers. Saving 24 ramp-up hours each at €55/h loaded gives about €99k per year. That is small. The value is error avoidance: one avoided correction cycle per handover at about €300 [ASSUMPTION] adds only about €22k. Scaled to all 27 countries, roughly 5x [ASSUMPTION].
- **Why now:** The June 2026 agentic rollout means portfolios are being reshuffled now, and HR Service Srl adds about 350 clients to merge.
- **Risk:** Moderate. Synthetic tickets make the WOW buildable in about 4h. The weakness is that the euros are modest.

## Idea B: Trust Half-Life with Time-Returned Receipt (solid, extends TrustLens)
**Pitch:** Trust cards that decay by evidence, not review dates, plus a receipt of time returned.

- **Customer:** Pieter, a senior payroll expert who gets the same indexation question about 20 times a month. He needs the questions to stop without having to write anything.
- **Movie:**
  1. A junior asks in Teams.
  2. The answer is a prior, expert-validated reply, shown with a trust card.
  3. A Pay Transparency rule change lands in the feed.
  4. The card's half-life shortens, and it only goes amber where the new rule actually touches it.
  5. Friday: Pieter gets a receipt: "47 questions answered without you. 9.4h returned. 2 need your eyes."
- **WOW:** On a rule-change event, one screen dims 31 cards to amber. The system proposes the diff on 2 cards, and Pieter fixes them with one click.
- **Fit:** TrustLens already exists, so this is the extension the organisers asked for. It removes the owner-review chore, which is exactly the maintenance debt Guru-style nags create.
- **Five case questions:**
  1. Automatic: decay and deflection.
  2. Human: only where the rule diff affects a card.
  3. Maintenance: no review dates.
  4. Workflow: it lives inside Teams.
  5. Understandable: a weekly receipt, and a colour only when a card changes.
- **Trust and safety:** Decay is a visible formula: age × signal weights (corrections, contradicting answers, law-feed hits, owner departure). The LLM compares old and new rule text. A person approves any change to a card.
- **Tech:** Exponential decay with evidence-weighted hazard rates. Semantic matching of a law diff to cards, with a verbatim-quote check. Duplicate-question clustering with embeddings.
- **Numbers:** [ASSUMPTION] 1,500 experts, 15 repeat questions per month at 12 min each (including refocus). Deflecting 40% gives 1.2h per expert per month, or 21,600h per year. At €55/h that is about €1.2M a year. Pilot cost is not estimated.
- **Why now:** Cost-to-serve pressure with like-for-like growth at 3.5%.
- **Risk:** Low. It is mostly UI plus a scripted event.

## Idea C: Attention Budget (bold)
**Pitch:** Verification is a budget. Ask humans only where expected loss beats their minutes.

- **Customer:** Sofie, a knowledge lead, and the CFO behind her. Her doubt: "Where is human verification actually worth the money?"
- **Movie:**
  1. Every card gets an expected-loss score: P(stale) × uses × P(harm) × cost of harm.
  2. Each expert has a cap, for example 10 minutes a week.
  3. The system fills that cap with the highest-ROI checks and leaves the rest unverified, labelled as such.
- **WOW:** A slider for the cap. Drag 0 to 20 min and the live chart shows risk euros falling, with a diminishing-returns knee at about 8 min.
- **Fit:** "Zero unnecessary effort" turned into a mechanism. No competitor frames verification as a priced resource.
- **Five case questions:**
  1. Automatic: scoring and ranking.
  2. Human: only above the ROI threshold.
  3. Maintenance: capped by design.
  4. Workflow: a single weekly digest item.
  5. Understandable: it shows the formula and the ranked list.
- **Trust and safety:** All scoring is transparent arithmetic and the AI never sets a score. Aggregated per topic, not per person.
- **Tech:** Expected-value ranking. Greedy knapsack selection under the time cap. Monte Carlo risk bands.
- **Numbers:** Example card: P(stale)=0.4, 200 uses a month, 2% harm, €250 per harm gives €400 a month at risk, versus a 4 min check at about €3.7. Every input is an [ASSUMPTION], so the demo must label them as such.
- **Why now:** CFO-grade justification for calm technology, and a cap on effort that answers "another task?".
- **Risk:** Medium. The inputs are invented, so the credibility hinge is showing them as editable assumptions.

---

## Sharp insight
Make the cost of maintenance a number the product reports on itself. Show "human minutes spent per 100 answers", plus a weekly time-returned receipt. Calm technology wins the room when the jury can see that effort fell and risk didn't rise. Unmeasured, "no extra task" is just a claim.

Sources: none searched. Figures come from the team briefing (500+ consultants, about 350 HR Service Srl clients, 3.5% like-for-like growth). All other numbers are [ASSUMPTION].

# Lens 5: Competitor & tool gap mapper

## Gap map (from memory, no web search run)
- **Glean / Copilot / Slack AI:** retrieve and summarise whatever the user may access. "Trust" means permissions and citations, not whether the content is still true. No view of conflicts with actual practice.
- **Guru / Confluence / Notion verified badges:** trust is a human's periodic check on a timer. That is the maintenance chore, and the badge is wrong the day after the rule changes.
- **Viva Topics:** auto-built topic pages and "experts", but it was retired by Microsoft [ASSUMPTION: 2025]. Auto-curation without a trust signal did not stick.
- **Stack Overflow for Teams:** accepted answers and votes need people to curate.
- **HR vendor AI (Joule, Illuminate, Oracle Pay Analyst):** explain a payslip or policy line. None track whether the policy is still how the team works.
- **Empty gap:** nobody derives trust from behaviour (what colleagues actually did last week). Nobody records the "why" behind a rule or knows when that reason has expired.

## 10 raw ideas
1. Trust from practice: a card is confirmed when resolved cases match it.
2. Divergence alerts when practice and docs split.
3. Consent-based "who solved this before" routing from case metadata.
4. Repeat-question harvesting into a draft card with one-tap approval.
5. Handover pack triggered by an HR role-change event.
6. Law-change ripple onto affected procedures.
7. Why Ledger: rationale linked to the change that caused a rule.
8. Expiring reasons: flag rules whose cause was repealed.
9. Agent memory ledger for the 7+ payroll agents per consultant.
10. Metadata-only signals (category, outcome, country), never content.

Kept: A and B (solid), C (bold).

---

## A. Trust by Practice (TrustLens v2)
**Pitch:** Trust cards renew themselves from what colleagues actually do, not from review dates.
- **Customer:** Giulia, ex-HR Service Srl payroll consultant, week 2. She sees an Italian leave-accrual card that looks fine and doubts it fits SD Worx's setup. She needs "is this how we really do it, as of now?"
- **Movie:**
  1. Giulia asks.
  2. The card shows "Confirmed by 9 of the last 10 resolved cases (IT, PC-equivalent X)".
  3. One card is amber: "last 3 cases did it differently".
  4. She sees both paths side by side, plus who handled them.
- **WOW:** We drop in a synthetic case where the practice has silently changed. The card flips green to amber with no one touching it, and the divergent cases are shown.
- **Fit / not done:** Guru and Glean use review timers, not behavioural evidence. It extends our TrustLens pick, as the organisers asked.
- **Five questions:**
  1. Automatic: matching cards to resolved tickets and re-scoring.
  2. Human: only on divergence, one yes/no to an owner.
  3. Maintenance: zero scheduled reviews, alerts only on measured drift.
  4. Workflow: the card appears inside the existing answer surface (Teams or mysdworx).
  5. Understandable: a three-word state plus "why" on tap.
- **Trust & safety:** the LLM only extracts structured "action taken" from a ticket. Code compares and scores with visible rules. A person decides on divergence. Aggregated and no individual attribution, so GDPR-light.
- **Tech:** embedding retrieval to link ticket to card, LLM structured extraction (JSON, quote-verified), a deterministic agreement score with a time-decay half-life.
- **Numbers:** [ASSUMPTION] 2,000 cards, 5% truly stale, 20 min of review per card. Timer reviews cost 2,000 × 20 min ≈ 670 h/year. Drift-triggered review touches about 100 cards, ≈ 33 h, a ~95% cut.
- **Why now:** the 500+ consultants with agents create a flood of resolved cases to learn from.
- **Risk:** building the divergence flip live is realistic with scripted tickets. The risk is that "practice" looks fabricated, so we show the raw cases.

## B. Quiet Mentor
**Pitch:** The right colleague is found from solved cases, and their repeated answers become cards.
- **Customer:** Marc, a senior Belgian SME payroll consultant asked the same Dimona question 20 times a month. The newcomer needs "who has dealt with this?"
- **Movie:**
  1. The newcomer's question gets "3 colleagues resolved similar cases, Marc most recently".
  2. Marc gets one pre-drafted answer in Teams with an Approve button.
  3. The next 19 askers get it instantly, credited to him.
- **WOW:** Marc taps once and his inbox of repeated questions visibly drops, with a "questions saved" counter.
- **Fit / not done:** this goes beyond a plain expert directory in three ways: opt-in, a load cap, and credit. SD Worx has "thousands of mentors".
- **Five questions:**
  1. Automatic: clustering repeat questions and drafting the answer.
  2. Human: the mentor approves only what carries their name.
  3. Maintenance: no profiles to fill in.
  4. Workflow: it lives in Teams.
  5. Understandable: "why Marc" shows the case count, never a ranking of people.
- **Trust & safety:** opt-in with a DPIA and works-council note. Case metadata only, no message content. Mentors can hide topics. A workload cap stops over-routing.
- **Tech:** question clustering (embeddings plus HDBSCAN), a load-aware ranker with a visible formula, LLM draft with verbatim evidence.
- **Numbers:** [ASSUMPTION] 20 repeats a month × 10 min = 3.3 h per expert. With 100 such experts, that is about 4,000 h/year freed.
- **Why now:** the HR Service Srl merge brings a team whose experts nobody knows yet.
- **Risk:** the GDPR optics. Mitigate by showing the consent screen in the demo.

## C. The Why Ledger (bold)
**Pitch:** Remembers why a rule exists and tells you when that reason has expired.
- **Customer:** Pieter, a consultant inheriting a portfolio. He asks "why is this client's cafeteria plan set up this way, and is it still needed?"
- **Movie:**
  1. A config or ticket change is linked to the Legal Watch item or thread that caused it.
  2. Pieter sees "Set up this way because of rule X (2023)".
  3. Rule X was superseded, so the card is flagged "reason expired".
- **WOW:** We load a Pay Transparency update. Three client set-ups flip to "reason may have expired" with the causal chain drawn.
- **Fit / not done:** the pattern is Legal Watch plus the missing history. Nobody models rationale or its expiry [ASSUMPTION].
- **Five questions:**
  1. Automatic: causal linking at change time.
  2. Human: an expert confirms only when a reason expires.
  3. Maintenance: the ledger is written by events, not people.
  4. Workflow: it appears in the review screen or ticket he already uses.
  5. Understandable: a single chain graph.
- **Trust & safety:** LLM proposes links, the code requires a verbatim-quote match, and an expert validates expiry. This is client data, so only synthetic data is used.
- **Tech:** event-sourced change log, entity linking, a provenance DAG with validity intervals.
- **Numbers:** unquantified. We would show only "cards touched by a law change", counted from the synthetic set.
- **Why now:** the Pay Transparency deadline and agent rollouts mean many rules are changing at once.
- **Risk:** the hardest to make credible in 5 hours, so we limit it to 5 scripted chains.

---

## Sharp insight
Every competitor makes trust a stored attribute (an owner and a date). Make it a computed signal from behaviour, with the proof visible and a human asked only on divergence. That is what turns the answer to "another task?" into "no, the card checked itself, and here is the evidence".

# Lens 6: 2026 tech wow

# Ideator: 2026 tech wow lens

## 10 raw ideas
1. Claims with decay curves that heal from work signals.
2. Provenance lineage: every rule traced to the decision or meeting it came from.
3. Silent conflict detector between two colleagues' chat answers.
4. Meeting-to-"why" extraction from transcripts.
5. Screen-recording or screenshot to "how we do it here" procedure.
6. Law-change shockwave through a dependency graph (Pay Transparency Directive).
7. Who-knows graph from resolved threads, with consent.
8. Bus-factor radar: knowledge at risk when someone changes role.
9. Agent-drift detector for the 7+ payroll agents per consultant.
10. Corrections-as-documentation: a human overriding an agent becomes verified knowledge.

Kept: 1 plus 2 (A), 7 plus 8 (B), and 10 plus 9 (C, bold).

---

## A. Living Claims (solid): TrustLens that maintains itself
**Pitch:** Knowledge as claims whose trust decays and heals from everyday signals, not reviews.

- **Customer:** An ex-HR Service Srl consultant in week 2, asking "How do we handle retro payroll after the cut-off here?" She needs to see whether the answer is current and applies to her.
- **Movie:**
  1. She asks in Teams.
  2. The answer shows a quiet trust card with a lineage line.
  3. A claim sits amber because a newer ticket contradicts it.
  4. The system asks one expert one yes/no question.
- **WOW:** A time slider. We replay 18 months of synthetic events and watch trust scores decay and heal live. A Pay Transparency Directive update turns 6 claims amber, and the system asks for one confirmation, not six reviews.
- **Fit:** It extends our TrustLens pick, which the organisers asked for. Legal Watch handles law; this handles company practice. Guru-style nags are replaced by evidence-driven alerts.
- **5 questions:**
  1. **Automatic:** claim extraction, evidence linking and decay.
  2. **Human:** only when uncertainty and impact are both high.
  3. **Burden:** zero scheduled reviews.
  4. **Workflow:** it lives in Teams and the ticket tool.
  5. **Understandable:** a one-line reason plus a colour.
- **Trust and safety:** Code computes the score from visible rules. The LLM only extracts claims with verbatim quotes, and unverifiable quotes are dropped. A person decides contested cases.
- **Tech:**
  - Claim ledger with typed evidence (supports, contradicts, supersedes).
  - Exponential half-life decay per domain: law is fast, process is slow [ASSUMPTION: tuned by hand].
  - Value-of-information ranking: ask a human only if `P(wrong) x impact > threshold`.
  - Lineage via a provenance DAG.
- **Numbers:** Assume 1,000 claims, 5% flagged per month, 2 min per check. That is about 100 min a month, against roughly 33 hours for a quarterly review of all claims [ASSUMPTION].
- **Why now:** Directive transposition in 2026, plus the HR Service Srl merge.
- **Risk:** Low. Seed data is scripted, so the WOW is buildable in about 4 hours. Decay tuning can look arbitrary, so expose the parameters.

## B. Quiet Mentors (solid): who has done this before
**Pitch:** A consented, topic-level experience graph that routes questions to a mentor without burning them out.

- **Customer:** A payroll consultant inheriting a colleague's portfolio, who asks "Who dealt with this client's sector rules?"
- **Movie:**
  1. A role change is detected.
  2. A Handover view lists knowledge only the leaver holds, found from threads and tickets.
  3. She sees "3 people solved similar cases; Marc is at capacity, ask Elena".
- **WOW:** The bus-factor map. When the leaver is removed, nodes go dark and show exactly which topics lose coverage.
- **Fit:** It is not a skills directory, because it infers from resolved work and not from self-declared skills. It targets the "thousands of mentors" quote.
- **5 questions:**
  1. **Automatic:** graph building and handover detection.
  2. **Human:** the expert confirms or rejects attributions about themselves.
  3. **Burden:** none for the expert, with a load limit.
  4. **Workflow:** it surfaces inside Teams.
  5. **Understandable:** "why this person" evidence in one line.
- **Trust and safety (GDPR):** Opt-in, topic-level only, no message text stored beyond a hash plus a short excerpt. The expert can hide or correct attributions, and there are no performance scores. It needs a works council review [ASSUMPTION].
- **Tech:** Entity resolution of people to topics, a bipartite graph with recency-weighted edges, and betweenness centrality to find single points of failure. Round-robin routing with a capacity cap.
- **Numbers:** If an expert gets 20 repeat questions a month at 10 min each, that is 3.3 hours a month. Deflecting 50% saves about 1.7 hours per expert per month [ASSUMPTION].
- **Why now:** Acquisitions and 500+ consultants changing workflows.
- **Risk:** Medium. It can look like surveillance, so lead with the consent UI in the demo.

## C. Correction Capture (bold): corrections are the documentation
**Pitch:** When a consultant fixes an AI draft, that fix quietly becomes verified, attributed knowledge.

- **Customer:** A Belgian SME payroll consultant managing 7+ agents. The moment of doubt is "Did the agent apply the right sector rule?"
- **Movie:**
  1. Giulia overrides the agent's meal-voucher answer.
  2. The diff plus her reason is captured as a claim, with no form.
  3. Three days later, a colleague's agent answers correctly: "learned from a Giulia correction, confirmed twice".
- **WOW:** A live before and after of the same question. The wrong answer becomes right, with a lineage trail back to the correction.
- **Fit:** The June 2026 agentic rollout creates a new maintenance problem: who keeps the agents' knowledge current? Others will build Q&A, not a feedback loop.
- **5 questions:**
  1. **Automatic:** diff capture and claim promotion.
  2. **Human:** a one-tap confirm only when two corrections conflict.
  3. **Burden:** it uses work already done.
  4. **Workflow:** inside the agent review step.
  5. **Understandable:** a "learned because" chip.
- **Trust and safety:** Promotion follows a transparent rule (for example 2 independent corrections, no conflict). Model output is never executed. Corrections stay scoped to country and client type, and poisoning is limited by requiring independent authors.
- **Tech:** Structured diff of draft versus final, LLM rationale extraction with a quote check, scope tagging, an agreement counter, and conflict detection that routes to a human.
- **Numbers:** If 500 consultants each make 5 corrections a week, that is 2,500 signals a week. Documenting those by hand would be a chore nobody does [ASSUMPTION].
- **Why now:** The agent rollout is happening now.
- **Risk:** Medium-high. Agents are mocked, but the loop is real and runs on `MOCK_LLM`.

---

## Sharp insight
Do not show a knowledge base. Show **trust moving over time**. A slider where confidence decays, then heals from ordinary work, makes "no maintenance" visible in 10 seconds and is the part the jury will repeat at dinner. Every claim should carry a one-line "why this changed" explanation.

# Lens 7: Rules & multi-country edge

## 1. Raw ideas
1. Validity envelope on every claim (country, PC, date range), inferred from the text.
2. Law-change blast radius: find answers already given that the change makes wrong.
3. Number-bearing answers expire on known dates (indexation, thresholds).
4. Aggregate, opt-in expertise map built only from public answer events.
5. Expert-owned attribution ledger: the expert sees and vetoes what is credited to them.
6. Same word, different meaning: detect where an acquired team's rule differs from ours.
7. Counterfactual replay: re-run past cases under a new rule to size the exposure.
8. Raw signals deleted after extraction; only claim plus pointer is kept.
9. Per-type decay half-lives replace review dates.
10. Works-council mode: a per-country switch that changes what may be mined.

Kept: **A (solid), B (solid), C (bold, the one other teams won't have).**

---

## A. Blast Radius
**Pitch:** When a rule changes, find the answers already given that just became wrong.
- **Customer:** Marta, payroll consultant, Belgian SME team. Her agents applied a CAO rule last month. She needs to know whether she gave clients a stale answer.
- **Movie:** Legal Watch flags a changed rule. Blast Radius scans resolved tickets, Teams answers and agent outputs for claims that cited it. Marta gets one calm digest line: "4 of your answers since 1 July used the old threshold. Draft corrections ready."
- **WOW:** Change a rule live. The affected past answers light up on a timeline, each with its client and the person who gave it.
- **Fit / not done:** Legal Watch looks forward (publishing). This looks backward at what was already said. Pay Transparency transposition makes it timely.
- **5 questions:**
  1. Claim extraction, dependency linking and diffing run automatically.
  2. A human verifies only when the matched answer is high-impact and the match is uncertain.
  3. Nobody maintains anything. Claims link to rules by citation, not by owner review.
  4. It appears as a digest in Teams or mysdworx.
  5. One line per item with an expandable "why flagged".
- **Trust/safety:** The LLM extracts claims with a verbatim quote. Code matches rule IDs and dates. A human sends any correction. Only the sender's own answers are shown to them.
- **Tech:** Structured extraction with a quote-check, a claim-to-rule-ID dependency graph, and a temporal validity interval on every claim (bitemporal: valid-from and recorded-at).
- **Numbers:** [ASSUMPTION] 500 consultants × 5 rule-dependent answers a month = 2,500. If 3% are affected, that is about 75 caught items a month, with the cost of one retro correction unknown.
- **Why now:** The agentic rollout means agents give answers too. The Pay Transparency changes are in force.
- **Risk:** Matching accuracy. Build on 10 seeded rules and 40 scripted answers.

## B. Quiet Mentor Ledger
**Pitch:** Expertise inferred from public answers, shown to the expert, vetoable, never ranked.
- **Customer:** Giulia, an ex-HR Service Srl consultant in week 2. She asks "who handles Italian-to-Belgian cross-border cases?"
- **Movie:** She asks in her usual channel. She gets a person and a reason: "answered 11 such threads, last in Sept". The expert, Luc, sees the same line in his ledger and can remove it. His load cap stops her being routed to him a 12th time.
- **WOW:** Luc taps "not me". The routing changes immediately and the credited evidence disappears.
- **Fit / not done:** This is not a plain expert finder. The twist is that the person controls the profile and the evidence is auditable.
- **5 questions:**
  1. Signals come from public-channel answers that got a thumbs-up or resolved a thread.
  2. The expert checks only a monthly "what we credit you for" line.
  3. The profile is derived, decays on its own and has no forms.
  4. It lives in Teams as a reply suggestion.
  5. Every suggestion shows its evidence count and date.
- **Trust/safety:** Opt-in, with aggregate counts only. No DMs, no performance use, and raw text is deleted after extraction. A DPIA is needed [ASSUMPTION]. Works-council mode can restrict it by country. The ledger doubles as the GDPR access-right view.
- **Tech:** Topic extraction, exponentially decayed evidence scores, a capacity-aware router, and a minimisation pipeline.
- **Numbers:** [ASSUMPTION] If 20 repeat questions a month cost 15 minutes each, that is 5 hours a month saved per expert. Across 1,000 experts that is 5,000 hours a month.
- **Why now:** The HR Service Srl integration. Trust in AI is only about 50% (SD Worx research).
- **Risk:** It looks like surveillance. The consent and veto UI is the answer to that, and it is buildable in ~3h.

## C. Retro-Radar (bold)
**Pitch:** Replay last year's cases through the new rule and show what would change.
- **Customer:** Head of payroll compliance, asked "if this applies from 1 January, how many past outcomes differ?"
- **Movie:** A new rule version is added. The system replays 12 months of anonymised synthetic cases. A heat map by country and PC shows 212 cases that would differ, and the 3 rules responsible.
- **WOW:** A slider moves the effective date and the exposure number changes live.
- **Fit / not done:** This turns Legal Watch's validated rules into an impact simulator. Competitors validate before a run, not retroactively.
- **5 questions:**
  1. Replay runs on every rule change.
  2. The expert approves only the rule encoding, once.
  3. Rules are versioned by Legal Watch's own output, with no extra upkeep.
  4. It is a report in Data & Insights.
  5. It shows "which rule, which case, why it differs".
- **Trust/safety:** Deterministic code computes the result. The LLM only drafts the rule encoding and an expert signs it. Synthetic data only.
- **Tech:** Rule-as-data decision tables, a differential replay engine, and effective-date versioning.
- **Numbers:** None invented. Show the demo count as synthetic.
- **Risk:** Correct rule encoding. Limit to 3 rules and 200 synthetic cases.

---

## Insight
Every piece of knowledge needs a **validity envelope (country, sector, dates)**, and it must be inferred rather than typed in. Trust then decays on a computable event (a rule change or a role change) rather than on a review date. That replaces owner chores with tripwires.

# Lens 8: Cross-industry analogist

## 10 raw ideas
1. **Citator for procedures**: a "good law?" flag from how a procedure fares in real cases.
2. **Trust error budget (SRE)**: each topic gets a trust SLO, and humans are paged only when it burns.
3. **Pheromone trails**: routes of "who actually resolved this" are reinforced by outcomes and evaporate.
4. **Inferred CODEOWNERS/blame**: ownership comes from who really edits and resolves, not from a registry.
5. **Immune system**: a law change is an antigen that lights up affected procedures and agent prompts.
6. **Credit score for claims**: transparent factors, no review date.
7. **Wikipedia-bot tier**: bots auto-fix trivial drift, and humans see only disputes.
8. **Living guideline (GRADE)**: evidence levels with a trigger when new evidence arrives.
9. **Mentor residue**: the expert's normal chat reply becomes the reusable answer, with the expert credited.
10. **Role-change evaporation**: an HRIS role change decays trust in the person's attributed knowledge.

Kept: **A** and **B** (solid), **C** (bold).

---

## A. Trust Error Budget (solid, extends TrustLens)
**Pitch:** Each topic gets a trust SLO. Silence when green, a human only when it burns.

- **Customer:** An Italian ex-HR Service Srl consultant in week 2, with a client asking about the new pay-transparency wording. She needs to know whether the procedure still holds *today*.
- **Movie:**
  - The card shows "Burn: low", the last 5 cases closed without rework, and an owner.
  - The Directive transposition lands. Three cases get corrected after the run, and a Teams thread contradicts the card.
  - The card turns amber on its own and shows the evidence.
  - One senior gets a single "confirm or amend" nudge instead of a review queue.
- **WOW:** We replay 30 days of synthetic work signals in 20 seconds. Trust bars drain with no human input, and exactly one alert fires, to the right person.
- **Fit:** TrustLens already shows freshness and conflicts. Guru-style tools use calendar nags, so this replaces review dates with outcomes.
- **5 questions:**
  1. Auto: signals are ingested and the budget is computed.
  2. Human: only on burn above threshold, at the topic's owner (the Legal Watch pattern).
  3. No chore: no review dates and no queue.
  4. Workflow: the card sits inside the answer, in Teams or mysdworx.
  5. Understandable: three words (Healthy / Burning / Unknown) plus "why" on tap.
- **Trust & GDPR:** Scoring is plain code with visible rules. The LLM only classifies a signal as "contradicts / confirms / neutral" with a verbatim quote. Signals are about cases, not people.
- **Tech:** Burn rate = weighted bad events divided by the budget, over a sliding window (SRE multi-window alerting). Citator-style treatment labels (followed / distinguished / overruled). LLM extraction to JSON, then zod validation, then rules.
- **Numbers:** [ASSUMPTION] 2,000 procedures × 30 min/year of reviews = 1,000 hours. If alerts reduce this to 10% of topics, about 900 hours are saved. Replace with SD Worx's real numbers.
- **Why now:** The Directive, the 500+ consultants' agents, and the HR Service Srl merge all create sudden drift.
- **Risk:** Looks like TrustLens plus a chart. Mitigation: the replay is the WOW. Buildable in 5h (about 40 scripted signals).

## B. Mentor Residue (solid)
**Pitch:** The expert answers once in chat. The answer lives on, credited and self-checking.

- **Customer:** Marco, a senior payroll expert asked the same sector-CAO question about 20 times a month. He doesn't want to write documentation.
- **Movie:**
  - Marco answers a colleague in Teams as usual.
  - A background pass lifts the Q+A into a draft "why we do it this way" card, scoped to country and joint committee (PC).
  - Next week the same question comes in. The card answers with Marco's quote, and he sees "deflected: 14".
  - If a source changes, the card goes amber (idea A).
- **WOW:** A newcomer asks the question live. The card cites Marco's original sentence, and Marco's phone shows "you saved 14 interruptions, nothing to do".
- **Fit:** Capture Loop is ours, but here capture is by-product, not a one-click task. It is not a Guru verification flow. It is the "thousand mentors" quote made literal.
- **5 questions:**
  1. Auto: detect, extract, scope, publish a draft.
  2. Human: only when the card contradicts an existing validated card.
  3. No chore: zero clicks for the expert, and the credit is the reward.
  4. Workflow: it stays in Teams threads.
  5. Understandable: the quote, the author and the date are always visible.
- **Trust & GDPR:** Opt-in per expert, who can retract any card. Only threads where someone answered are used. Nothing is sent outside the tenant. [ASSUMPTION] A works council would accept "answers I gave" more readily than activity tracking.
- **Tech:** Thread segmentation, question clustering (embeddings + threshold), quote-grounded extraction (drop claims without a verbatim span), and a dedup/conflict check against existing cards.
- **Numbers:** [ASSUMPTION] 20 repeats/month × 5 min × 12 months = 20 hours/expert/year, times 100 experts = 2,000 hours.
- **Why now:** Agentic payroll roles are changing, so tacit knowledge is leaving heads.
- **Risk:** It resembles Capture Loop and the Teams-bot ban. Frame it as a background by-product with the expert-credit ledger. Buildable: synthetic threads, 3 clusters.

## C. Pheromone Trails (bold, one other teams won't think of)
**Pitch:** "Who knows" decays like ant trails and is reinforced only by solved cases.

- **Customer:** Giulia, who has inherited a portfolio from a colleague who changed role and asks "who dealt with this client's odd bonus scheme?"
- **Movie:**
  - Every resolved case deposits pheromone on a topic→route edge (who finally resolved it).
  - Edges evaporate daily, and faster after an HRIS role change.
  - Giulia asks and gets a route ("Ask Luca, resolved 4 similar cases, last in June") instead of a profile.
  - She can see why and mute any edge.
- **WOW:** Replay a role change. The old expert's trail fades while a new person's trail rises, with no profile edited by anyone.
- **Fit:** Plain expert finders are banned, and this differs in three ways. It is a decaying route, not a skills list. It is outcome-reinforced, not self-declared. It is topic-level and aggregated.
- **5 questions:**
  1. Auto: trail updates from case-closure events.
  2. Human: the person can confirm or hide their edge. Optional, and the default is private-until-k.
  3. No chore: evaporation replaces profile upkeep.
  4. Workflow: the route appears under an answer.
  5. Understandable: one sentence of evidence per route.
- **Trust & GDPR:** Highest risk. Expertise profiling is personal data. Mitigations: DPIA first, opt-in, edges shown only at k≥3 resolved cases, no ranking or performance use, delete on request.
- **Tech:** Ant-colony reinforcement with exponential decay (τ per topic), PageRank-style damping so no one person becomes a "default", and a workload cap that routes to the next-best person.
- **Numbers:** [ASSUMPTION] Cutting search-for-an-expert time from 30 to 5 min × 10 handovers/consultant/year × 500 consultants ≈ 2,000 hours.
- **Why now:** Role changes in the agentic rollout, and 10 acquisitions' worth of unknown people.
- **Risk:** The surveillance perception and the works council. The WOW is simple with simulated data.

---

## Sharp insight
**Trust should be a decay function fed by outcomes, not a status set by people.** Every card, route and agent prompt gets a half-life, and real work signals (rework, contradictions, resolved cases) are what refresh or drain it. Humans are then asked only at the moment of drain, never on a schedule. This answers "stay trusted without another task" in one sentence, and every other idea can plug into it.

# Lens 9: Contrarian / moonshot

## Diverge (10 raw ideas)
1. Knowledge expires by default; trust must be re-earned.
2. The unit is a person's answer, not a document.
3. The payslip as unit test: payroll outcomes validate knowledge.
4. Policy-vs-practice drift detector.
5. Agent traces from the 7+ payroll agents as free signals.
6. Handover ghost: a role change auto-builds a portfolio digest.
7. Cost-of-asking meter: route and batch questions to protect experts.
8. "Questions nobody asked" heatmap per acquired team.
9. Answer bonds: experts stake reputation on an answer.
10. Silence as signal: no reopened ticket means the answer held.

Kept: 1 (A), 2 (B), 3 (C, bold).

---

## A. Half-Life
**Pitch:** Every claim decays by default and is renewed by everyday work, never by review chores.
- **Customer:** Payroll consultant, Belgian SME team. Moment of doubt: "Is this indexation rule still valid after the new CAO?"
- **Movie:** Trust cards show a decay curve instead of a review date. A Pay Transparency rule change hits, and 14 cards fade. Cards confirmed in the last 30 days by independent signals stay green. The consultant sees "fading, 2 uses confirmed it, 1 contradicts it".
- **WOW:** A time slider moves the clock forward live. Cards visibly age and re-brighten when the synthetic signal stream arrives.
- **Fit:** It extends TrustLens, as the organisers asked. It removes TrustLens's weakness (owner review dates).
- **Five questions:**
  1. Automatic: confidence decays and renews from signals (resolved tickets, reuse, absence of contradiction).
  2. Human: only when a legal-change event hits a high-use card. This is the Legal Watch pattern.
  3. No burden: nothing to review unless materiality is above a threshold.
  4. Workflow: the card sits inline in the existing answer surface.
  5. Understandable: one colour plus a "why" line.
- **Trust & safety:** Decay is transparent code, with half-life per category (law 90 days, process 365 days) [ASSUMPTION]. The LLM only compares claims for contradiction. A human decides.
- **Tech:** Exponential decay with evidence-weighted renewal, NLI-style contradiction check on verbatim quotes, and event-triggered invalidation through a rule-to-card dependency graph.
- **Numbers:** If 5,000 cards each take 10 min/yr of review (about 830 h), event-based alerts could cut that by an assumed 80%.
- **Why now:** The Pay Transparency deadline and the 500+ consultant agent rollout.
- **Risk:** Looks like a restyled TrustLens. Mitigation: lead the demo with the time slider.

## B. Mentor Echo
**Pitch:** The unit is the expert's answer. Their repeat answers become consented, attributed echoes.
- **Customer:** Marco, ex-HR Service Srl consultant, week 2. Moment of doubt: "How do we handle a mid-month contract change here, and who do I ask?"
- **Movie:** Marco asks inside Teams. He sees "Chiara answered this 4 times since March, same outcome each time" with her answer in context. He asks her only if his case differs. Chiara sees "17 interruptions avoided", and she can veto any attribution with one tap.
- **WOW:** Marco's question is nearly a duplicate. The screen shows the *cost of asking* as minutes of Chiara's time saved, then a "doesn't fit, ask her" button that routes with the full context pre-written.
- **Fit:** It answers "thousands of mentors" and "who knows how it works here". It is not a plain expert directory, because it works on answers and outcomes rather than skill profiles.
- **Five questions:**
  1. Automatic: capture a resolved thread as an echo and cluster repeats.
  2. Human: the expert is asked only when a new echo contradicts an old one.
  3. No burden: the expert never writes anything.
  4. Workflow: it lives in Teams threads.
  5. Understandable: "Chiara, 4 times, last 12 days ago."
- **Trust & safety:** Opt-in per expert, aggregate counts only, no activity monitoring, no individual ranking. DPIA and works council flagged. Only answers in channels the asker can already see are used.
- **Tech:** Embedding clustering of Q-A pairs, stance detection between echoes, load-aware routing (token bucket per expert).
- **Numbers:** If an expert is asked 20 questions a month at 10 minutes each (200 min), a 50% deflection saves 100 min a month per expert [ASSUMPTION].
- **Why now:** HR Service Srl (June 2026), with 350 clients' tacit knowledge to merge.
- **Risk:** The "surveillance" perception. Mitigation: a visible consent screen in the demo.

## C. The Payslip Is the Test (bold)
**Pitch:** Payroll corrections are free ground truth. Knowledge that precedes errors loses trust automatically.
- **Customer:** Senior payroll auditor. Moment of doubt: "Why do three consultants keep getting this benefit-in-kind wrong?"
- **Movie:** Consultants use a knowledge card. Later, the payroll run needs a correction. The system links the correction to the card used. Card X turns amber: "2 of 3 runs that followed this were corrected." An expert gets one pre-filled question, "which step is wrong?".
- **WOW:** On screen, a retro-correction lands and the card flips amber *before anyone complained*. The system names the likely faulty sentence.
- **Fit:** It uses SD Worx's own pain (payroll errors and slow corrections). It is not done by Legal Watch, which works from legal sources, not from outcomes.
- **Five questions:**
  1. Automatic: outcome linkage and trust update.
  2. Human: verify only the sentence with the highest blame.
  3. No burden: errors become the signal.
  4. Workflow: it uses the existing correction process.
  5. Understandable: "used 3 times, 2 corrected."
- **Trust & safety:** Blame is a plain ratio with a minimum sample and a Wilson interval. The LLM only localises the sentence, and code validates the quote. Cards never score people.
- **Tech:** Outcome attribution (card use → run → correction), Wilson lower bound, and an abstain rule below N=5.
- **Numbers:** If 1 in 3 employees report a payroll error in 2 years (industry survey in the briefing), even a 10% cut in knowledge-caused rework is worth testing [ASSUMPTION].
- **Why now:** The agentic rollout means agents' knowledge must stay correct without manual upkeep.
- **Risk:** Real logs are unavailable. The demo needs synthetic run history, about 3 h to build.

---

## Insight
**Trust should come from the consequences of using knowledge, not from anyone's attention to it.** Every card needs a scoring signal that arrives on its own: reuse, silence, or a correction. Design the demo around one moment where the system *notices something nobody told it*. Always show the "abstain / not enough evidence" state next to it, because that is what separates calm technology from a black box.

# Lens 10: Demo engineer

## 10 raw ideas
1. **Signal-decayed trust:** trust is computed from work signals (reopened tickets, overrides, reuse), not review dates.
2. **Practice-vs-Paper:** compare what the docs say with what resolved tickets show people actually do.
3. **Time-lapse scrubber:** replay a synthetic year and watch trust change as events hit.
4. **Silent capture with outcome verification:** a solved thread becomes a card, confirmed by "no reopen in 30 days".
5. **Mentor ledger:** pseudonymised "who got asked what" with a repeat-question relief meter.
6. **Law-change shockwave:** the Pay Transparency Directive lights up affected procedures.
7. **Handover time machine:** when a role changes, the portfolio's tacit rules are surfaced.
8. **Tacit-rule miner:** finds rules everyone follows that no doc states.
9. **Consent ledger:** per-signal opt-in and opt-out UI.
10. **Agent-knowledge watchdog:** checks whether the knowledge behind the payroll agents has drifted.

Kept: 1+3 (solid), 2+8 (solid), 5+7+9 (bold).

---

## A. TrustLens Autopilot (solid)
**Pitch:** Trust cards that age and heal themselves from everyday work signals.

- **Customer:** Giulia, an ex-HR Service Srl consultant in week 2. A client asks about the meal-voucher cut-off, and she is unsure which source applies. She needs to see whether the answer is still alive, not just that it exists.
- **Movie:**
  1. Giulia asks inside Teams and gets an answer with a trust card.
  2. The card shows a decay curve, not a date. It dropped last month because three tickets contradicted it.
  3. A calm line says "Confirmed by 4 successful cases since March, 1 outlier".
  4. Only one item asks for a human: a 1-tap confirmation sent to the one expert who resolved the outlier.
- **WOW:** a time scrubber. Drag from January to October and watch the card go green, amber, then red when the new tickets contradict it. After one expert tap it turns green, with the reason shown.
- **Fit / why not done:** Guru and Glean nag people on a schedule. We use outcome signals instead (reopened, overridden, reused). It extends the Legal Watch pattern of "AI proposes, expert validates" to internal knowledge.
- **Five questions:**
  1. Automatic: scoring, drift detection, conflict flags.
  2. Human: only when signals conflict and an expert is available.
  3. No review calendar, so there is no review chore.
  4. It lives in Teams and mysdworx cards.
  5. Green is silent, and only red or amber surface.
- **Trust and safety:** the score is code with visible weights. The LLM only extracts claims and quotes, and drops any claim whose quote can't be verified. GDPR: signals are about the document, not the person.
- **Tech:** exponential decay with a half-life per source type, `trust = base × 0.5^(age/h) − Σ contradictions + Σ confirmations`. Claim extraction uses structured JSON plus a verbatim-quote check. Synthetic event log, zod validation.
- **Numbers:** [ASSUMPTION] 200 cards × 1 review per year × 20 min is about 67 hours saved against Guru-style review. Replace this with our own measured figure in the demo.
- **Why now:** the June 2026 agentic rollout means agents consume this knowledge too.
- **Risk:** the scrubber needs a deterministic seeded event log. About 3 hours, low risk. This is our safest build.

## B. Practice-vs-Paper (solid)
**Pitch:** Find where people really work differently from the documentation.

- **Customer:** Marco, a payroll consultant inheriting 40 clients when a colleague changes role. His doubt is "the doc says X, but is that what we do here?"
- **Movie:**
  1. He opens the portfolio, and each procedure shows a "paper vs practice" bar.
  2. Procedure 7 says "approve overtime via form". In 31 of 36 resolved tickets, people used a Teams message plus a manual DmfA correction.
  3. A "Tacit rule" card appears, with the evidence quotes.
  4. A named expert confirms it in one tap, and it becomes a validated rule.
- **WOW:** a split screen with the doc on the left and 36 ticket snippets on the right. The mismatch lights up live as the miner runs.
- **Fit / why not done:** acquisitions mean every team has its own "how it really works". Doc Q&A cannot see this, because it only reads the paper.
- **Five questions:**
  1. Automatic: the miner and clustering.
  2. Human: validating a new tacit rule once, with a named expert.
  3. No documentation is ever written by people.
  4. It sits in the handover view and the ticket tool.
  5. It shows a single percentage with drill-down.
- **Trust and safety:** the LLM extracts the action sequences. Code counts them and applies a threshold (at least 5 cases and at least 70% agreement). Ticket text is treated as untrusted. Signals are aggregated and no individuals are named.
- **Tech:** embedding clustering of resolved cases against doc steps, then an LLM-extracted step sequence, then a deterministic diff, with quote verification.
- **Numbers:** [ASSUMPTION] a consultant spends 2-3 days learning a portfolio. If this saves half a day per handover, 500 handovers per year saves 250 days. This is rough.
- **Risk:** synthetic tickets must look real. We write 60 by hand or generate them in mock mode.

## C. Mentor Ledger (bold, the one other teams won't build)
**Pitch:** Measure which mentors answer too often, then relieve them.

- **Customer:** Chiara, the expert asked the same VAT-on-benefits question 20 times a month. She gets no credit and no peace.
- **Movie:**
  1. Her repeated answers are detected, as aggregated clusters without reading private chats.
  2. A "Relief" card drafts the answer from her own earlier replies.
  3. She sees "You answered this 20 times. Publish as your answer?" She taps once and keeps control of what is attributed to her.
  4. Next month the counter shows 14 fewer interruptions, and she gets credit.
- **WOW:** a before/after "interruptions per week" line dropping live, plus a consent panel where she toggles which signals count.
- **Fit / why not done:** the organiser said "thousands of mentors". Expert finders only list people, while we protect them.
- **Five questions:**
  1. Automatic: clustering repeats and drafting.
  2. Human: the expert approves attribution once.
  3. The burden goes down for the mentor.
  4. It sits in Teams.
  5. A weekly digest, nothing more.
- **Trust and safety:** opt-in, aggregation (k≥5), no message content stored, and a works-council-ready consent ledger. The LLM only drafts.
- **Tech:** question clustering with a repeat counter, a workload cap, and a consent model.
- **Numbers:** [ASSUMPTION] 20 repeats × 5 min × 12 months = 20 hours per expert per year.
- **Risk:** it can read as surveillance, so the consent UI must be front and centre. About 4 hours.

---

**Sharp insight:** build one deterministic seeded event timeline and let every idea play on it. A judge remembers a scrubbable moment (the trust turning red, then healing after one tap) far more than a feature list. It also shows "zero unnecessary effort" visibly.
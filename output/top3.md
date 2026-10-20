# Top 3 ideas

All numbers below are assumptions for a pilot, not measured results.

## 1. Quiet Quorum (winner, 4.05 / 5)
**Trust cards kept current by the corrections people already make.**

- **Customer:** Sofie, a Belgian SME payroll consultant who runs 7 AI agents since the June 2026 rollout.
  - It is Tuesday; cut-off is Thursday.
  - Her meal-voucher agent drafts part-time voucher days for a PC 200 client, wrong again.
  - Her doubt: "Is this my client's quirk, or is the agent wrong for everyone?"
- **Problem:** Agents and knowledge cards go stale silently. Nobody has time to maintain them, and every consultant corrects the same mistake privately, again and again.
- **Solution:**
  - The diff between an agent's draft and what the consultant actually submits is a free signal.
  - Code groups corrections by claim and scope (country, PC, client).
  - At a quorum (3 or more people, 2 or more teams, 30 days), the card flips to *disputed* and the agent abstains ("disputed, ask Marc").
  - The expert confirms a two-line diff with one tap in their existing queue. The card turns green with a verified quote.
- **Why SD Worx:**
  - It answers the question nobody owns yet: "who keeps 500 consultants' agents current?"
  - It extends Legal Watch's "AI suggests, expert validates" from law to everyday practice.
  - Nobody has to document anything.
- **Why now:** the agentic payroll rollout (June 2026), HR Service Srl joining, and Pay Transparency changes all make rules drift.
- **Business case (assumptions):**
  - 500 consultants × 7 agents = 3,500 agents whose knowledge must stay current.
  - A stale rule today gets corrected about 20 times a month across teams. With quorum it is fixed after 3, so about 17 corrections avoided per rule per month.
  - At 6 minutes per correction, that is about 1.7 hours saved per stale rule per month. With 50 stale rules, about 85 hours a month.
  - Expert effort: one tap per disputed rule instead of periodic reviews of everything.
- **Hard questions:**
  - *"Three consultants can all be wrong."* Quorum only makes the agent stop guessing. Only an expert can promote a new rule. Scope tags keep client quirks from leaking.
  - *"Isn't this surveillance of consultants?"* Signals are aggregated per rule ("3 consultants, 2 teams"), never counted per person. It is opt-in, with retention limits and a works-council-ready README.
  - *"Where do the weights come from?"* A Beta score from confirmations and corrections. Every factor is shown and editable. The LLM only extracts the claim and quote; code decides.

## 2. Practice-vs-Paper (backup, 3.65 / 5)
**Shows where the written procedure and what people actually do have drifted apart.**

- **Customer:** Marco inherits 40 clients and does not know which written steps are still real.
- **Solution:** The LLM extracts the steps actually taken in resolved tickets. Code diffs them against the written procedure. When 5 or more cases agree at 70% or more, it flags drift ("31 of 36 tickets skip step 7").
  - The expert labels each drift as either "new standard" or "compliance flag".
- **Why SD Worx:** acquired teams work their own way, and this makes the gap visible without anyone writing documentation.
- **Business case (assumptions):** about 100 handovers a month, 2 hours saved each on clarifying steps, so about 200 hours a month. Fewer escalations after handovers.
- **Hard questions:**
  - *"Are you making non-compliance official?"* No. Drift never promotes itself; the expert decides.
  - *"Where do the tickets come from?"* Today, synthetic tickets. In production, read-only access to the existing ticketing system.
  - *"How is this different from process mining?"* Process mining works on event logs. This works on free-text tickets and procedures, and adds an expert decision step.

## 3. Tripwire (3.25 / 5)
**When a rule changes, the answers already given under the old rule surface for their own authors.**

- **Customer:** a customer-service agent who confidently answered a client last month under the old rule.
- **Solution:**
  - A Pay Transparency or CAO change marks cards whose "reason" has expired.
  - Each author privately gets their own affected past answers, with a correction already drafted, and decides whether to send it.
- **Why SD Worx:** it sits downstream of Legal Watch, which looks forward. Tripwire looks back.
- **Business case (assumptions):** if 1 in 50 answers is affected by a rule change and 2,000 answers are given a month, about 40 clients get proactively corrected instead of discovering the error at payroll time.
- **Hard questions:**
  - *"Isn't this a blame list?"* No. Each author sees only their own items, and the corrections are drafts.
  - *"Isn't this Legal Watch?"* No. It is Legal Watch's consumer.
  - *"Who sends the correction?"* Always the human author.

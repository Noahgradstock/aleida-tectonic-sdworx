# Final task: SD Worx "ONE MORE CHALLENGE"

Source: [tectonic-finals-guide.pdf](../tectonic-finals-guide.pdf) p. 10 (an image; the page rendered as a picture, not published).

## Verbatim (condensed)

> **Can your solution stay trusted without becoming another task?**

You started with: *How might we turn fragmented organisational knowledge into a trusted shared resource?* **Now take your solution one step further.**

Knowledge changes. People change roles. Expertise evolves. Context gets lost.
How can your solution stay **useful, reliable and up to date** without asking people to constantly document, update or maintain it?

**Keep it trusted. Make it transparent.** Think invisible UI, calm technology, frictionless experiences:
- Automate what can reasonably happen in the background
- Verify when human judgement adds real value
- Minimise unnecessary effort and attention
- Integrate naturally into existing ways of working
- Make it understandable when people need to know, decide or act

The technology should be almost invisible when things work and clear when people need to understand or act.

**Think beyond documents.** Sometimes the most useful answer is knowing:
- Who has dealt with this before? · Who really knows this customer or topic? · Who knows how this actually works here? · Who knows why we do things this way?

**Examples:** New developer at SD Worx: "How do we do this here?", "Who should I talk to?" · Launching a marketing campaign: "Who has done this before?", "Who understands this audience?", "Who knows what actually worked?"

Could your solution **learn from signals already created through everyday work**, instead of requiring employees to maintain another knowledge system?
*Examples are inspiration, not requirements. Solve the underlying problem.*

**Show us how. Ask yourselves:**
1. What happens automatically?
2. When is human verification genuinely valuable?
3. How do you prevent maintenance from becoming a burden?
4. How does your solution fit naturally into the user's workflow?
5. How does your solution remain understandable without demanding constant attention?

**The goal is not zero human involvement. The goal is zero unnecessary effort.**

> Find it. Understand it. Trust it. **Keep it trusted. Make it transparent. Make it effortless.**

---

## Practical notes for us (team **Aleida.ai**)

- **Our pitch: 16:15–16:25, Room 3 (SD Worx), first slot.** Be there at 16:05.
- **Submission closes 16:00** (Builderbase): short description, pitch presentation (**ppt or pdf**), GitHub link, Aikido screenshots (repo name + remaining vulnerabilities).
- Hacking 09:00–16:00, lunch 12:30. Partner staff are on site for questions: **use them** (ask SD Worx which signals exist in their everyday work).
- Pitch: **3 min + 5 min questions, no own device.** The demo must be in the slides (screenshots, GIF/embedded video).
- The final: the SD Worx winners are announced at 18:25 and pitch at 18:30 in Vooruit Theaterzaal.

## Judging (new weights)
| Criterion | Weight |
|---|---|
| Creativity | 25% |
| **Pitch quality** | **25%** (new) |
| Technical ability | 20% |
| Fit | 20% |
| Security (Aikido) | 10% |

→ Pitch + creativity = 50%. Slides and storytelling are as important as the code.

---

## Analysis: what they are really asking for

**The shift from Round 1:** from "can I trust this answer?" to "**how does the system stay trustworthy over time without anyone maintaining it?**", and from documents to **people/expertise**.

Three core problems:
1. **Maintenance without work**: knowledge should keep itself fresh.
2. **Expertise from everyday signals**: who knows what, derived from what people actually do (tickets, emails, commits, Teams replies, calendars, payroll cases), not from profiles someone has to fill in.
3. **The right human verification at the right moment**: not zero humans, but only when it adds value. Otherwise invisible.

**This is exactly the router/cascade/abstention pattern** (see [04](04-ai-patterns.md), [05](05-research-routing-cascades.md)):

```
everyday signals ──▶ LLM extracts (topic, customer, person, outcome) ──▶ deterministic trust/expertise score with decay
                                                                              │
                         ┌────────────────────────────────────────────────────┼─────────────────────────────┐
                    high & stable                                      uncertain/conflict               low/unknown
                  → INVISIBLE: used silently,                     → 1-CLICK VERIFICATION to the     → ESCALATE: "ask X,
                    score updated in the background                  right person, in their flow       they solved similar cases 3 times"
                                                                     ("Is this still correct? ✓/✗")
```

**Pitch frame that answers their 5 questions:**
| Their question | Our answer (mechanism) |
|---|---|
| What happens automatically? | Signals are captured passively, extracted, score + decay are computed, conflicts are detected |
| When is human verification valuable? | Only when the score lands in the uncertainty band *and* the answer is being used (value × uncertainty above a threshold) |
| How does maintenance not become a burden? | Verification = one click, to the person who already knows, a budget of max N per week per person, the answer in their existing tools (Teams/email) |
| How does it fit into the flow? | No new app: answers and nudges appear where people already work |
| How does it stay understandable? | Silent when everything is green, a "receipt" with the why only when someone needs to act |

## Open questions for us / the SD Worx staff
- **What did Aleida.ai build in Round 1?** The brief says "take your solution one step further". We should build on our own Round 1 solution. (Repo/code?)
- Which everyday signals realistically exist at SD Worx (ServiceNow/tickets, Teams, Outlook, SharePoint, the payroll system, git)?
- Which role matters most to them: payroll consultant, new developer or something else?

---

## Concept proposal: "The self-maintaining brain" (builds on our Company Brain)

The Round 1 engine is already good at *computing trust*. The final = **let it keep itself up to date and know who can do what, without anyone maintaining it.** Our three "Unfinished" items are exactly the final's question (see [10](10-our-round1-company-brain.md)).

1. **Layer 0: passive ingestion (automatic).** A new Teams message / email / official notice → Claude Haiku extracts claims (topic, value, scope, author) as validated JSON → the engine scores them right away. Nobody writes documentation.
2. **Expertise from everyday signals ("who knows").** Replace a fixed role with a **track record** computed from history: who answered questions on the topic, how often the answers held up (not corrected, 👍, matched the law), which customers they worked with, with decay over time. Answers "Who has dealt with this before / who knows this customer / who should I talk to" with reasons.
3. **Verification router (human only when it adds value).** Per fact: `need = uncertainty × usage/impact`. Below the threshold: silent. Above: **a 1-click card in Teams** ("Is €8 still correct for PC 118? ✓ / ✗ / not my area") to the person with the best track record, with a budget of max N questions per week per person. No answer → next expert (cascade).
4. **Rule change → automatic propagation.** A new official notice → all dependent claims written before it drop (cap 30%), affected customers are flagged. Zero manual work.
5. **Calm UI.** "Brain health": e.g. *1,240 facts, 1,236 look after themselves, 4 need a human today*. The receipt is shown only when someone has to act.

**Demo story (3 min, in slides):** a new law on meal vouchers is published → the brain finds 14 Teams answers that have become wrong and downgrades them, nobody did anything → a conflict with a customer agreement → Jan (best track record on PC 118) gets *one* Teams card, clicks ✓ → a new developer/consultant asks "who should I talk to about Bakkerij Janssens?" → answer with reasons from everyday signals.

**Patterns** ([04](04-ai-patterns.md), [05](05-research-routing-cascades.md)): LLM extracts → deterministic engine → router/cascade for human verification (abstention threshold) → decay. Models: Haiku for extraction, Sonnet as fallback.

---

## SD Worx slide from the briefing (photo of the briefing slide, not published)

> **Beyond building the solution: Trust should not depend on continuous manual effort.**
> How will your solution remain useful, reliable and up to date while fitting naturally into people's work without demanding continuous attention or maintenance?

| Pillar | Their text | Our mechanism |
|---|---|---|
| **Automate** | Maintain itself as much as reasonably possible | Layer 0: new Teams/email/legal notices → Claude extracts claims → the engine scores them. A rule change automatically downgrades everything older. Decay over time. |
| **Verify** | Ask for human input when it adds real value | Verification router: ask only when `uncertainty × usage` > threshold, to the person with the best track record |
| **Minimise** | Keep employee effort focused and lightweight | One click (✓ / ✗ / not my area), budget max N/week per person, no answer → next expert |
| **Integrate** | Fit naturally into existing workflows and only ask for attention when needed | The cards appear in Teams/Outlook where people already are. Otherwise silent. |

**Team interpretation:** a lot of focus on trust, and on how something that is trusted **today** stays trusted **tomorrow**. The time dimension is the core: trust expires and should heal itself.

**Pitch idea:** show the same fact at three points in time, *today → a new law is published → tomorrow*. Without the system the answer rots silently. With the system it is detected, downgraded, an expert gets one click and the answer is trusted again. All without anyone maintaining anything.

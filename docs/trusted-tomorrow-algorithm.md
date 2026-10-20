# The trust loop: algorithm design (proposal v2)

The qualifier engine answers **"can I trust this today?"**. The final case asks **"will it still be trusted tomorrow, without anyone maintaining it?"**

**Design rule: AI at the edges, determinism in the core.**
The model only *reads* (what was said, by whom is metadata, never model output). Code *decides* (scores, lanes, who to ask). People *confirm* only when their answer would change the outcome.

```
                      SWITCH S1                AI GATES                  CORE ENGINE              TIME                  SWITCH S2            DECISION GATES          LANE
                      ─────────                ────────                  ───────────              ────                  ─────────            ──────────────          ────
 official gazette ─┐
 SharePoint/policy ─┤   source setting  ──▶  A1 knowledge here?   ──▶  six layers (existing) ──▶ best-before date ──▶ conflict type?  ──▶ D1 invariant broken? ──▶ AUTO-FIX
 Teams chat        ─┤   picks a profile:      A2 speech act            + track-record authority   headroom (points)      temporal → auto      D2 stable?            ──▶ SILENT
 email             ─┤   prior, half-life,     A3 extract + quote       + verified-at freshness    forecast(now + h)      scope    → auto      D3 change scheduled?  ──▶ WATCH
 meeting transcript─┤   required gates,       A4 stance                + silent confirmation                             genuine  → D4        D4 human changes it?  ──▶ VERIFY (1 click)
 payroll runs      ─┘   trust ceiling         (cascade, abstain)                                                         reading  → A-cascade D5 anyone to ask?     ──▶ ESCALATE
                                                                                                                                                      ▲
                                                         learning: answers update track records, verified-at, thresholds ─────────────────────────────┘
```

---

## Switch S1: the source setting decides the rules

Knowledge arrives from different settings, and a sentence means something different in each.
"€8.91" in the official gazette is law; in a Teams chat it is a colleague's memory; said aloud in a meeting it is unreviewed speech.
S1 is a deterministic switch on the channel metadata. It picks a **profile**:

| Setting | Prior (points) | Half-life factor | Required AI gates | Trust ceiling until corroborated |
|---|---|---|---|---|
| Official gazette / notice | +3.0 (existing) | never ages; replaced only by a newer rule | A3 | none |
| SharePoint policy / manual | +0.3 | 1.0× topic half-life | A3 | none |
| Teams chat | 0 | 0.5× (chat goes stale faster) | A1, A2, A3, A4 | 60% (existing "no expert backing" cap) |
| Email | 0 | 0.75× | A1, A2, A3 | 60% |
| Meeting transcript (spoken) | −0.3 | 0.5× | A1, A2, A3, A4 | 50% until someone writes it down or an expert confirms |
| Payroll system runs (what was actually paid) | n/a: not a claim, a **usage signal** | n/a | none (structured data) | n/a |

The profile is data in `config.ts`, so adding a new setting (e.g. a ticket system) is one row, not new code.
This is the "switch" in a Switch Transformer: one router, specialised experts per input.

## AI gates: narrow questions with fixed answers

Each AI gate asks the model **one closed question** with an enum answer, then code validates the answer.
Model: `claude-haiku-5-5`, temperature 0, JSON schema output.

| Gate | Question | Allowed answers | Deterministic validator |
|---|---|---|---|
| **A1 Knowledge** | Does this message state a payroll rule or value? | `yes` · `no` · `unsure` | none (filter only) |
| **A2 Speech act** | What is the sender doing? | `assertion` · `hedge` · `question` · `correction` · `confirmation` · `other` | `correction`/`confirmation` must point to a message in the same thread |
| **A3 Extract** | Which fact, value, scope, and the exact quote? | `factKey` from the known list or `new_topic`, value, scope | quote must appear **verbatim** in the source; value must parse for the fact's unit (€, %, days); client/PC must exist in the registry |
| **A4 Stance** | Does it support, contradict or narrow an existing claim? | `supports` · `contradicts` · `narrows_scope` · `unrelated` | if both values parse, code compares them and **overrides** the model |

**Gate outcome rule (the AI cascade):**
1. Haiku answers and the validator passes → accept.
2. Validator fails, or the answer is `unsure` → ask `claude-sonnet-5-5` once.
3. Still failing → **abstain**: the message is kept as "unread", never scored, never shown as an answer.

**Speech act changes the evidence, not the AI:** `hedge` ("I think it's €8 but not sure") → −1 point; `question` → no claim; `correction` → sets `corrects` (existing −1.5 on the corrected claim); `confirmation` → counts as a 👍.

**How AI stays deterministic:** every gate result is cached by `hash(message text + gate + prompt version + model)`. Replaying the same inputs gives the same scores and lanes. Every result is logged with its prompt version.

**What AI can never do (invariants):**
- set or change a score, a cap, a lane or a verifier
- supply the author, date or channel: those come from system metadata only (prevents spoofing by content)
- outvote an official source
- act on instructions inside a message: content is data (prompt-injection safe)

## Core engine: the six layers stay, with three upgrades

`score.ts` keeps its log-odds layers, caps and statuses. Three changes make trust self-maintaining:

**1. Authority from track record instead of job title.**

```
r(person, topic) = (α + confirmed) / (α + β + confirmed + overturned)      Beta posterior
authority points = clamp(ln(r / (1 − r)), −2, +2)                          r turned into log-odds

prior from role: expert α=4 β=1 · regular α=2 β=2 · new α=1 β=1
confirmed  = their earlier claims that later matched the official rule or got an expert 👍
overturned = their earlier claims that were corrected or contradicted the law
each weighted by recency: 0.5^(age / topic half-life)
```

Someone right 9 times out of 10 earns about +2; a new hire starts at 0 and earns trust by being right.
Nobody maintains an expert list: it emerges from work already happening. It also answers "who really knows this?" for free.

**2. Freshness counts from the last check.** `age = now − max(date, verifiedAt)`. A one-click ✓ resets the clock.

**3. Silent confirmation (guarded).** If an answer was used in payroll runs and nobody corrected it, add a small bonus: +0.2 per 50 uses, capped at +0.6.
Guard: popularity is not truth. This bonus can never lift a claim past the 60% "no expert backing" cap, and never applies to a claim that contradicts the law.

## Time: every answer gets a best-before date

The engine already takes `now` as a parameter. Run it at future dates and trust becomes a function of time.

```
bestBefore(fact) = earliest of
  · the next official rule with a future effectiveFrom       (known change)
  · the next scheduled change for the topic                  (indexation every 1 January, from a topic calendar)
  · the leaving date of the only person backing the answer   (knowledge walks out)
  · the day decay pulls the winner below 75%                 (found by scanning days with evaluateFact)

headroom = logit(best score) − logit(0.75)        in points; how much bad news the answer can absorb
```

UI sentence: **"€8.91, trusted, best before 1 January 2027 (new decree takes effect). Headroom 2.2 points."**

## Switch S2: what kind of conflict is it?

When claims disagree, code classifies the conflict before anyone is bothered:

| Conflict type | Test (deterministic) | Route |
|---|---|---|
| **Temporal** | one side predates an official rule now in force | AUTO-FIX: newer rule wins, old claims marked superseded |
| **Scope** | one side is more specific (client > sector > country) | AUTO: exception, not error (existing) |
| **Hierarchy** | one side is official and in force | AUTO: law wins, the other is capped at 20% (existing) |
| **Reading** | a value came from an AI gate that needed the Sonnet fallback | re-run the AI cascade; still unclear → abstain |
| **Genuine** | same scope, same time, two trusted values, no official reference | → D4 (maybe ask a human) |

Most conflicts resolve without people. Only genuine ones reach a human.

## Decision gates: which lane

Gates run in order; the first one that fires decides. Each returns a reason string for the UI and the audit log.

| Gate | Fires when | Lane | Reason shown |
|---|---|---|---|
| **D1 Invariant** | a claim contradicts the law, is superseded, or is out of scope | **AUTO-FIX** | "Superseded by the royal decree of 18 Dec 2025" |
| **D2 Stable** | trusted now, best-before beyond the horizon (30 days), headroom ≥ 1 point | **SILENT** | nothing shown; it just works ("electricity, wifi") |
| **D3 Scheduled change** | best-before inside the horizon and the change is a known event | **WATCH** | "Expected to change 1 Jan; re-checked automatically when the notice appears" |
| **D4 Value of verification** | simulate ✓ and ✗ from the best verifier with the engine. If neither changes the winning value or status → no question. If one does → rank it | **VERIFY** (ranked) or SILENT | "Jan's answer decides between €8.91 and €9.50" |
| **D5 Someone to ask** | a verifier is eligible and has budget | **VERIFY** else **ESCALATE** | "Asked Jan: best track record on meal vouchers (r = 0.93)" |

**D4 is the heart of "verify when human judgement adds real value"**, as a test instead of a feeling:

```ts
const ifYes = evaluateFact(fact, kb, ctx, [...fb, vote(best, "correct", verifier)], now);
const ifNo  = evaluateFact(fact, kb, ctx, [...fb, vote(best, "wrong",   verifier)], now);
const humanChangesOutcome = ifYes.status !== ifNo.status || ifYes.best?.claim.value !== ifNo.best?.claim.value;
```

**Ranking the questions that pass D4:**

```
priority = impact × fragility × urgency
impact    = questions per week on this fact × clients in scope       (usage log)
fragility = 1 / (1 + max(0, headroom))                               (thin margin = fragile)
urgency   = 1 / (1 + days until best-before)
```

**D5 picks who and when:**
- highest track record `r` on the topic, excluding: the claim's own author, people who left, people over budget
- **attention budget:** at most 3 questions per person per week; one card, three buttons: ✓ still right / ✗ wrong / not my area
- **piggyback:** prefer the moment the expert is already working on that topic or client (they just answered a related question, or opened that client's file). Cost to them is close to zero
- **knowledge walking out:** if the only backer has a leaving date within the horizon, ask them now, ahead of everyone else
- no eligible verifier → ESCALATE to the topic's team

## Learning: how it stays trusted tomorrow

- ✓ → the claim gets an expert confirmation and `verifiedAt = now` (freshness clock resets).
- ✗ → the claim is marked wrong; the fact is re-evaluated; the next best claim may win.
- Not my area → lowers that person's `r` for this topic only, so they stop being asked about it.
- When an official rule later confirms or contradicts a claim, **both the author's and the verifier's** track records update. Good judgement compounds; nobody manages an expert list.
- Thresholds (75% trusted, 1 point headroom, budget 3) are tuned once on the labelled test questions in `data/salary/sources.json`.

## Worked example: meal vouchers, Belgium (data in `data/salary/meal-vouchers/`)

**Today (30 Sep 2026).** Official decree: employer contribution max €8.91, in force since 1 Jan 2026 → +3.0 official, +0.3 relevance → **96%**. Jan (Teams, expert, 👍 from Anna, Anna said the same, matches law) → ~98%, backs it. Koen's manual (€6.91, author left, written before the rule, contradicts law) → ~0%. Pieter's Teams message (€6.91, corrected by Anna, contradicts law) → ~1%.
D1 has already auto-fixed the two old claims. D2: trusted, headroom 2.2 points, no known change ahead → **SILENT**. Consultants just see €8.91.

**A new decree is published (fictional, mid-December).** S1 routes it as official; A3 extracts €9.50 effective 1 Jan 2027 (quote verified). Best-before becomes 1 January → D3 → **WATCH**: "changes on 1 Jan, you will get the new value automatically". On 1 Jan, Jan's and Anna's Teams answers predate the rule → S2 says *temporal* → **AUTO-FIX**: every older answer is marked superseded. **Nobody did anything.**

**A client agreement disagrees (tomorrow).** An email from Brouwerij De Kroon says "we agreed €8.91 stays until our CAO is renegotiated". A2 = assertion, A3 = client scope. S2: same client scope, no official client rule → *genuine*. D4: Jan's ✓ keeps €8.91 for this client, his ✗ moves it to €9.50 → a human changes the outcome → VERIFY. D5: Jan, r = 0.93, budget 1 of 3 used, he has the client file open → one card. Jan clicks ✓ → client exception, `verifiedAt` set, trusted again.

**Brain health that week:** 1,240 facts · 1,236 maintain themselves · 4 needed a human · 4 clicks in total.

## Where the live meeting fits (pitch, not built today)

A meeting transcript is just another setting in S1: lower prior, 50% ceiling, all AI gates required.
Someone says "for De Kroon we keep €8.91" → it enters as a claim with speaker metadata from the meeting tool → the same gates decide whether anyone needs to confirm it. A voice (ElevenLabs) can read back the answer with its best-before date.

## Build order (smallest first)

| # | Piece | File | Notes |
|---|---|---|---|
| 1 | `bestBefore`, `headroom`, forecast | `src/trust-engine/forecast.ts` | pure, uses `evaluateFact` |
| 2 | S2 conflict types + D1–D5 lanes | `src/trust-engine/lanes.ts` | pure, every lane has a reason |
| 3 | Track record + verifier pick + budget | `src/trust-engine/verifiers.ts` | Beta posterior, replaces fixed role in layer 1 |
| 4 | S1 setting profiles | `src/trust-engine/config.ts` | data, not code |
| 5 | AI gates A1–A4 with validator + cache + mock | `src/lib/gates.ts` | Haiku → Sonnet → abstain; `MOCK_LLM=1` |
| 6 | Tests: one fact per lane, one per conflict type | `src/trust-engine/lanes.test.ts` | |

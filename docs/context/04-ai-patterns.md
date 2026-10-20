# AI patterns: switches, layers and hybrid algorithms

Reference for the final. The goal is an **explainable hybrid**: AI does what AI is good at (understanding unstructured text), plain code does what code is good at (deciding, counting, following rules).
**Principle: pick 2–3 of the patterns below, not all of them.** Everything here can be built in a day.

---

## The base architecture (what won Round 1)

```
 unstructured input            LAYER 1: Understand    LAYER 2: Rules        LAYER 3: Decision        LAYER 4: Show
 (email, PDF, chat, question) ──▶ LLM → validated JSON ──▶ hard gates/vetoes ──▶ weighted score + threshold ──▶ answer + "receipt" + next step
                                  (quantifies)            (deterministic)        (deterministic)            (why, who, uncertainty)
```

- **The LLM never sets the verdict.** It returns facts/signals as JSON. The code does the counting.
- Each layer can be tested on its own, and layers 2–4 work offline (mock JSON) → the demo cannot die.

---

## 1. LLM as extractor (structured output)

Let the model fill in a schema instead of writing free text. Always validate.

```ts
const Signal = z.object({
  answer: z.string().nullable(),
  amount_eur: z.number().nullable(),
  country: z.enum(["BE", "NL", "LU", "unknown"]),
  applies_to_client: z.string().nullable(),
  conflicts: z.array(z.object({ source_id: z.string(), says: z.string() })),
  evidence: z.array(z.object({ source_id: z.string(), quote: z.string() })), // quote = traceability
});
const parsed = Signal.safeParse(llmJson);
if (!parsed.success) return fallback();      // never blindly trust LLM output
```

Tip: require a **quote + source_id** for every claim and check in code that the quote actually exists in the source (a cheap anti-hallucination measure).

---

## 2. Switch / router: pick the right path for the right input

This is the "switch". A classifier decides which handler takes over.

```ts
// Rules first (free, deterministic), LLM only when the rules are not enough
function route(input): Route {
  if (/payslip|pay statement/i.test(input)) return "payroll";
  if (/dismissal|notice|termination/i.test(input)) return "contract";
  return llmClassify(input, ["payroll", "contract", "benefits", "other"]); // enum output
}
const handlers = { payroll: payrollFlow, contract: contractFlow, benefits: benefitsFlow, other: escalate };
return handlers[route(input)](input);
```

- Same idea as **Mixture-of-Experts** in large models: a "gating" function chooses which expert does the computing. Here the experts are just functions or prompts.
- Always have an `other` → human.

---

## 3. Cascade / escalation (cheap first, expensive last)

```
rules ──(certain?)──▶ done
   │ no
   ▼
small/fast model ──(confidence ≥ 0.8?)──▶ done
   │ no
   ▼
large model ──(confidence ≥ 0.6?)──▶ done
   │ no
   ▼
human (with everything found so far)
```

Good demo story: "90% is handled automatically, 10% is escalated with the evidence ready."

---

## 4. Gates + weighted score (veto first, then score)

Two kinds of rules: **hard** (stop immediately) and **soft** (adjust the score).

```ts
// Layer 2: hard gates → short-circuit
if (source.country !== client.country) return verdict("STOP", "The source applies to another country");
if (source.supersededBy)               return verdict("STOP", `Superseded by ${source.supersededBy}`);

// Layer 3: soft signals → weighted sum, each contribution is kept for the explanation
const signals = [
  { name: "Official source",     w: 0.30, v: source.isOfficial ? 1 : 0 },
  { name: "Freshness",           w: 0.25, v: Math.exp(-ageDays / 365) },   // decay
  { name: "Has an owner",        w: 0.15, v: source.owner ? 1 : 0 },
  { name: "Sources agree",       w: 0.30, v: agreeing / total },
];
const score = signals.reduce((s, x) => s + x.w * x.v, 0);
const level = score >= 0.75 ? "HIGH" : score >= 0.5 ? "MEDIUM" : "LOW";
return { level, score, why: signals.map(x => `${x.name}: +${(x.w * x.v).toFixed(2)}`) };
```

**The `why` list is the whole point.** It becomes the "receipt" in the UI and makes the result explainable to the judges.

Variants if you want to be a bit fancy (but still simple):
- **Log-odds / naive Bayes:** each signal adds `log(likelihood ratio)`. Good when signals are independent evidence.
- **Noisy-OR:** risk = `1 − Π(1 − pᵢ)`. Good for "it is enough that one thing is wrong".
- **Decay:** `exp(−age/half-life)` for freshness.

---

## 5. Decision table (rules as data)

Put the rules in JSON/YAML instead of if statements → judges and the business side can read them, and they can be changed without code.

```yaml
- when: { doc_type: email, owner: null }   then: { cap: MEDIUM, reason: "Email only, no owner" }
- when: { age_days: ">730" }               then: { penalty: 0.2, reason: "Over 2 years old" }
- when: { conflict: true }                 then: { cap: MEDIUM, action: "Ask {owner}" }
```

Link to SD Worx: their internal hackathon was won by an **agent that turns legal documents into validation rules**. This is exactly that: **an LLM compiles text → rules as data → a deterministic engine runs them.**

---

## 6. Self-consistency (simple uncertainty measure)

Run the same extraction 3–5 times (temperature > 0) and compare.

```ts
const runs = await Promise.all([1, 2, 3].map(() => extract(doc)));
const agreement = mostCommonCount(runs.map(r => r.amount_eur)) / runs.length; // 1.0 = all agree
```

Low agreement = the model is unsure → lower the score or escalate. Expensive in API calls, so use it only on the field that matters.

---

## 7. State machine for "agents"

If the solution has several steps (read email → find customer → propose action → approve), model it as a state machine, not a free agent loop.

```
RECEIVED → CLASSIFIED → ENRICHED → PROPOSED → (APPROVED | REJECTED) → EXECUTED
```

- Each transition is a function. The LLM may only work *inside* a step.
- A human approves before `EXECUTED` (SD Worx stresses human-in-the-loop).
- Easy to show in the UI as a timeline.

---

## 8. Retrieval: keep it simple

- Small corpus (< 100 documents): **keyword/BM25 is enough**. Both Round 1 teams did this.
- If you want embeddings: hybrid = BM25 score + cosine score, normalise, sum. An LLM rerank on the top 5 if there is time.
- **Filter on metadata before searching** (customer, country, permissions). This is both correctness and security (Aikido).

---

## 9. Feedback loop (easy to show, looks smart)

A "Was right / Was wrong" button → adjust weights or a source's credibility a little.

```ts
source.reliability = 0.9 * source.reliability + 0.1 * (wasCorrect ? 1 : 0); // exponential moving average
```

---

## Recommended minimal stack for one day

1. **Layer 1:** one LLM prompt → JSON schema (zod/pydantic). Mock mode with saved JSON.
2. **Layers 2–3:** gates + weighted score with a `why` list. About 100 lines.
3. **Layer 4:** UI that shows the answer + receipt + next step (who to ask / escalate).
4. Optional, *one* extra: router (#2), cascade (#3) **or** feedback loop (#9).

## What to avoid (overengineering)

- Free agent loops with many tools. Hard to demo, hard to explain, breaks live.
- Vector databases, fine-tuning, custom ML models. No time, no data.
- An LLM that sets scores/ratings ("rate 1–10"). Not explainable, not stable. Let the code count.
- More than one "wow" moment in the demo. One clear doubt → one clearly solved problem.

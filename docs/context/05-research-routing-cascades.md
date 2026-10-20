# 05 – Research behind "switches and layers": routing, cascades, gating, abstention

Purpose: translate the research into simple patterns that can be built in ONE day.
The basic pattern we start from:

```
unstructured text -> LLM extracts to validated JSON (schema)
                  -> deterministic code decides (rules, gates, weighted scores, thresholds)
                  -> "why" explanation + human-in-the-loop when uncertain
```

All numbers below are checked against the abstract/blog (see Sources). Where we could not verify a number, no number is given.

---

## 0. TL;DR – the five ideas that carry the whole PoC

1. **Cascade**: start cheap/simple, escalate only when a scorer says "uncertain". (FrugalGPT, AutoMix)
2. **Router**: pick the path *before* you run – rules first, then embedding similarity, LLM classification last. (RouteLLM, semantic-router)
3. **Gating = top-k switch**: the same idea as Mixture of Experts, but at app level – a small "gate" picks which expert (prompt/rule pack/human) gets the case.
4. **Abstention / defer-to-human**: the model may say "don't know"; the threshold is set on a small labeled set so that the error risk stays below a chosen level.
5. **LLM extracts, rules decide**: the LLM quantifies, the code decides, and the scores are additive so that the "why" can be printed line by line (like a credit scorecard).

---

## 1. LLM cascades

### FrugalGPT (Chen, Zaharia, Zou, 2023)
- **Idea**: line up several LLMs in a chain from cheap to expensive. Run the cheap one first; a small *scorer* judges the answer; if the score is below the threshold, the question is passed on to the next model.
- **Mechanism**: scorer = small fine-tuned model (DistilBERT in the paper) that gives P(answer is correct | question, answer). Order + thresholds per step are optimized against a budget.
- **Result (abstract)**: can match the best single LLM (GPT-4) with "up to 98% cost reduction", or improve accuracy over GPT-4 by 4% at the same cost.
- **Hackathon version**: no trained scorer – use schema validation + rule checks + self-consistency as the scorer. Three tiers: rule -> small model -> large model -> human.

### "Language Model Cascades" (Dohan et al., 2022)
- **Idea**: the name is confusing – it is about seeing chained prompts (chain-of-thought, verifiers, tool use) as *probabilistic programs* where the variables are strings. A theoretical framework, not cost optimization.
- **Use for us**: gives language for saying "our pipeline is a program of LLM calls + deterministic steps". No code needed.

### Deferral rules for cascades (Gupta et al., ICLR 2024)
- **Idea**: when should the small model *pass the question on*? Classic rule (Chow's rule): defer if the max probability < threshold. For free-text generation, the probability of the whole sequence is biased by answer length.
- **Mechanism**: use token-level uncertainty (e.g. the lowest/a quantile of the token logprobs) instead of the total sequence probability.
- **Hackathon version**: if the API gives logprobs – look at the *lowest* token logprob in the important JSON fields, not the average. Otherwise: skip it and use self-consistency.

### AutoMix (Aggarwal/Madaan et al., 2023/NeurIPS 2024)
- **Idea**: the small model *verifies itself* (few-shot: "Is this answer correct given the context? yes/no", sampled several times) and the result is used as confidence.
- **Mechanism**: because self-verification is noisy, a POMDP router is used that picks the model size based on confidence. Simpler variant in the paper: fixed threshold.
- **Result (abstract)**: reduces compute cost by over 50% at comparable performance.
- **Hackathon version**: share of "yes" out of 5 verification calls = confidence. A threshold, not a POMDP.

### Code sketch: 3-tier cascade with thresholds (TypeScript)

```ts
type Extract = { absenceType: string; days: number; startDate: string };
type Step = { name: string; run: (t: string) => Promise<Extract | null>; cost: number };
type Result = { value: Extract | null; tier: string; confidence: number; why: string[] };

async function cascade(text: string, steps: Step[], score: (e: Extract, t: string) => Promise<number>,
                       thresholds: number[]): Promise<Result> {
  const why: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    const out = await steps[i].run(text);                 // regex/rule, small LLM, large LLM
    if (!out) { why.push(`${steps[i].name}: no valid JSON`); continue; }
    const c = await score(out, text);                     // schema + rules + self-consistency
    why.push(`${steps[i].name}: confidence ${c.toFixed(2)} (required ${thresholds[i]})`);
    if (c >= thresholds[i]) return { value: out, tier: steps[i].name, confidence: c, why };
  }
  return { value: null, tier: "human", confidence: 0, why: [...why, "No tier confident enough -> human"] };
}
// thresholds e.g. [0.95, 0.85, 0.75]: cheap tiers must be MORE confident to be allowed to answer.
```

---

## 2. LLM routers

Difference from a cascade: a **router** decides *before* running which path is taken (one call); a **cascade** runs and escalates *afterwards* (can become several calls).

### RouteLLM (LMSYS / Ong et al., 2024)
- **Idea**: a trained router chooses between a strong and a weak model per question. Trained on preference data (Chatbot Arena).
- **Mechanism**: four router types – similarity-weighted ranking (Elo weighting by similarity), matrix factorization, BERT classifier, causal-LLM classifier. The router outputs a number ("probability that the strong model is needed"); a threshold controls what share goes to the strong model – calibrated against the desired share of expensive calls.
- **Result (blog)**: cost reduction >85% on MT Bench, 45% on MMLU, 35% on GSM8K compared with GPT-4 alone, with 95% of GPT-4's performance. The abstract is more cautious: "over 2 times in certain cases".
- **Hackathon version**: the threshold is a dial: "send at most 20% of cases to the expensive path" -> pick the threshold that gives that on the test set.

### Hybrid LLM (Ding et al., ICLR 2024)
- **Idea**: a router predicts the *difficulty of the question* and sends easy questions to the small model.
- **Mechanism**: a small encoder is trained to predict the quality gap between the models; a threshold that can be changed at run time gives a free quality/cost trade-off.
- **Result (abstract)**: up to 40% fewer calls to the large model without lower answer quality.
- **Hackathon version**: "difficulty" = simple features (text length, number of dates/amounts, keywords such as "retroactive", "dispute") -> score -> threshold.

### Commercial routers (Martian, Not Diamond and others)
- Sell routing as a service (pick the model per prompt). Same principle as RouteLLM. No independent numbers verified here – mention as "the market exists", without numbers.

### Semantic routing (embedding similarity)
- **Idea**: each route has a list of example utterances; incoming text is embedded and matched against the nearest route (cosine similarity). No LLM generation, fast and deterministic. Example: the library `semantic-router` (aurelio-labs, MIT, Python).
- **Mechanism**: score = max cosine similarity against the route's examples; if below the route's threshold -> "no route" (fallback).
- **Hackathon version**: 5–10 examples per category, embeddings in memory, cosine in 10 lines.

### Intent classification with an LLM
- Classic fallback: an LLM with an enum schema `{"intent": "payroll question" | "absence" | "tax" | "other", "confidence": ...}`. Treat verbalized confidence as weak (see §4).

### Code sketch: rules-first + embedding + LLM-fallback router (TypeScript)

```ts
type Route = { name: string; patterns: RegExp[]; examples: number[][]; minSim: number };
const cos = (a: number[], b: number[]) => {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i]*b[i]; na += a[i]**2; nb += b[i]**2; }
  return d / Math.sqrt(na * nb);
};

async function route(text: string, routes: Route[], embed: (s: string) => Promise<number[]>,
                     llmClassify: (s: string) => Promise<string | null>) {
  // 1) Rules: deterministic, free, fully explainable
  for (const r of routes) {
    const hit = r.patterns.find(p => p.test(text));
    if (hit) return { route: r.name, via: "rule", why: `matched ${hit}` };
  }
  // 2) Embedding similarity against examples
  const v = await embed(text);
  const scored = routes.map(r => ({ r, s: Math.max(...r.examples.map(e => cos(v, e))) }))
                       .sort((a, b) => b.s - a.s);
  const [best, second] = scored;
  if (best.s >= best.r.minSim && best.s - (second?.s ?? 0) > 0.05)   // threshold + margin
    return { route: best.r.name, via: "embedding", why: `similarity ${best.s.toFixed(2)}` };
  // 3) LLM classification with enum schema
  const llm = await llmClassify(text);
  if (llm) return { route: llm, via: "llm", why: "LLM classification (low similarity in step 2)" };
  return { route: "human", via: "fallback", why: "no confident route" };
}
```

---

## 3. Mixture of Experts gating – the "switch" in the concept

### Sparsely-Gated MoE (Shazeer et al., 2017)
- **Idea**: a layer with up to thousands of "experts" (small feed-forward networks). A trainable *gating network* picks a sparse combination of experts per input – only a few run.
- **Mechanism**: the gate computes a score per expert, keeps the top-k (with noise for load balancing: "noisy top-k gating"), softmax over the selected ones, weighted sum of their outputs.
- **Result (abstract)**: >1000x increase in model capacity with only minor losses in computational efficiency.

### Switch Transformer (Fedus, Zoph, Shazeer, 2021)
- **Idea**: simplify to **top-1** – each token is sent to exactly one expert (a "switch").
- **Result (abstract)**: up to 7x faster pre-training with the same compute resources (T5-Base/Large-based), 4x speedup for the trillion-parameter model versus T5-XXL.

### Connection to the app level (keep it conceptual)
| MoE concept | Our PoC |
|---|---|
| expert | specialized prompt / rule pack / human (e.g. "absence rules", "tax rules") |
| gating network | the router in §2 (rule -> embedding -> LLM) |
| top-1 (Switch) | one case -> one handling path |
| top-k | run 2 experts in parallel, compare (= Anthropic's "parallelization/voting") |
| load balancing | cap on the share of cases sent to the expensive path/human |

Pitch: "We do the same thing modern LLMs do internally – a small gate picks the right expert – but visible and auditable."

---

## 4. Selective prediction, abstention, defer-to-human, calibration

### Learning to defer (Madras, Pitassi, Zemel, NeurIPS 2018)
- **Idea**: the model can either decide or *hand over to a human*; trained with the human's strengths and biases in mind.
- **Result (abstract)**: the human+model system can become both more accurate and less biased, even when the human is inconsistent or biased.

### Consistent estimators for learning to defer (Mozannar & Sontag, ICML 2020)
- **Idea**: classifier + "rejector" are trained together from the expert's historical decisions; reduces to cost-sensitive learning with a consistent surrogate loss (generalizes cross-entropy).
- **Hackathon version**: we train nothing – but the principle "defer when P(model wrong) × cost(error) > cost(human)" is a one-line rule.

### Conformal abstention (Abbasi-Yadkori et al., DeepMind, 2024)
- **Idea**: sample several answers, let the model itself judge how similar they are, use conformal prediction to choose the abstention threshold.
- **Mechanism**: the threshold is calibrated on a labeled set so that the hallucination/error rate gets a *statistical guarantee* (bounded below a chosen level), provided that new data resembles the calibration data.
- **Hackathon version**: the same thing, simplified: choose the threshold on 20–50 labeled examples so that errors among accepted ≤ X% (code below). Say "conformal-inspired", not "guaranteed".

### Calibration of LLM confidence
- **Verbalized confidence is overconfident** (Xiong et al., ICLR 2024: "Can LLMs Express Their Uncertainty?"). Consistency between several sampled answers reduces the problem; no method wins everywhere, and all struggle with expert knowledge.
- **Self-consistency (Wang et al., 2022)**: sample several chain-of-thought answers, take the majority. Improved e.g. GSM8K by +17.9% over plain CoT. **The share that agrees with the majority** is a useful confidence signal.
- **Logprobs**: where the API gives them – use the lowest token probability for key fields (cf. Gupta et al.). Otherwise self-consistency.
- **Rule for the PoC**: never trust `"confidence": 0.95` from the model alone. Combine: schema valid? rule checks ok? self-consistency ≥ 4/5?

### Code sketch: self-consistency confidence (TypeScript)

```ts
async function selfConsistency<T>(callLLM: () => Promise<T | null>, n = 5,
                                  key: (x: T) => string = x => JSON.stringify(x)) {
  const outs = (await Promise.all(Array.from({ length: n }, callLLM))).filter((x): x is T => x !== null);
  const counts = new Map<string, { v: T; c: number }>();
  for (const o of outs) { const k = key(o); counts.set(k, { v: o, c: (counts.get(k)?.c ?? 0) + 1 }); }
  const best = [...counts.values()].sort((a, b) => b.c - a.c)[0];
  return { value: best?.v ?? null, confidence: best ? best.c / n : 0,   // invalid answers count as "no"
           why: `${best?.c ?? 0}/${n} independent runs gave the same answer` };
}
// Tip: compare only decision-relevant fields in key(), e.g. x => `${x.absenceType}|${x.days}`.
// Run with temperature > 0, otherwise all answers are identical and confidence is meaningless.
```

### Code sketch: abstention threshold tuned on a small labeled set (TypeScript)

```ts
type Labeled = { confidence: number; correct: boolean };   // run the pipeline on 20–50 labeled cases

function tuneThreshold(data: Labeled[], maxErrorRate = 0.05, minAccepted = 5) {
  const cands = [...new Set(data.map(d => d.confidence))].sort((a, b) => a - b);
  for (const t of cands) {                                   // lowest threshold that meets the error requirement
    const acc = data.filter(d => d.confidence >= t);
    if (acc.length < minAccepted) break;
    const err = acc.filter(d => !d.correct).length / acc.length;
    if (err <= maxErrorRate)
      return { threshold: t, coverage: acc.length / data.length, errorRate: err };
  }
  return { threshold: Infinity, coverage: 0, errorRate: 0 };  // everything to a human
}
// Show in the demo: "At threshold 0.8, 70% is automated with 0 errors out of 14; the rest -> case handler."
// Honesty: with 30 examples this is an indication, not a guarantee.
```

---

## 5. "LLM extracts, rules decide" (neuro-symbolic)

- **Idea**: LLMs are good at *reading* (free text -> fields) but unreliable at *counting and following policy* consistently. Let the LLM produce structured data, let deterministic code make decisions. This gives reproducibility, testability and an audit trail.
- **Structured outputs**: force JSON against a schema (JSON Schema / tool use / Zod). Always validate yourself as well – a schema error = automatic escalation, never a silent guess.
- **LLM as a "compiler" of rules**: documents (collective agreement, policy) -> the LLM proposes rules as data (`{ if: ..., then: ..., source: "§4.2" }`) -> a human reviews and approves -> the rule engine runs. The LLM runs at *authoring time*, not at every decision. A strong pitch for regulated environments.
- **Hackathon version**: Zod schema + `safeParse`; rules as an array of `{ id, when(x), effect, reason }`; every rule that fires is written to `why[]`.

### Anthropic: "Building effective agents" (19 Dec 2024)
Workflow patterns (predefined code paths) vs agents (the LLM steers itself):
- **Prompt chaining**: steps in sequence with programmatic checks ("gates") between the steps. -> extract -> validate -> decide.
- **Routing**: classify the input and send it to a specialized follow-up. -> §2.
- **Parallelization**: *sectioning* (split up) or *voting* (same task several times). -> self-consistency.
- **Orchestrator-workers**: a central LLM splits up and delegates dynamically. -> probably overkill for a PoC.
- **Evaluator-optimizer**: one LLM generates, another evaluates in a loop. -> useful for the "explanation text", not for the decision.
- **Core advice**: start with the simplest solution and add complexity only when needed; workflows for well-defined tasks that need predictability, agents for open-ended problems. Quote: "the most successful implementations use simple, composable patterns rather than complex frameworks."
- **For us**: payroll handling = well-defined + needs predictability -> **workflow, not agent**.

---

## 6. Explainable scoring

### Weighted signals (linear score)
- `score = Σ wᵢ · xᵢ`, decision via threshold. Each term is a line in the "why". Weights are set by hand in the PoC (and can later be estimated with logistic regression).

### Log-odds / naive Bayes evidence
- Each signal contributes a log-likelihood ratio: `logit(P) = logit(prior) + Σ log(P(sigᵢ|risk)/P(sigᵢ|ok))`. Additive -> explainable ("+1.2 because the date is missing"). Assumes independent signals – don't double-count the same thing.
- Convert to probability: `P = 1/(1+e^-logit)`.

### Noisy-OR (Pearl, 1988)
- For "any one of several reasons is enough" (e.g. risk of incorrect payment): `P(risk) = 1 − Π(1 − pᵢ)` over active signals. Monotonic, intuitive, each signal has its own probability to explain.

### Credit scorecards as precedent
- Banks have long used *scorecards*: logistic regression on binned variables (Weight of Evidence), rescaled to integer points ("points to double the odds"). Popular with banks and regulators precisely because every point can be explained and audited.
- US: ECOA/Regulation B requires *specific reasons* for denial (adverse action). CFPB Circular 2022-03 emphasized that this applies to complex algorithms too (the circular was withdrawn in May 2025, but the basic ECOA/Reg B requirement remains).
- EU: the AI Act (Regulation 2024/1689) classifies AI for recruitment/employment decisions as high risk (Annex III point 4) with requirements for human oversight (Art. 14). Relevant for SD Worx as an HR player. Verify exact applicability and timeline against the official text before using it in the pitch.

### Code sketch (short): scorecard with "why"
```ts
type Signal = { id: string; when: (x: Extract) => boolean; points: number; reason: string };
function scorecard(x: Extract, signals: Signal[], threshold: number) {
  const hits = signals.filter(s => s.when(x));
  const total = hits.reduce((a, s) => a + s.points, 0);
  return { total, decision: total >= threshold ? "review" : "auto-ok",
           why: hits.map(s => `${s.points > 0 ? "+" : ""}${s.points} ${s.reason}`) };
}
```

---

## 7. Decision guide: if the task is X, use Y

| If the task is… | Use | Why |
|---|---|---|
| Free text -> fields (absence notification, email) | Structured output + schema validation | Errors become visible, not silent |
| Choosing a handling path among a few known categories | Rules-first router, embedding fallback | Free, fast, explainable |
| Categories are fuzzy/many | Embedding router + LLM classification with enum | Covers the long tail |
| Some cases are easy, others hard | Cascade with thresholds | Cheap path for the majority |
| Errors are expensive (payment, legal) | Abstention + human-in-the-loop, threshold on a labeled set | Controlled error risk |
| Need confidence but have no logprobs | Self-consistency (5 samples, majority share) | Better calibrated than verbalized confidence |
| Decision must be auditable | Rules + scorecard with `why[]` | Every point has a reason |
| Policy/agreements change often | LLM as rule compiler + human approval | Rules as data, not prompt |
| Temptation to build an "agent" | Prompt chaining with gates | Anthropic's advice: the simplest that works |

**Default architecture for the PoC (one day):**
`route (rule->embedding) -> extract (LLM, schema) -> validate (Zod + rules) -> confidence (self-consistency) -> scorecard -> gate: auto | review | human`, with `why[]` collected through the whole chain and shown in the UI.

**Do not build in one day**: trained routers (RouteLLM/Hybrid), POMDP (AutoMix), real conformal guarantees, MoE, agent loops.

---

## 8. Pitch one-liners (verified against source)

- "FrugalGPT showed that an LLM cascade can match GPT-4 with up to 98% lower cost." (Chen et al., 2023)
- "LMSYS RouteLLM routers cut cost by over 85% on MT Bench with 95% of GPT-4's performance." (LMSYS blog, 2024)
- "Hybrid LLM made up to 40% fewer calls to the large model without lower quality." (Ding et al., ICLR 2024)
- "AutoMix: over 50% lower compute cost at comparable performance by letting the small model verify itself." (2023)
- "LLMs that state their own certainty in words are systematically overconfident – so we measure agreement instead." (Xiong et al., ICLR 2024)
- "Self-consistency – letting the model answer several times and vote – gave +17.9% on GSM8K." (Wang et al., 2022)
- "Switch Transformer: letting a gate send each input to exactly one expert gave up to 7x faster training." (Fedus et al., 2021)
- "Research on learning-to-defer shows that human + model can be both more accurate and less biased than either alone." (Madras et al., NeurIPS 2018)
- "Conformal abstention gives statistical control over how often the model hallucinates – we use the same principle to set our threshold." (Abbasi-Yadkori et al., 2024)
- "Anthropic: the most successful implementations use simple, composable patterns – not complex frameworks." (Building effective agents, 2024)
- "Banks have used scorecards for decades precisely because every point can be explained – we take the same idea to payroll and HR."

---

## Sources

- FrugalGPT – Chen, Zaharia, Zou (2023): https://arxiv.org/abs/2305.05176
- Language Model Cascades – Dohan et al. (2022): https://arxiv.org/abs/2207.10342
- Language Model Cascades: Token-Level Uncertainty and Beyond – Gupta et al. (ICLR 2024): https://arxiv.org/abs/2404.10136
- AutoMix (2023): https://arxiv.org/abs/2310.12963
- RouteLLM paper – Ong et al. (2024): https://arxiv.org/abs/2406.18665
- RouteLLM blog – LMSYS (2024-07-01): https://lmsys.org/blog/2024-07-01-routellm/
- Hybrid LLM – Ding et al. (ICLR 2024): https://arxiv.org/abs/2404.14618
- semantic-router (aurelio-labs): https://github.com/aurelio-labs/semantic-router , docs: https://docs.aurelio.ai/
- Outrageously Large Neural Networks: Sparsely-Gated MoE – Shazeer et al. (2017): https://arxiv.org/abs/1701.06538
- Switch Transformers – Fedus, Zoph, Shazeer (2021): https://arxiv.org/abs/2101.03961
- Predict Responsibly (learning to defer) – Madras, Pitassi, Zemel (NeurIPS 2018): https://arxiv.org/abs/1711.06664
- Consistent Estimators for Learning to Defer to an Expert – Mozannar, Sontag (ICML 2020): https://arxiv.org/abs/2006.01862
- Mitigating LLM Hallucinations via Conformal Abstention – Abbasi-Yadkori et al. (2024): https://arxiv.org/abs/2405.01563
- Can LLMs Express Their Uncertainty? – Xiong et al. (2023/ICLR 2024): https://arxiv.org/abs/2306.13063
- Self-Consistency Improves Chain of Thought Reasoning – Wang et al. (2022): https://arxiv.org/abs/2203.11171
- Building effective agents – Anthropic (2024-12-19): https://www.anthropic.com/engineering/building-effective-agents
- CFPB Circular 2022-03 (adverse action, complex algorithms; withdrawn 2025): https://library.nclc.org/companion-material/consumer-financial-protection-circular-2022-03-adverse-action-notification
- EU AI Act, Regulation (EU) 2024/1689 (Annex III, Art. 14): https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- Background without a link: Pearl (1988) *Probabilistic Reasoning in Intelligent Systems* (noisy-OR); Siddiqi (2006) *Credit Risk Scorecards* (Wiley) (WoE, points-to-double-odds); Chow (1970) on the reject option.

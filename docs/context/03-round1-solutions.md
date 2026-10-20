# How the teams solved Round 1 (SD Worx)

Both repos found use the same core idea: **LLM (or regex) extracts → deterministic code decides → UI shows a "trust receipt".**
That is the baseline in the final. All 16 SD Worx finalist teams likely have something similar.

---

## TrustLens: [SamuelShubert/tectonic_hackathon](https://github.com/SamuelShubert/tectonic_hackathon)
Python, FastAPI, 42 tests. LLM: Gemini / Vertex / OpenAI-compatible (demo: `openai/gpt-oss-120b` via Groq).

**Architecture: "the LLM extracts, the code decides"**
- `engine/rules.py`, **Layer 1**: pure rule functions on the source's **metadata** (never reads the content, never calls the LLM).
  Signature: `rule(source, ctx, kb, cfg) -> RuleResult | None` with status PASS / WARN / FAIL / INFO + a readable label.
  Rules: `country_match`, `superseded`, `freshness` (max age per source type), status, owner (ACTIVE / LEAVING / LEFT / MISSING / EXTERNAL), handover risk, authority.
  A new rule = one function added to `RULES`.
- `engine/llm.py`, **Layer 2**: the LLM reads the content → answer, `winning_source_id`, `cited_source_ids`, conflicts, exceptions as **validated JSON**.
- `engine/confidence.py`, **decision**: High/Medium/Low is computed by code. "Rules evaluated in order; the first level with reasons wins."
  "The LLM cannot talk its way to High": if the LLM picks a superseded source, the rules fail it and confidence becomes Low.
- **Expert routing**: the owner of the "anchor source" if active. Otherwise an active expert for the country by role priority. Smart detail: **if a source's owner is leaving soon → "ask X before 15 Oct"**.
- Offline mode: without an LLM key only the trust signals are shown. `?mock=1` gives example answers.

**Demo:** 3 fictional Belgian customers (brewery PC 118, logistics PC 140.03, software PC 200). Cases: info only in email + draft and the owner is leaving → Medium. Old file superseded → High. File says €150, newer chat says €175 → Low.

**Security:** The API takes only question + customer. User/country/date are handled server-side. The same 403 for an unknown and a forbidden customer, the same 404 for all refused PDFs. PDF by ID (`DOC-nnn`), never by path. Prompt-injection protection, validated output, strict CSP, rate limit, body-size limit, `textContent` in the UI, pinned dependencies + `pip-audit`.

---

## Trust Receipt / knowledge-trust: [de-vandepitjes/knowledge-trust](https://github.com/de-vandepitjes/knowledge-trust)
Next.js 16 + TS + Tailwind, live on Vercel: https://knowledge-trust.vercel.app

- **Fully deterministic, no LLM.** The decision was made because Gemini's free tier hit its daily quota during testing. "A rule-based extractor is explainable, instant and never fails in a demo."
- `src/lib/analyse.ts`: extracts claims from document lines, groups candidate answers by value, finds conflicts.
- `src/lib/trust.ts`: five signals per source, each green/amber/red with label + detail:
  - **freshness**: ≤12 months green, ≤24 amber, older red ("payroll amounts are indexed yearly")
  - **ownership**: no owner red, owner has left amber
  - **scope**: wrong country red, wrong joint committee (PC) red, customer-specific green (overrides general policy)
  - **sourceType**: policy/customer agreement green, handover note/chat amber
  - **consensus**: in conflict with another source?
- Verdict: **safe to act / verify first / stop**. Weights are shown in the UI. **Feedback loop:** mark the answer you acted on → adjusts source scores and weights.
- Corpus: fictional Belgian payroll data with **planted problems**: outdated handover note, duplicate without an owner, Dutch rule cited in a Belgian thread, customer-specific agreement that changes the answer, planted "ignore previous instructions" line in a Teams export.
- Security: scrypt-hashed passwords, brute-force protection, per-customer authorisation server-side, documents out of scope "do not exist" (404).
- Curated demo prose for the 4 demo questions (`data/curated-answers.json`).

---

## What we learn
1. **The baseline is already high.** Trust signals + verdict + expert routing are "table stakes" now. We need a new angle or a clearer wow.
2. **Planted problems in synthetic data** make the demo convincing. Design the data *for* the demo.
3. **An offline/deterministic fallback** is not optional. LLM quotas run out.
4. **Security as a feature**: per-customer scope, the same error code for unknown/forbidden, prompt injection in data.
5. **Explainability in the UI:** every chip/signal has label + detail + colour.
6. Smart details that stand out: "the owner leaves 15 Oct, ask before then", customer-specific agreement overrides policy, feedback loop.

## Other ideas the teams discussed but did not build
(from knowledge-trust `docs/decisions.md`): **knowledge decay detector**, **voice handover capture** (ElevenLabs!), **evidence-based expert finder**.

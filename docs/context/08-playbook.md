# Playbook for final day

## When the task arrives (first 30 min)
1. Paste the brief verbatim into `docs/context/09-final-task.md`.
2. Find the **moment of doubt / the friction**: who (role), when (flow), what makes them unsure?
3. Pick **one** role + **one** flow. Write one sentence: "When [role] has to [do X] and [friction], we show [Y] so that they can [act safely]."
4. Pick an architecture from `04-ai-patterns.md` and `05-research-routing-cascades.md`: the 4 layers + at most **one** extra pattern.
5. Plan the demo *first* (3 min): which 3–4 scenarios do we show? Design synthetic data with **planted problems** for them.

## Differentiation (everyone has a "trust receipt" from Round 1)
- Do something **active**, not just an answer: propose an action, a rule change, a draft that the human approves.
- Use a dimension others miss: time (expires/the owner leaves), country/PC routing, cascade to a human with the evidence ready.
- Connect to SD Worx's own direction: agents for payroll consultants, documents → rules, emails → actions, human-in-the-loop.
- Voice (ElevenLabs) only if it solves the friction (e.g. handover through an interview), not as a gimmick.

## Build in this order
1. Synthetic data (JSON) + types/schema.
2. Deterministic engine (rules → score → verdict + `why`) with tests. **Works without an LLM.**
3. LLM extraction that fills the schema (+ mock/cache mode).
4. UI: answer + receipt + next step.
5. Security (see below) → Aikido baseline → fix → screenshot.
6. README + demo video.

## Security checklist (Aikido, 10%)
- [ ] Auth + **authz server-side on every request** (user → allowed customers).
- [ ] No IDs from the client that grant access without a check (IDOR). Same 403/404 for "does not exist" and "not allowed".
- [ ] User/role/country determined server-side, never from the request body.
- [ ] Document content is treated as data (prompt injection). Validate LLM output with a schema.
- [ ] No keys in the repo (`.env` in `.gitignore`, `.env.example` with empty values).
- [ ] Rate limit + body size limit on the API.
- [ ] Render text with `textContent` / React escaping, no `dangerouslySetInnerHTML`.
- [ ] Run Aikido **early** (baseline screenshot), fix, run again.

## Submission checklist
- [ ] Repo public, README (what, how to run, unfinished)
- [ ] Demo video < 3 min
- [ ] Aikido before/after screenshots
- [ ] Short description in Builderbase
- [ ] Test all links in incognito
- [ ] Final means final: submit in good time

## Demo script (< 3 min)
1. 20 s: the person and the friction ("Lien, payroll consultant, a customer calls ...").
2. 90 s: 2–3 scenarios: one green, one where the system **stops or escalates** (that is where trust becomes visible).
3. 30 s: how it works (LLM understands, code decides, the human approves) + security.
4. 20 s: scale (more countries/PCs = more rules, not more models) + link to SD Worx's agent strategy.

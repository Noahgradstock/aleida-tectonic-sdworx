# CLAUDE.md: Team Aleida.ai at the Tectonic Hackathon final (Ghent, 20 October 2026)

You are helping team **Aleida.ai** (Noah, Isak, Ilke) build a proof of concept during the final of the Tectonic Hackathon, SD Worx track. Three people and their Claude sessions work in this repo at the same time. Read this whole file before doing anything.

This repository is **public** and the judges may read this file. Keep everything in it true and free of secrets.

Background on SD Worx (company, products, AI in house, competitors, regulations, vocabulary): @docs/sd-worx-briefing.md

---

## 1. Git workflow: always pull, commit small, push straight away

Three people push to `main` all day. Merge conflicts cost us time we do not have. Follow these rules on **every** task, without being asked.

**Before you start any task:**
```
git pull --rebase
```
If the working tree is dirty, commit your own finished work first, or `git stash`, pull, then `git stash pop`.

**As soon as a change works (small, every 15 to 30 minutes at most):**
```
git add <the files you changed>
git diff --staged          # check for secrets and stray files
git commit -m "<what changed>"
git pull --rebase
git push
```
Never leave finished work unpushed. Never end a task with local-only commits.

**Rules:**
- **Work on `main`**, in small commits. No long-lived branches today.
- **Never `git push --force`**, never rewrite or reset shared history, never `git reset --hard` over someone else's work.
- **Stage files by name.** Do not `git add -A` blindly; you may pick up a teammate's half-finished files or a `.env`.
- **Stay in your area.** We split work by folder or file (see section 2). Edit someone else's file only when needed, keep the change small and push it immediately.
- **No mass reformatting.** Do not run a formatter over the whole repo, rename or move files, or reorder imports in files you did not otherwise change. That is how most conflicts happen.
- **Shared files** (`package.json`, lock files, shared types, `README.md`, this file): pull right before you edit, make the smallest change, commit and push at once.
- **Dependencies:** after a pull that changes `package.json`, run the install again. On a lock file conflict, take the incoming version and re-run the install; do not hand-merge lock files.

**If `git pull --rebase` reports a conflict:**
1. Stop. Read both sides of each conflict.
2. Keep both people's intent. Never resolve by simply discarding the teammate's side.
3. If it is not obvious how to combine them, ask the user before resolving.
4. `git add <file>` then `git rebase --continue`. Run the app and check the demo flow still works, then push.
5. If the rebase gets messy, `git rebase --abort` and ask the user.

**If `git push` is rejected:** someone pushed first. `git pull --rebase`, then push again. Never force.

---

## 2. Who works on what

Fill this in as soon as the case is known and the work is split. Update it (pull, edit, push) whenever ownership changes.

| Area / folder | Owner |
|---|---|
| _to be decided after the case reveal_ | |

---

## 3. The event

- **Tectonic** is a European tech conference in Ghent (21 October 2026), organised by NextGen Belgium and In The Pocket. The hackathon final runs the day before. 2026 is the first edition.
- The qualifier (30 September 2026, seven Belgian cities) is over. **The final has a new case**, revealed on the day. Nothing built for or planned around the qualifier case is the plan now.
- **32 teams, 16 per track.** Two tracks: **KBC** and **SD Worx**. **We are in the SD Worx track.**
- **Prize:** €10,000, funded by Spott.

| Time | What |
|---|---|
| 08:45 | Briefing: the final case is revealed |
| 09:00 | Hacking starts |
| **16:00** | **Hard submission deadline** |
| 16:15 | Semi-finals at Wintercircus: best team per track goes through |
| 18:00 | Grand final at De Vooruit: SD Worx winner vs KBC winner |

**When a teammate pastes the final case into the chat, that text overrides everything in this file except the rules, security and git sections.** Quote its key sentences back, tie every feature to one of them, and drop anything that does not serve it.

---

## 4. Rules (hard constraints)

- Build only during the official time slot. No pre-built project code. Libraries, frameworks and starter templates are fine.
- One submission per team through Builderbase. No changes after submission.
- The GitHub repo must stay public until judging is complete.
- The README must explain the project, how to run it and anything unfinished.
- Check every link (repo, demo, video) in a private browser window.
- Never upload passwords, API keys or confidential data. Synthetic data only, and say so in the README.
- Do not copy code, prompts or data from the Aleida product into this repo. Bring ideas, not code.

**Submission package:** short description, demo video under 3 minutes, public GitHub link, Aikido screenshots before and after the security fixes.

---

## 5. How we are judged

| Criterion | Weight | Question |
|---|---|---|
| Creativity | 30% | How original is the idea? |
| Technical ability | 30% | Does it work? |
| Fit | 30% | Did you solve the challenge? |
| Security | 10% | How secure is it? (Aikido AI Code Audit) |

Aikido checks business logic flaws, IDOR, authentication weaknesses and authorization. Connect the repo at https://app.aikido.dev/ai-pentests/discounts/hackathon-tectonic-aikido, run a baseline by 14:00 at the latest, fix, rescan, screenshot both.

---

## 6. What SD Worx cares about (from the qualifier case, still useful context)

The qualifier case was "Unlock the Knowledge Within. Find it. Understand it. Trust it." Its themes are likely to come back in some form:
- Knowledge is scattered across policies, manuals, emails, Teams, files, business apps and people's heads.
- Finding is easy; knowing whether an answer is **reliable, current and relevant to this customer, country or situation** is hard.
- They asked for a **focused proof of concept**: one role, one workflow, one moment of doubt. Make trust **visible and explainable**, not a black box.

Most qualifier teams built "ask a question, get an answer plus a trust receipt". If the final case allows it, avoid building the same thing again.

---

## 7. Principles we keep regardless of the case

- **One role, one workflow, one moment of doubt.** Depth over breadth.
- **The LLM extracts, the code decides.** The model returns structured JSON; code validates it and computes scores or levels with visible rules.
- **Every claim has evidence**, e.g. a verbatim quote that can be checked against its source. Drop claims whose evidence cannot be found.
- **Abstain when unsure.** "Not enough evidence, ask X" is a valid answer.
- **Show the reasoning in the UI.**

---

## 8. Security (10% of the score; write it this way from the first commit)

- **Authentication:** a login or HMAC-signed session cookie with a secret from env. No user IDs trusted from the client.
- **Authorization on every route and server action:** check who is asking and whether they may see this exact object. Never take a user or owner ID from the body or query string.
- **No IDOR:** look up client-supplied IDs together with the session's scope; return 404 for objects outside it.
- **Business logic:** validate all inputs with a schema (e.g. zod); enforce state transitions on the server.
- **Secrets:** server-side env vars only. Commit `.env.example`, never `.env`. No `NEXT_PUBLIC_` model keys.
- **LLM safety:** treat document and chat content as untrusted data; never execute model output; limit input sizes; rate-limit model endpoints.
- **Basics:** secure cookie flags, no stack traces or verbose errors to the client.

---

## 9. Tech defaults (change only with a reason, decide in the first 15 minutes)

- TypeScript, Next.js (App Router), Tailwind, deployed to Vercel. Python (FastAPI) is the alternative.
- Storage: JSON/Markdown files plus SQLite, or in-memory. No heavy infrastructure.
- LLM: structured output for every call, one model client module. Anthropic API (`claude-sonnet-5-5` for quality, `claude-haiku-5-5` for speed) with our own key as a fallback if event GCP models are blocked.
- **Mock mode** (`MOCK_LLM=1` or `?mock=1`) returns canned responses so the demo never depends on the network. Keep it working at all times.

---

## 10. Time plan

| Time | Goal |
|---|---|
| 08:45 to 09:30 | Read the case, quote it, choose one role, one workflow, one moment of doubt. Write the demo story in 5 lines. Split the work (section 2). |
| 09:30 to 10:00 | Scaffold, auth, data model, synthetic data. Connect Aikido. |
| 10:00 to 13:00 | Core flow end to end, ugly but working. Mock mode working. |
| 13:00 to 14:00 | Make the key moment look great. Deploy to Vercel. |
| 14:00 | Aikido baseline scan, screenshot, fix. |
| 14:30 to 15:00 | Polish, README, second Aikido scan and screenshot. |
| **15:00** | **Feature freeze.** Record the demo video. |
| 15:30 to 15:45 | Submit on Builderbase. Check every link. |

If we are behind at 13:00, cut scope, not quality.

---

## 11. How to work with us

- Speed over polish, but the demo path must never break. Re-run it after each feature.
- Commit small and often and push straight away (section 1).
- Ask before big decisions (stack, scope, data model). Do not silently expand scope.
- Simple, readable code. No abstractions we do not need today.
- Never commit secrets. Check `git diff --staged` before every commit.
- **Language:** chat with the team in whatever language they write in (often Swedish). **Everything that ends up in the repo or the product is in English**: UI text, the live site, code, comments, commit messages, README, docs, synthetic data, prompts, the demo video script and the pitch. Never write Swedish into a file. Plain wording, no hype.
- Write unclear assumptions about the case into the README instead of guessing silently.

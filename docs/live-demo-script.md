# Live demo script: "The meeting that taught the brain" (3 minutes + 5 minutes Q&A)

Live on stage, no video. **It opens like a film: no intro, no team names.** Two scenes play first, then Noah steps out of the scene and explains what the jury just saw.

1. **Scene 1, knowledge goes in.** Ilke and Isak are in a team meeting. The blob sits in it, corrects a wrong value out loud and, when a new fact is said, asks one question: "Shall I remember that?"
2. **Scene 2, knowledge comes out.** A week later Noah, who was not in the meeting, asks Company brain and gets the answer from that meeting, with Ilke's exact words and the reason to trust it.
3. **Then the explanation:** the mentor story, the one-liner, how it works, the close.

**One-liner (first line of the explanation, ~1:35, and the very last line):**
> "Company brain learns from the work you already do, and only asks you when it matters."

**The case sentence it answers:** "Can your solution stay trusted without becoming another task?"

---

## Cast and setup

| Who | Role on stage | Device |
|---|---|---|
| **Noah** | The colleague who asks the brain (scene 2), then the narrator | Laptop B: Company brain web app on the projector |
| **Ilke** | Payroll expert in the meeting. Owns the client Brouwerij De Kroon | Laptop A: the mascot, signed in as Ilke's demo account, microphone on |
| **Isak** | New hire, first week, in the meeting | none, only talks |

Projector: laptop A (blob in front of a "Team meeting" screen) during scene 1, laptop B during scene 2. If only one input, run both on laptop A: the blob in the corner, the browser behind it.

**Check with the organisers first:** the Finals Guide says we do not use our own device. A live mascot needs our laptop. If that is refused, keep the same script and play the recorded run (see "Backup").

---

## Script (~340 spoken words)

**Before the first word:** the projector shows laptop A: a "Team meeting · Payroll BE" screen with the blob calm in the corner. Ilke and Isak sit facing each other at a table on stage. Noah stands aside with laptop B. Nobody introduces anything. The first sentence is Isak's.

### 0:00 – 1:00 · Scene 1: the meeting (Ilke, Isak, blob)

> **ISAK:** Ilke, first week, quick question. I'm onboarding the new students at Brouwerij De Kroon. Students can work 600 hours a year, right?

*[Blob turns amber, speaks out loud. This must land by ~0:10: it tells the jury what they are watching.]*

> **BLOB:** Quick correction: 600 hours is outdated. The student work limit is 650 hours.

> **ISAK:** *(surprised)* Hey SD Worx, where does that come from?
> **BLOB:** *(names the official source)*

> **ILKE:** It's right. And one more thing for De Kroon, it's not written anywhere: we agreed 22 holiday days with them. Two on top of the law.

*[Blob turns blue and asks once.]*

> **BLOB:** New for Brouwerij De Kroon: 22 holiday days. Ilke, shall I remember that?
> **ILKE:** Yes.

*[Quiet pill on the blob: "Learned: 22 days · Brouwerij De Kroon · confirmed by Ilke". Ilke and Isak freeze. 1 second of silence.]*

### 1:00 – 1:35 · Scene 2: a week later (Noah at the brain)

*[Switch projector to laptop B: Company brain, Ask. Noah walks to it.]*

> **NOAH:** *(thinking aloud, still in the scene)* A week later. De Kroon is asking me about holidays. I wasn't in that meeting.

*[Noah types: "How many holiday days at Brouwerij De Kroon?"]*

> **NOAH:** Twenty-two. *(pause, 2 seconds)* Ilke's words, from that meeting, confirmed by her.

*[Noah types: "How many holiday days at TechStart Gent?"]*

> **NOAH:** And another client: twenty, the law.

### 1:35 – 2:30 · Explanation (Noah steps out of the scene, faces the jury)

> **NOAH:** What you just saw: Company brain learns from the work you already do, and only asks you when it matters.
> When you start at university, you get a handbook and a mentor, who tells you what isn't in the handbook. SD Worx has ten thousand mentors. What they know is said in meetings, and never written down.
> In that meeting, the only effort was one word: Ilke's "yes". Nobody opened a wiki. It didn't record the meeting: it kept one fact, with her exact words, and asked the person who said it.
> And trust stays visible. *(point at the answer on screen)* Twenty-two, not twenty, because this client has its own agreement, and it beats the law only for this client. If I still doubt it, it tells me who to ask: Ilke.
> The AI only reads. The code decides, with rules you can read: same question, same answer, every point of the score explained.

### 2:30 – 3:00 · Close (Noah)

> **NOAH:** When the law changes, old answers lose trust on their own. When something is unclear, it asks one person, one question. Not zero humans: zero unnecessary effort. Think electricity. Think wifi.
> Give us one Belgian payroll team for four weeks. We'll measure how often people have to ask a colleague, and how many payslips need a correction.
> **Company brain learns from the work you already do, and only asks you when it matters.**

*(Stop. Closing slide: name, one-liner, Noah · Isak · Ilke. It stays up for Q&A.)*

**Why this order works:** the jury feels the moment before they hear the theory, so the explanation is relief, not a lecture. **The risk:** the playbook wants the jury to know what they are watching within 10 seconds. The blob's correction at ~0:10 does that, so Isak's first line must be fast and the blob must answer on the first try. If the wake word or microphone is unreliable in rehearsal, add one title on the first screen: "Company brain sits in your meetings."

---

## Driver cues (who clicks what)

| Spoken cue | Action |
|---|---|
| Before the start | Laptop A on the projector. Mascot already **Online**, Meeting mode (`Cmd+Shift+T`). Laptop B: Ask screen open, field empty. |
| Ilke: "Yes." | Nothing. Wait for the pill, then 1 second of silence. |
| Noah walks to laptop B | Projector to laptop B. |
| "…I wasn't in that meeting." | Noah types question 1 (paste from a note if nervous). |
| "Ilke's words, from that meeting…" | Question 2. |
| "What you just saw" | Leave the De Kroon answer on screen (go back to it if needed). |

---

## What works today and what must be built

| Beat | State |
|---|---|
| Blob corrects "600 hours" out loud in a meeting | **Works** (`mascot/DEMO.md`, demo 1) |
| "Hey SD Worx, where does that come from?" | **Works** |
| Brain answers 22 days for De Kroon, 20 for TechStart, with quote, score, "who to contact" | **Works** once the 22-day claim exists and is confirmed (`/loop` demo, `docs/context/12-live-loop.md`) |
| **"Shall I remember that?" in a meeting → "Yes" → claim learned in Ilke's name, confirmed** | **Not built.** Today the mascot does not learn from meeting audio, because the microphone cannot tell speakers apart (commit a49f1d8). |

**Proposed build (mascot, Isak's area, ~1 hour):** in a meeting, when a heard sentence has a value that the brain does not know yet for that client, the blob asks the signed-in user out loud: "*<Name>*, shall I remember that?" Only on a spoken "yes" from them does it send the sentence to `/api/brain/ingest` as `channel: "meeting"` with the signed-in user as the speaker label, then confirm it from the same account. This keeps the rule "never put words in your mouth": the speaker is the account owner, and nothing is stored without their yes. It also fits the brief: "Verify when human judgement adds real value".

**Names on screen:** the demo data calls the expert Jan and the consultant Sofie. Either add demo users for Ilke and Noah (in `AUTH_USERS` on Vercel and in the people list), or say once "Ilke plays Jan, our expert". Real names on screen are cleaner.

**Fallback if the build is not ready by 15:00:** Ilke says the 22-day line, and the blob stays silent. Noah says "the meeting tool gives us the transcript", pastes it into `/loop`, and Ilke clicks "Still right" (works today). Weaker, but true.

---

## Never-fail checklist

- Reset the demo data before going on (no 22-day claim yet, otherwise "Already known").
- Run the full script 3 times in a row on the pitch laptops. Same sentences every time.
- Speak close to laptop A's microphone. Backup for a missed wake word: tap the 🎙 button.
- Wi-Fi: both laptops need the deployed brain. Phone hotspot ready.
- **Backup:** a screen recording of one clean run, no sound, ready full screen. If something breaks: "Here's the run from an hour ago", and carry on with the same script.
- Do Not Disturb on, notifications off, browser zoom 125–150 %, light theme.

---

## Q&A prep (5 minutes; answer in under 15 seconds, then stop)

| Likely question | Answer |
|---|---|
| Is this surveillance? | No. It is off until you switch it on, it keeps facts, not recordings, and in a meeting it only stores what the speaker confirms with a yes. Personal data is masked before any model call. |
| What if Ilke is wrong? | Official sources outrank people. Her claim is about one client only, so it can't overrule the law for anyone else. If someone with a better track record disagrees, the brain asks again; disagreement alone never changes a score. |
| What if the agreement changes later? | Freshness decays from the last check. Before it stops being trusted, the brain asks the one person who knows, once. At most three questions per person per week. |
| Does the AI make up answers? | The AI only reads and classifies. Every answer is a claim from a real source, with the verbatim quote, and the score comes from deterministic rules. |
| What is real and what is mocked? | The trust engine, learning from email, client scoping, login and per-client access are real. People, clients and documents are synthetic. In production, Teams transcripts give us the speaker, so we would not need the "shall I remember?" question for every line. |
| How does this fit SD Worx? | SD Worx gives consultants 7+ AI agents that read the same knowledge. This is the trust layer under them: what they should believe, and who to ask. It learns inside Teams and Outlook, where people already work. |
| Why not Copilot? | Copilot finds things. It does not tell you which of four conflicting answers to trust for this client, and it does not keep that answer trusted when people leave or rules change. |
| Security? | Aikido scan, sessions signed server-side, per-client access on every route, negative security tests, sandboxed desktop app. |
| Biggest risk? | Adoption: people must accept a colleague in the meeting. That's why it is opt-in, asks at most one question, and stays silent when you are right. |

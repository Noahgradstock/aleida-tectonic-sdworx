# Live demo script: "The meeting that taught the brain" (3 minutes + 5 minutes Q&A)

Live on stage, no video. Two scenes, one fact travelling through the company:

1. **Knowledge goes in.** Ilke and Isak hold a fake team meeting. The blob sits in it, corrects a wrong value out loud and, when a new fact is said, asks one question: "Shall I remember that?"
2. **Knowledge comes out.** Later, Noah, who was not in the meeting, asks Company brain. He gets the answer from that meeting, with Ilke's exact words, the score, and the reason he can trust it.

**One-liner (say it at ~0:40 and as the last line):**
> "Company brain learns from the work you already do, and only asks you when it matters."

**The case sentence it answers:** "Can your solution stay trusted without becoming another task?"

---

## Cast and setup

| Who | Role on stage | Device |
|---|---|---|
| **Noah** | Narrator, then the colleague who asks the brain (scene 2) | Laptop B: Company brain web app on the projector |
| **Ilke** | Payroll expert in the meeting. Owns the client Brouwerij De Kroon | Laptop A: the mascot, signed in as Ilke's demo account, microphone on |
| **Isak** | New hire, first week, in the meeting | none, only talks |

Projector: laptop A (blob in front of a "Team meeting" screen) during scene 1, laptop B during scene 2. If only one input, run both on laptop A: the blob in the corner, the browser behind it.

**Check with the organisers first:** the Finals Guide says we do not use our own device. A live mascot needs our laptop. If that is refused, keep the same script and play the recorded run (see "Backup").

---

## Script (~350 spoken words)

### 0:00 – 0:20 · Hook (Noah)

> **NOAH:** When you start a new job you get a handbook. And if you are lucky, a mentor, who tells you what is not in the handbook. SD Worx has ten thousand of those mentors. What they know is said in meetings, every day, and it is never written down.

### 0:20 – 0:40 · One-liner (Noah)

> **NOAH:** So we built a colleague that sits in the meeting. Company brain learns from the work you already do, and only asks you when it matters. This is Ilke, payroll expert. This is Isak, first week on the job.

*[Switch projector to laptop A. Ilke and Isak turn to each other. The blob is calm.]*

### 0:40 – 1:30 · Scene 1: the meeting (Ilke, Isak, blob)

> **ISAK:** I'm onboarding the new students at Brouwerij De Kroon. Students can work 600 hours a year, right?

*[Blob turns amber, speaks out loud.]*

> **BLOB:** Quick correction: 600 hours is outdated. The student work limit is 650 hours.

> **ISAK:** Hey SD Worx, where does that come from?
> **BLOB:** *(names the official source)*

*[Beat. Ilke takes over.]*

> **ILKE:** Good. And one more thing for De Kroon: we agreed 22 holiday days with them. Two on top of the law.

*[Blob turns blue and asks once.]*

> **BLOB:** New for Brouwerij De Kroon: 22 holiday days. Ilke, shall I remember that?
> **ILKE:** Yes.

*[Quiet pill on the blob: "Learned: 22 days · Brouwerij De Kroon · confirmed by Ilke".]*

> **NOAH:** That was the only effort anyone made: one word. Nobody opened a wiki. And notice what it did not do: it did not record the meeting. It kept one fact, with the words Ilke used, and asked the person who said it.

### 1:30 – 2:25 · Scene 2: a week later (Noah at the brain)

*[Switch projector to laptop B: Company brain, Ask.]*

> **NOAH:** A week later. I wasn't in that meeting. A client asks me about holidays.

*[Noah types: "How many holiday days at Brouwerij De Kroon?"]*

> **NOAH:** Twenty-two days. *(pause, 2 seconds)* Not the twenty in the law, because this client has its own agreement. Here are Ilke's exact words, from the meeting, with the date. Confirmed by Ilke. And if I still doubt it, it tells me who to ask: Ilke.

*[Noah types: "How many holiday days at TechStart Gent?"]*

> **NOAH:** Another client, no agreement: twenty days, the law. Same brain, the right answer per client.

*[Optional if time: open the Brain web and point at the new green node.]*

> **NOAH:** The AI only reads. The code decides, with rules you can read, so the same question gives the same answer and every point of the score is explained.

### 2:25 – 3:00 · Close (Noah)

> **NOAH:** When the law changes, old answers lose trust on their own. When something is unclear, the brain asks one person, the one with the best track record, one question. Not zero humans: zero unnecessary effort. Think electricity. Think wifi.
> Give us one Belgian payroll team for four weeks. We'll measure how often people have to ask a colleague, and how many payslips need a correction.
> **Company brain learns from the work you already do, and only asks you when it matters.**

*(Stop. Closing slide stays up for Q&A: name, one-liner, team.)*

---

## Driver cues (who clicks what)

| Spoken cue | Action |
|---|---|
| "…this is Isak, first week on the job." | Projector to laptop A. Mascot already **Online**, Meeting mode (`Cmd+Shift+T`). |
| Ilke: "Yes." | Nothing. Wait for the pill. |
| "A week later." | Projector to laptop B. Ask screen open, field empty, signed in as Noah's demo user. |
| "A client asks me about holidays." | Noah types question 1 (paste from a note if nervous). |
| "Another client, no agreement" | Question 2. |

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

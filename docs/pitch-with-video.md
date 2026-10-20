# Pitch script with the 1-minute demo video (3 minutes + 5 minutes Q&A)

We cannot use our own device, so the demo is a **silent 1-minute video** (`video/film-silent.mp4`, made by `video/make-film.mjs`) embedded in the slides. No titles, no music: we talk over it.

**The case question:** "Can your solution stay trusted without becoming another task?" Every beat of the film answers one line of the brief.

| Film time | On screen | Case line it answers |
|---|---|---|
| 0:00 – 0:16 | A team meeting, Isak (new hire) and Ilke (payroll expert). The blob sits in the corner, silent. Isak: "Students can work 600 hours a year, right?" The blob steps in once: the trusted value is 650 hours (official source, 96%). Ilke: "For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law." Meeting ends: "Transcript sent to Company brain". | *Invisible when things work, clear when people need to act.* *Think beyond documents.* |
| 0:16 – 0:26 | Ilke's "What changed today". Nobody pasted anything: both statements arrived by themselves. Isak's guess scores 3% and asks nobody (the law already answers it, the six checks show why). Ilke's line: "Counts as yours tomorrow unless you change it". | *Automate what can happen in the background.* *Minimise effort.* |
| 0:26 – 0:32 | Ilke clicks **Looks right** once: "Ilke confirmed it · 20 days → 22 days · 97%". | *Verify when human judgement adds real value.* |
| 0:32 – 0:43 | A week later, Noah writes to De Kroon: "full-time employees get 20 holiday days". The blob turns amber: for Brouwerij De Kroon it's 22 days (97%, from the meeting). **Fix it**: the email now says 22. Noah never searched. | *Integrate naturally into existing ways of working.* *Find it.* |
| 0:43 – 0:50 | Why 22? The answer: 22 days · 97 · Trusted. Reliable: Ilke, expert. Applies here: the client's own agreement. Ilke's exact words. | *Understand it. Trust it. Make it transparent.* |
| 0:50 – 0:54 | "Will it hold?": the same rules run 18 months ahead. No end date in sight. | *Keep it trusted. Knowledge changes.* |
| 0:54 – 1:00 | Who to talk to: "Contact Ilke first". Koen has left the company and is no longer suggested. | *Who really knows this customer? People change roles.* |

**Cast:** Noah = narrator. Isak and Ilke say their meeting lines live, on cue.

**One-liner (say it twice):**
> "Company brain learns from the work you already do, and only asks you when it matters."

---

## Script (~350 spoken words)

### 0:00 – 0:15 · Hook, before the video (Noah)

> **NOAH:** When you start a new job you get a handbook. If you're lucky, you also get a mentor, who tells you what's not in it. SD Worx has ten thousand mentors. What they know is said in meetings, and never written down. Watch.

*[Video starts.]*

### 0:15 – 1:15 · Over the video

| Film | Who | Line |
|---|---|---|
| 0:01 | **ISAK** | "Students can work 600 hours a year, right?" |
| 0:05 | **NOAH** | "The blob sits in the meeting and stays quiet. Until something is wrong: it's 650." |
| 0:10 | **ILKE** | "For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law." |
| 0:16 | **NOAH** | "The meeting ends. Nobody writes anything down, nobody pastes anything." |
| 0:19 | **NOAH** | "Both statements reach the brain by themselves. Isak's guess goes nowhere: the law already answers it. Ilke's agreement counts by itself tomorrow, unless Ilke changes it." |
| 0:27 | **NOAH** | "Or one click makes it count right now. Ninety-seven." |
| 0:33 | **NOAH** | "A week later, I write to the client. I wasn't in that meeting." |
| 0:38 | **NOAH** | "Twenty days is the law, but not for this client. The blob knows, because Ilke said it. One click, fixed." |
| 0:44 | **NOAH** | *(pause 1 s)* "And if I want to know why: Ilke's own words, the score, and every rule behind it." |
| 0:50 | **NOAH** | "Will it still be true next year? It checks that too." |
| 0:54 | **NOAH** | "And who to ask: Ilke. Not Koen, who left." |

### 1:15 – 2:30 · What you just saw (Noah, video ends on black, then a slide)

> **NOAH:** Company brain learns from the work you already do, and only asks you when it matters.
> Automate: the meeting, the email, the Teams message are already there. The brain reads them in the background.
> Verify: only when a human adds real value. Isak's guess was never sent to anyone. Ilke's agreement counts by itself after a day, or right away with one click.
> Minimise: at most three questions a week, always to the person with the best track record on that topic.
> Integrate: the blob sits in your meeting and your email, silent when you're right.
> Understandable: the AI only reads. The code decides, with rules you can read. Same question, same answer, every point explained.

### 2:30 – 3:00 · Close (Noah)

> **NOAH:** When the law changes or people leave, old answers lose trust on their own, and the brain asks the next person who knows. Not zero humans: zero unnecessary effort. Think electricity. Think wifi.
> Give us one Belgian payroll team for four weeks. We'll measure how often people have to ask a colleague, and how many payslips need a correction.
> **Company brain learns from the work you already do, and only asks you when it matters.**

*(Stop. Closing slide: name, one-liner, Noah · Isak · Ilke. It stays up for Q&A.)*

---

## Rehearsal notes

- Rehearse over the video at least twice. Sync points: Isak's caption (0:01), Ilke's caption (0:10), the amber blob in the email (0:38).
- The meeting captions are on screen, so if a cue is missed the jury can still read the line.
- If you run long, pause the video (space bar) on the email fix and finish the sentence.
- Keep the video file local in the slides (PPT: insert video). Key frames for a PDF fallback: `PREVIEW=1 node make-film.mjs` writes them to `video/out/keys/`.

## What is real in the video (say it honestly if asked)

- **Real app, real engine:** every Company brain screen is the running app, recorded as it ran: extraction from the transcript, the six checks, the 50% cap for spoken claims, "counts as yours tomorrow", Ilke's confirmation, 97%, the client-specific answer, "Will it hold?", "Contact Ilke first".
- **Real mascot logic:** the blob's warnings and the email fix come from the mascot's own code (`mascot/brain.js`) run against that app, not from a script.
- **Stand-ins:** the meeting window and the mail window were built for the film. The blob inside them is the real mascot interface.
- **The hand-off from the meeting tool is simulated:** the transcript (with speaker names) is sent to the brain's real ingest route, exactly as a Teams connector would. The connector itself (Microsoft Graph meeting transcripts) is not built yet. The mascot does not learn from raw microphone audio, because a microphone cannot tell who is speaking.
- **Names:** on screen, the demo personas carry our names (Jan → Ilke, Tom → Isak, Sofie → Noah), like the mascot's stage names. People, clients and documents are synthetic.

---

## Q&A prep (5 minutes; answer in under 15 seconds, then stop)

| Likely question | Answer |
|---|---|
| Is this surveillance? | No. It is off until you switch it on, it keeps facts, not recordings, and only from transcripts that carry speaker names. Personal data is masked before any model call. |
| What if Ilke is wrong? | Official sources outrank people. The claim is about one client only, so it can't overrule the law for anyone else. If someone with a better track record disagrees, the brain asks again; disagreement alone never changes a score. |
| What if the agreement changes later? | Freshness decays from the last check. Before it stops being trusted, the brain asks the one person who knows, once. At most three questions per person per week. |
| Does the AI make up answers? | The AI only reads and classifies. Every answer is a claim from a real source, with the verbatim quote, and the score comes from deterministic rules. |
| What is real and what is mocked? | See "What is real in the video" above: the brain is real end to end; the meeting screen is a stand-in for Teams; the data is synthetic. |
| How does this fit SD Worx? | SD Worx gives consultants 7+ AI agents that read the same knowledge. This is the trust layer under them: what they should believe, and who to ask. It learns inside Teams and Outlook, where people already work. |
| Why not Copilot? | Copilot finds things. It does not tell you which of four conflicting answers to trust for this client, and it does not keep that answer trusted when people leave or rules change. |
| Security? | Aikido scan, sessions signed server-side, per-client access on every route, negative security tests, sandboxed desktop app. |
| Biggest risk? | Adoption: people must accept a colleague in the meeting. That's why it is opt-in, asks at most one question, and stays silent when you are right. |

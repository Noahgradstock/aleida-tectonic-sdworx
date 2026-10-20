# Pitch script with the 1-minute demo video (3 minutes + 5 minutes Q&A)

We cannot use our own device, so the demo is a **silent 1-minute video** (`video/film-silent.mp4`, made by `video/make-film.mjs`) embedded in the slides. No titles, no music: we talk over it.

**What the video shows (all real app screens, recorded from the app):**

| Film time | On screen |
|---|---|
| 0:00 – 0:16 | A team meeting, "Payroll BE · weekly": Tom (new hire) and Jan (payroll expert). The blob sits in the corner. Tom says students can work 600 hours. The blob turns amber: the trusted value is 650 hours (official source, 96%). Jan says: "For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law." |
| 0:16 – 0:18 | "Meeting ended · Transcript sent to Company brain." |
| 0:18 – 0:27 | Company brain, "What changed today", with no clicks: the meeting arrives by itself. Tom's 600 hours is heard at 3%. Jan's 22 days for Brouwerij De Kroon is heard at 50%, "Waiting for Jan". |
| 0:27 – 0:34 | Jan's screen, "Waiting for you": one card with Jan's own words, ✓ That's right. One click: "Jan Wouters confirmed it · 20 days → 22 days · 97% · +47 pts". |
| 0:34 – 0:41 | A week later, Sofie (not in the meeting) asks: "How many holiday days do employees get at Brouwerij De Kroon?" The brain reads its sources. |
| 0:41 – 0:48 | **22 days · 97 · Trusted.** Reliable: Jan Wouters, expert. Applies here: the client's own agreement. Jan's exact words from the meeting. |
| 0:48 – 1:00 | Who to talk to: "Contact Jan Wouters first". Fade to black. |

**Cast:** Noah = narrator. Ilke speaks Jan's line, Isak speaks Tom's line, live, on cue (the names on screen come from our demo data).

**One-liner (say it twice):**
> "Company brain learns from the work you already do, and only asks you when it matters."

---

## Script (~340 spoken words)

### 0:00 – 0:15 · Hook, before the video (Noah)

> **NOAH:** When you start a new job you get a handbook. If you're lucky, you also get a mentor, who tells you what's not in it. SD Worx has ten thousand mentors. What they know is said in meetings, and never written down. Watch.

*[Video starts.]*

### 0:15 – 1:15 · Over the video

| Film | Who | Line |
|---|---|---|
| 0:01 | **ISAK** (as Tom) | "Students can work 600 hours a year, right?" |
| 0:06 | **NOAH** | "The blob sits in the meeting and stays quiet. Until something is wrong: it's 650." |
| 0:11 | **ILKE** (as Jan) | "For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law." |
| 0:16 | **NOAH** | "The meeting ends. Nobody writes anything down, nobody pastes anything." |
| 0:19 | **NOAH** | "The brain picks out each fact, who said it, and the exact words. Tom's guess: three percent. Jan's agreement: fifty, because it was only said out loud." |
| 0:28 | **NOAH** | "So it asks one person one question. Jan clicks once. Ninety-seven." |
| 0:34 | **NOAH** | "A week later, Sofie wasn't in that meeting. She asks." |
| 0:41 | **NOAH** | *(pause 1 s)* "Twenty-two days, not the twenty in the law, because this client has its own agreement. Jan's own words, from the meeting." |
| 0:48 | **NOAH** | "And if Sofie still doubts it: ask Jan." |

### 1:15 – 2:30 · What you just saw (Noah, video ends on black, then a slide)

> **NOAH:** Company brain learns from the work you already do, and only asks you when it matters.
> Automate: the meeting, the email, the Teams message are already there. The brain reads them in the background.
> Verify: only when a human adds real value. Jan was asked once, about Jan's own words, because a spoken claim stays capped at fifty percent until the speaker confirms it.
> Minimise: one click, at most three questions a week, always to the person with the best track record on that topic.
> Integrate: the blob sits where you already work, silent when you're right.
> And it stays understandable: the AI only reads. The code decides, with rules you can read. Same question, same answer, and every point of the score is explained.

### 2:30 – 3:00 · Close (Noah)

> **NOAH:** When the law changes, old answers lose trust on their own. Not zero humans: zero unnecessary effort. Think electricity. Think wifi.
> Give us one Belgian payroll team for four weeks. We'll measure how often people have to ask a colleague, and how many payslips need a correction.
> **Company brain learns from the work you already do, and only asks you when it matters.**

*(Stop. Closing slide: name, one-liner, Noah · Isak · Ilke. It stays up for Q&A.)*

---

## Rehearsal notes

- Rehearse over the video at least twice. Sync points: Tom's caption (0:01), Jan's caption (0:11), the 22-day answer (0:41).
- The meeting captions are on screen, so if Ilke or Isak miss their cue, the jury can still read the line.
- If you run long, pause the video (space bar) on the 22-day answer and finish the sentence.
- Keep the video file local in the slides (PPT: insert video; PDF: link the file or use screenshots of the key frames in `video/out/keys/`).

## What is real in the video (say it honestly if asked)

- **Real app, real engine:** every Company brain screen is the running app: extraction from the transcript, the 50% cap, Jan's confirmation, 97%, the client-specific answer, "Contact Jan Wouters first". Nothing is edited.
- **The meeting screen is a stand-in** for Teams, built for the film. The blob in it is the real mascot interface; its correction ("600 hours is outdated, it's 650") is what the desktop mascot does in a live meeting.
- **The hand-off from the meeting tool is simulated.** In the film the transcript (with speaker names) is sent to the brain's real ingest route, `/api/brain/ingest`, exactly as a Teams connector would; everything after that is the running app. The connector itself (Microsoft Graph meeting transcripts) is not built yet. The mascot does not learn from raw microphone audio, because a microphone cannot tell who is speaking.
- People, clients and documents are synthetic.

---

## Q&A prep (5 minutes; answer in under 15 seconds, then stop)

| Likely question | Answer |
|---|---|
| Is this surveillance? | No. It is off until you switch it on, it keeps facts, not recordings, and only from transcripts that carry speaker names. Personal data is masked before any model call. |
| What if Jan is wrong? | Official sources outrank people. Jan's claim is about one client only, so it can't overrule the law for anyone else. If someone with a better track record disagrees, the brain asks again; disagreement alone never changes a score. |
| What if the agreement changes later? | Freshness decays from the last check. Before it stops being trusted, the brain asks the one person who knows, once. At most three questions per person per week. |
| Does the AI make up answers? | The AI only reads and classifies. Every answer is a claim from a real source, with the verbatim quote, and the score comes from deterministic rules. |
| What is real and what is mocked? | See "What is real in the video" above: the brain is real end to end; the meeting screen is a stand-in for Teams; the data is synthetic. |
| How does this fit SD Worx? | SD Worx gives consultants 7+ AI agents that read the same knowledge. This is the trust layer under them: what they should believe, and who to ask. It learns inside Teams and Outlook, where people already work. |
| Why not Copilot? | Copilot finds things. It does not tell you which of four conflicting answers to trust for this client, and it does not keep that answer trusted when people leave or rules change. |
| Security? | Aikido scan, sessions signed server-side, per-client access on every route, negative security tests, sandboxed desktop app. |
| Biggest risk? | Adoption: people must accept a colleague in the meeting. That's why it is opt-in, asks at most one question, and stays silent when you are right. |

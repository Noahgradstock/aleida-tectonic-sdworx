# Pitch script: "The brain that keeps itself trusted" (3 minutes)

**Cast:** Noah = narrator (explains how it works) · Ilke = payroll expert · Isak = new hire, first week.
**The case in their words:** "Can your solution stay trusted without becoming another task?" Find it. Understand it. Trust it. Keep it trusted. Make it effortless.
**The story is one circle:** knowledge goes up (Ilke shares, with consent) → a colleague approves → knowledge comes down (Isak is corrected) → it stays trusted (the meeting).

## Format

We cannot bring our own computer: the pitch is a PowerPoint with **one embedded video (about 85 s) without any text**. The only sound in the video is the mascot's own voice (and our voice talking to it). We tell the story live, on stage, while it plays. Rule: **when the mascot speaks, we are silent.** Each line below starts on a visual cue in the video.

| Time | Slide | Who |
|---|---|---|
| 0:00 – 0:25 | Title slide: the blob in its SD Worx cap | Noah, live |
| 0:25 – 1:50 | **The video** | Ilke, Isak, Noah narrate on cue |
| 1:50 – 2:35 | How it works + privacy | Noah |
| 2:35 – 3:00 | Close | Everyone |

## 0:00 – 0:25 · Opening (Noah, title slide)

> **NOAH:** At university you get a pamphlet. And a mentor: the one who tells you the professor takes points off if you skip Friday at four. SD Worx doesn't have one mentor. It has ten thousand. Their knowledge lives in emails, meetings and people's heads, and it walks out the door when they leave.
> This is Ilke, payroll expert. And this is Isak, first week on the job. *(click: video starts)*

## 0:25 – 1:50 · The video (narrated live, on cue)

| Video | Visual cue | Live line |
|---|---|---|
| 0:00 – 0:18 · Ilke's Mail | Ilke starts typing to Brouwerij De Kroon | **ILKE:** "Monday. I'm writing to Brouwerij De Kroon: as agreed, 22 holiday days this year." |
| | The blob turns **amber** | **ILKE:** "My assistant stops me: the company brain says 20. But I negotiated 22 yesterday. So I click: I know better." |
| | Pill: *Shared for review · Anna will approve it* | **NOAH:** "Only that one sentence left her laptop, because she clicked. Not her email, not the thread." |
| 0:18 – 0:28 · Anna's card | Blue card *Can you approve this?* | **NOAH:** "Anna gets one question. One click. Now it's trusted, for this client only." |
| | Click **Approve ✓** | *(pause)* |
| 0:28 – 0:55 · Isak's Mail | Isak starts typing | **ISAK:** "A week later. My first week. Same client: 20 holiday days, that's the law, right?" |
| | The blob turns **amber**: *→ 22 days* | **ISAK:** "Not for this client." |
| | Isak's voice in the video: *"Hey SD Worx, fix it."* → the email changes to 22 | *(silent)* |
| | *"How did you get that?"* → **the mascot answers out loud** | *(silent while it speaks)* |
| | Blob calm and green | **NOAH:** "Isak didn't search. He didn't know who to ask. Ilke's knowledge found him exactly when he needed it." |
| 0:55 – 1:10 · Teams meeting | The badge switches to the **purple camera** | **NOAH:** "Same afternoon, a team meeting." |
| | A voice in the video: *"Students can work 600 hours a year, right?"* | *(silent)* |
| | **The mascot speaks up:** *"Quick correction… 650 hours."* | *(silent while it speaks)* |
| 1:10 – 1:25 · Closing shot | The calm blob in the corner of a normal desktop | **NOAH:** "Silent when you're right. There when it matters. Think electricity. Think wifi." |

## 1:50 – 2:35 · How it works (Noah, one slide)

*Slide: Everyday work → AI reads → code decides → people approve only when it matters. Four privacy lines.*

> **NOAH:** AI only reads. Deterministic code decides, so every answer has a score, a source and the exact sentence behind it. Knowledge goes up only when you click, one sentence at a time, and it counts only after a colleague approves. Spoken knowledge waits at fifty percent. When the law changes, older answers lose trust on their own. The goal is not zero humans. It's zero unnecessary effort.

## 2:35 – 3:00 · Close (everyone)

> **ILKE:** I shared it once.
> **ISAK:** I never had to ask.
> **NOAH:** Find it. Understand it. Trust it. **Keep it trusted, without making it another task.**

---

## Recording the video (no text, one computer)

Record each shot with `Cmd+Shift+5` → *Record Selected Portion* around **the Mail window and the mascot** (readable on a projector), with the microphone on for shot 3 and 4. Edit in iMovie: cut, speed up typing at most 1.5× (we need time to talk), keep the mascot's voice, no titles, no music. Export 1080p. Hide the Dock and menu bar, turn on Do Not Disturb, and restart the local server before a full take (it resets everything learned).

Setup: local server `npm run dev` (accounts in `.env.local`); mascot `.env`: `BRAIN_URL=http://localhost:3000` and `DEMO_ACCOUNTS=Ilke:jan:…;Isak:tom:…;Anna:anna:…`. Click the blob, switch **Online**; the card shows **You are: Ilke · Isak · Anna**. The mascot shows and says the stage names (Ilke, Isak, Anna), not the demo personas.

| Shot | Setup | Do |
|---|---|---|
| 1 | You are: **Ilke** | New Mail: *"Dear Brouwerij De Kroon, as agreed your employees get 22 holiday days this year."* → wait for amber → **I know better** → hold 2 s on the pill |
| 2 | You are: **Anna** | The card appears → hold 2 s → **Approve ✓** → hold 1 s |
| 3 | You are: **Isak** | New Mail: *"Dear Brouwerij De Kroon, your employees get 20 holiday days this year."* → amber → say *"Hey SD Worx, fix it"* → say *"How did you get that?"* → let it finish |
| 4 | Teams in front (or `Cmd+Shift+T`) | Someone says *"Students can work 600 hours a year, right?"* → let it correct |
| 5 | Any | 5 s of the calm blob on a clean desktop |

Embed in PowerPoint (Insert → Video, start *On click*). Bring a USB stick with the deck, the video file and a PDF.

## Q&A prep (5 minutes)

| Likely question | Answer |
|---|---|
| Isn't this surveillance? | Off by default, checks run on your device, nothing you write is sent anywhere unless you click "Share for review", and then only that one sentence. In meetings it only reacts to wrong values and "Hey SD Worx"; audio is never stored. |
| What if someone shares something wrong? | It counts only after an expert other than the author approves it; until then it is capped at 50% and changes nobody's answer. Official sources outrank people. |
| What if the expert is wrong? | The law still wins: contradicting an official source caps a claim at 20%. Disagreement never changes a score directly; it can only trigger a question to someone with more authority. |
| Does the AI hallucinate answers? | It can't: AI only classifies what you meant; every answer is built by code from sources, with the verbatim quote. |
| How does it scale to 100 countries? | Countries, sectors and clients are scopes in the same engine. More countries means more rules and sources, not more models. |
| Real Outlook and Teams? | Today: Apple Mail via macOS Accessibility, Teams detected by the app in front. Production: Microsoft Graph for mail and meeting transcripts with speaker metadata. |
| Security? | Aikido scan, per-client access on every route, attack tests against a production build, sandboxed desktop app, keys only in environment variables. |

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

## 0:25 – 1:50 · The video: the full circle in 85 seconds (narrated live, on cue)

One piece of knowledge goes all the way round: Ilke shares it → Anna approves → it corrects Isak's email → the assistant guards his client meeting → and when Isak asks why, the answer leads back to Ilke.

| Video | Visual cue | Live line |
|---|---|---|
| **0:00 – 0:16 · Ilke shares** (You are: Ilke) | Ilke types to Brouwerij De Kroon: *"as agreed… 22 holiday days"* | **ILKE:** "Monday. I just agreed 22 holiday days with Brouwerij De Kroon. I put it in my email." |
| | Blue card: *Not in the Company brain for De Kroon yet* | **ILKE:** "The company brain only knows the law: 20. So I share it, just this sentence." |
| | Click **Share for review** → pill *Anna will approve it* | **NOAH:** "Nothing left her laptop until she clicked. And it counts for nobody until a colleague approves." |
| **0:16 – 0:24 · Anna approves** (You are: Anna) | Card *Can you approve this?* → **Approve ✓** | **NOAH:** "One question. One click. That's all the maintenance anyone did." |
| **0:24 – 0:44 · Isak's email** (You are: Isak) | Isak types *"…20 holiday days…"* | **ISAK:** "A week later. My first week. I don't know a single rule here." |
| | Amber: *→ 22 days, Brouwerij De Kroon* | **ISAK:** "Twenty is the law. But not for this client." |
| | Isak's voice: *"Hey SD Worx, fix it."* → the email changes to 22 | *(silent)* |
| **0:44 – 1:00 · Client meeting** (Teams, purple camera) | Isak on a call with the client | **NOAH:** "Same afternoon. Isak meets the client." |
| | Isak's voice: *"And the meal voucher is 6.91 euros per day."* | *(silent)* |
| | **The assistant speaks up:** *"Quick correction: 6.91 euros is outdated… 8.91 euros."* | *(silent while it speaks)* |
| **1:00 – 1:20 · Isak asks** | Isak's voice: *"Hey SD Worx, why does De Kroon get 22 holiday days?"* | *(silent)* |
| | **The assistant answers:** *"The general rule is 20 days, from Belgian law. But Ilke agreed 22 days with this client…"* | *(silent while it speaks)* |
| **1:20 – 1:25 · Calm blob** | The blob, green, in the corner | **NOAH:** "Ilke shared it once. Isak never had to ask her. Silent when you're right, there when it matters." |

## 1:50 – 2:35 · How it works (Noah, one slide)

*Slide: Everyday work → AI reads → code decides → people approve only when it matters. Four privacy lines.*

> **NOAH:** AI only reads. Deterministic code decides, so every answer has a score, a source and the exact sentence behind it. Knowledge goes up only when you click, one sentence at a time, and it counts only after a colleague approves. Spoken knowledge waits at fifty percent. When the law changes, older answers lose trust on their own. The goal is not zero humans. It's zero unnecessary effort.

## 2:35 – 3:00 · Close (everyone)

> **ILKE:** I shared it once.
> **ISAK:** And I never had to ask.
> **NOAH:** Find it. Understand it. Trust it. **Keep it trusted, without making it another task.**

---

## Recording the video (no text, one computer)

Record each shot with `Cmd+Shift+5` → *Record Selected Portion* around **the Mail window and the mascot** (readable on a projector), with the microphone on for shot 3 and 4. Edit in iMovie: cut, speed up typing at most 1.5× (we need time to talk), keep the mascot's voice, no titles, no music. Export 1080p. Hide the Dock and menu bar, turn on Do Not Disturb, and restart the local server before a full take (it resets everything learned).

Setup: local server `npm run dev` (accounts in `.env.local`); mascot `.env`: `BRAIN_URL=http://localhost:3000` and `DEMO_ACCOUNTS=Ilke:jan:…;Isak:tom:…;Anna:anna:…`. Click the blob, switch **Online**; the card shows **You are: Ilke · Isak · Anna**. The mascot shows and says the stage names (Ilke, Isak, Anna), not the demo personas.

| Shot | Setup | Do |
|---|---|---|
| 1 | You are: **Ilke** | New Mail: *"Dear Brouwerij De Kroon, as agreed your employees get 22 holiday days this year."* → wait for the blue card → **Share for review** → hold 2 s on the pill |
| 2 | You are: **Anna** | The card appears → hold 2 s → **Approve ✓** → hold 1 s |
| 3 | You are: **Isak** | New Mail: *"Dear Brouwerij De Kroon, your employees get 20 holiday days this year."* → amber → say *"Hey SD Worx, fix it"* → hold 1 s on the corrected email |
| 4 | You are: **Isak**, Teams in front (or `Cmd+Shift+T`) | Say *"And the meal voucher is 6.91 euros per day."* → let it correct |
| 5 | Same | Say *"Hey SD Worx, why does De Kroon get 22 holiday days?"* → let it finish |
| 6 | Any | 5 s of the calm blob on a clean desktop |

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

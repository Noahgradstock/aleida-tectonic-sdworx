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

We start in the middle of the story: Isak gets it wrong. Then we meet the knowledge (Ilke), and the meeting at the end pays it off with exactly what Ilke shared.

| Video | Visual cue | Live line |
|---|---|---|
| **0:00 – 0:22 · Isak's email** (You are: Isak) | Isak types to a colleague: *"…the meal voucher is €6.91 per day, right?"* | **ISAK:** "My first week at SD Worx. I don't know a single rule yet, formal or informal." |
| | The blob turns **amber**: *→ €8.91* | **ISAK:** "And there it is: €6.91 was the old rule." |
| | Isak's voice: *"Hey SD Worx, fix it."* → the email changes to €8.91 | *(silent)* |
| | Blob calm and green | **NOAH:** "Silent while you're right. There the moment you're not. But where does it know this from?" |
| **0:22 – 0:40 · Ilke shares** (You are: Ilke) | Ilke types to Brouwerij De Kroon: *"as agreed… 22 holiday days"* | **ILKE:** "From people like me. I just agreed 22 holiday days with Brouwerij De Kroon." |
| | Blue card: *Not in the Company brain for De Kroon yet* | **ILKE:** "The brain only knows the law: 20. So I share it. Just this sentence." |
| | Click **Share for review** → pill *Anna will approve it* | **NOAH:** "Nothing left her laptop until she clicked. And it counts for nobody until a colleague approves." |
| **0:40 – 0:47 · Anna approves** (You are: Anna) | Card *Can you approve this?* → **Approve ✓** | **NOAH:** "One question, one click. That's all the maintenance anyone did." |
| **0:47 – 1:20 · Client meeting** (You are: Isak, Teams, purple camera) | Isak on a call with De Kroon | **NOAH:** "Next day. Isak meets Brouwerij De Kroon." |
| | Client's voice (Noah, recorded): *"How many holiday days do our people get this year?"* | *(silent; the assistant stays quiet)* |
| | Isak's voice: *"For De Kroon, that is 20 holiday days this year."* | *(silent)* |
| | Amber. **The assistant:** *"Quick note: for Brouwerij De Kroon it's 22 days, not 20. Ilke agreed that with them, and it was approved."* | *(silent while it speaks)* |
| | Isak's voice: *"Oh, actually, I was wrong. It's 22 holiday days."* → green, *"That's right."* | **NOAH** *(after it)*: "Saved, in front of the client." |
| **1:20 – 1:25 · Calm blob** | The blob, green, in the corner | **NOAH:** "Ilke shared it once. Isak never had to ask her. Think electricity. Think wifi." |

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
| 1 | You are: **Isak** | New Mail to a colleague: *"Hi Sofie, quick check: the employer part of the meal voucher is €6.91 per day, right?"* → amber → say *"Hey SD Worx, fix it"* → hold 1 s on €8.91. (No client name in this email.) |
| 2 | You are: **Ilke** | New Mail: *"Dear Brouwerij De Kroon, as agreed your employees get 22 holiday days this year."* → blue card → **Share for review** → hold 2 s on the pill |
| 3 | You are: **Anna** | The card appears → hold 2 s → **Approve ✓** → hold 1 s |
| 4 | You are: **Isak**, Teams in front (or `Cmd+Shift+T`) | Noah (client): *"How many holiday days do our people get this year?"* → Isak: *"For De Kroon, that is 20 holiday days this year."* → let it speak → Isak: *"Oh, actually, I was wrong. It's 22 holiday days."* → *"That's right."* |
| 6 | Any | 5 s of the calm blob on a clean desktop |

## The two emails (tested: each triggers exactly one reaction)

Paste everything except the **bold** sentence before recording, then type the bold sentence on camera and stop typing.

**Shot 1 · Isak** (You are: Isak). To: Sofie Maes · Subject: Meal vouchers for a new hire
> Hi Sofie,
>
> Quick question from the new guy. I am setting up meal vouchers for a new hire and I want to get it right.
>
> **The employer part of the meal voucher is €6.91 per day, right?**
>
> Thanks a lot,
> Isak

→ amber *€6.91 → €8.91*; "Hey SD Worx, fix it" → *€8.91*.

**Shot 2 · Ilke** (You are: Ilke). To: Jan van Damme, Brouwerij De Kroon · Subject: Holiday days 2026
> Dear Mr Van Damme,
>
> Thank you for the good meeting yesterday.
>
> **As agreed, your employees get 22 holiday days this year at Brouwerij De Kroon.**
>
> I will update your payroll file this week.
>
> Kind regards,
> Ilke
> Payroll expert, SD Worx

→ blue card *Not in the Company brain for De Kroon yet (general rule 20 days)* → **Share for review**.

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

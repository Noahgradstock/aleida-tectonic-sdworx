# Pitch script: "The brain that keeps itself trusted" (3 minutes, theatre)

**Cast:** Noah = narrator (explains how it works) · Ilke = payroll expert · Isak = new hire, first week.
**Rule of the day:** we cannot use our own device. Every screen moment is a **pre-recorded clip inside the slides** (PDF/PPT). The actors play live in sync with the clips.
**The case in one line (their words):** "Can your solution stay trusted without becoming another task?" Find it. Understand it. Trust it. Keep it trusted. Make it effortless.

The story is one circle: **knowledge goes up** (Ilke speaks) → **knowledge comes down** (Isak writes) → **it stays trusted tomorrow** (the world changes, nobody maintains anything).

---

## 0:00 – 0:20 · Opening (Noah)

*Slide 1: the blob in its SD Worx cap, asleep. Title: "Thousands of mentors."*

> **NOAH:** At university you get a pamphlet. And you get a mentor: the one who tells you the professor takes points off if you skip Friday at four. SD Worx doesn't have one mentor. It has ten thousand. Their knowledge lives in meetings and emails, and it walks out the door when they do.
> Meet Ilke, payroll expert. And Isak, first week on the job.

## 0:20 – 1:00 · Scene 1: knowledge goes up (with consent)

*Clip A: Ilke's Mail. She writes to Brouwerij De Kroon. Her mascot (blue envelope) turns amber: "The brain says 20 days."*

> **ILKE** *(typing)*: "As agreed, your employees get 22 holiday days this year."
> **ILKE** *(to the audience)*: The brain says 20. But I negotiated 22 with this client yesterday. *(clicks)* I know better.

*The card: "Shared for review · Anna De Smet will approve it ✓". Ilke's blob goes calm.*

> **NOAH:** Ilke just taught the company something, without writing a wiki page. Only that one sentence left her laptop, because she clicked. Her email, the recipients, the thread: they stay with her. And until a colleague approves it, it changes nobody's answer.

*Clip A continues: Anna's "Questions for you" in Company brain. One click ✓. The De Kroon node turns green: 22 days, 98%.*

> **NOAH:** Anna approves with one click. That is the only maintenance anyone did today.

## 1:00 – 1:50 · Scene 2: knowledge comes down

*Clip B: Apple Mail, new message to Brouwerij De Kroon. The blob shows the blue envelope.*

> **ISAK** *(typing, reading aloud)*: "Dear Brouwerij De Kroon, your employees get 20 holiday days this year…"

*The blob turns amber.*

> **BLOB** *(voice)*: For Brouwerij De Kroon it's 22 days. Shared by Ilke, approved by Anna.
> **ISAK:** Hey SD Worx, fix it.

*The draft changes to 22 days. The blob goes calm.*

> **ISAK:** How did you get that?
> **BLOB:** I start from Belgian law: 20 days. But Ilke agreed 22 with this client and Anna approved it, so the client agreement wins. Ninety-eight percent.

> **NOAH:** Isak didn't search. He didn't know who to ask. Ilke's knowledge found him at the moment he needed it, and stayed silent the rest of the time. Think electricity. Think wifi.

## 1:50 – 2:30 · Scene 3: still trusted tomorrow

*Clip C: a team meeting. Isak speaks confidently.*

> **ISAK:** And students can work 600 hours a year, right?
> **BLOB** *(out loud)*: Quick correction: 600 hours is outdated. It's 650 hours.

> **NOAH:** Knowledge changes. When the law changes, every older answer loses trust on its own. When something is genuinely unclear, the brain asks exactly one person, the one with the best track record, one question, one click, at most three a week. The goal is not zero humans. It's zero unnecessary effort.

## 2:30 – 3:00 · How it works and close (Noah)

*Slide: Everyday work → AI reads → code decides → people confirm only when it matters. Brain health: "1,240 facts · 1,236 maintain themselves · 4 need a human".*

> **NOAH:** Under the hood: AI only reads. Deterministic code decides, so every score is explainable and every point is in a ledger. The mascot reads down, never leaks up: it shares one sentence only when you click, and only after a colleague approves does it count.
> Find it. Understand it. Trust it. **Keep it trusted, without making it another task.**

---

## Clips to record (by 14:30)

| Clip | Shows | Length |
|---|---|---|
| A | Ilke's Mail draft "22 holiday days" → amber → "I know better" → "Shared for review · Anna will approve it" → Anna approves in Company brain → 22 days, 98% | ~25 s |
| B | Mail draft "20 holiday days" → amber blob → "Hey SD Worx, fix it" → 22 days → "How did you get that?" with spoken answer | ~35 s |
| C | Meeting: "students can work 600 hours" → blob corrects out loud | ~10 s |

Record with the mascot online, sound on, the menu bar hidden. Keep each clip short; the actors carry the story.

## Q&A prep (5 minutes)

| Likely question | Answer |
|---|---|
| Isn't this surveillance? | Off by default, runs locally, learns only from what *you* write, stores claims not text, masks personal data before any model call. In meetings the speaker comes from the meeting tool, never guessed. |
| What if the expert is wrong? | Official sources outrank people. Spoken claims cap at 50% until confirmed. Disagreement never changes a score directly; it can only trigger a question to someone with more authority. |
| Does the AI hallucinate answers? | It can't: AI only classifies and extracts; every answer is built by code from sources, with the verbatim quote. |
| How does it scale to 100 countries? | Countries, sectors and clients are scopes in the same engine. More countries means more rules and sources, not more models. |
| Real Outlook and Teams? | Today: Apple Mail via macOS Accessibility, Teams detection by app. Production: Microsoft Graph for mail and meeting transcripts with speaker metadata. |
| Security? | Aikido scan, per-client access on every route, 58 negative security tests, sandboxed desktop app. |

## How to run the demo (tested 20 Oct, local server)

Local server: `npm run dev`, accounts in `.env.local` (`node scripts/create-users.mjs jan tom anna sofie`), mascot `.env`: `BRAIN_URL=http://localhost:3000`. Restarting the server resets everything learned, which is handy between takes.

1. **Up (Ilke = account `jan`):** mascot `.env` `BRAIN_USER=jan`. In Mail: *"Dear Brouwerij De Kroon, as agreed your employees get 22 holiday days this year."* → amber (brain says 20) → **I know better** → *"Shared for review · Anna De Smet will approve it"*. The claim is learned at 50% with the `review` rule; the De Kroon answer stays 20.
2. **Approve (Anna = account `anna`):** in Company brain, "Questions for you" → ✓. De Kroon's answer becomes **22 days, 98%**.
3. **Down (Isak = account `tom`):** mascot `.env` `BRAIN_USER=tom`, restart the mascot. In Mail: *"Dear Brouwerij De Kroon, your employees get 20 holiday days this year."* → amber *20 holiday days → 22 days (Brouwerij De Kroon)* → "Hey SD Worx, fix it" → *22 holiday days*. TechStart Gent stays at 20.

## Open items

1. **Names on screen.** The demo data uses Jan (expert) and Tom (new hire). Either rename these personas in the demo data to Ilke and Isak, or say once on stage "Ilke plays our expert Jan". Renaming is cleaner.
2. **Record clips A–C** with the steps above.

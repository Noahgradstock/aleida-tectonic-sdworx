# Pitch script: Company brain (3 minutes, final)

Slides: title → video (`company-brain-pitch-v3.mp4`, 72 s) → Wikipedia logo → close.

**Few handovers:** Title: Isak · Video: Isak, then Ilke · How it works: Noah, Ilke, Noah · Close: Ilke + Noah
**Rule:** when the meeting audio plays in the video, nobody talks.

---

## 0:00–0:10 · Title slide (Isak)

**ISAK:** Hello, I'm Isak, the newest hire at SD Worx. Follow my first week, and see how I tap into SD Worx's knowledge: what's already known, and what nobody wrote down yet. Meet my colleagues Noah and Ilke. *(click: the video starts)*

## 0:10–1:22 · Video (Isak, then Ilke)

| In the video | Who | Line |
|---|---|---|
| 0:00 the blob lands | | *(silent)* |
| 0:04 "01 · The new hire" | **ISAK** | Day one. I was told a meal voucher is €6.91. |
| 0:16 the blob turns amber | **ISAK** | Company brain checks me as I type. It's €8.91 now. One click, fixed. |
| 0:21 €8.91, fixed | **ISAK** | But where does that knowledge come from? |
| 0:23 "02 · The expert" | **ILKE** | From people like me. |
| 0:29 Ilke's email | **ILKE** | I just agreed 22 holiday days with this client. That isn't written in any document. |
| 0:32 blue card | **ILKE** | So I share it. Just this sentence. |
| 0:37 "Shared for review" | **ILKE** | Nothing leaves my laptop until I click. And it counts for nobody until a colleague approves. |
| 0:42 "03 · The client meeting" | | *(silent until the meeting ends: the client asks about holiday days, Isak says 20, Company brain corrects him to 22 in real time)* |
| 1:06 outro | **ILKE** | It didn't just say 22. It said who it came from: me. |

## 1:22–2:35 · How it works: Wikipedia and the six checks (Noah, Ilke, Noah)

**NOAH:** How do you trust knowledge anyone can add? Ask Wikipedia. Millions of strangers write it, and we still trust it, because of its rules: every sentence needs a source, and every edit is in the history. So how does Company brain decide what to trust?

**ILKE:** Six checks, every time. Who said it? Is it still current? Who agrees? Does it match the law? Does it fit your client? Has it held up for others? AI only reads the sentence. Code adds up the six checks into one score, and shows the source and the exact sentence. Only said in a meeting? It stays at fifty percent until a colleague backs it. Contradicts the law? Never above twenty. And every change is in the history.

**NOAH:** And two things Wikipedia can't do. It knows what's different for your client. And you can just ask it, by voice or with a click: it answers with the source, and if it isn't sure, it tells you who to call, the colleague who was right on this before. When the law changes, old answers lose trust by themselves. People approve only when it matters.

## 2:35–3:00 · Close (Ilke + Noah)

**ILKE:** I shared it once.
**NOAH:** And Isak never had to ask. Keep it trusted, without making it another task. Thank you.

---

## Lines per person

### Isak
1. *(title slide)* "Hello, I'm Isak, the newest hire at SD Worx. Follow my first week, and see how I tap into SD Worx's knowledge: what's already known, and what nobody wrote down yet. Meet my colleagues Noah and Ilke."
2. *(0:04)* "Day one. I was told a meal voucher is €6.91."
3. *(0:16, amber)* "Company brain checks me as I type. It's €8.91 now. One click, fixed."
4. *(0:21)* "But where does that knowledge come from?"

### Ilke
1. *(0:23)* "From people like me."
2. *(0:29)* "I just agreed 22 holiday days with this client. That isn't written in any document."
3. *(0:32)* "So I share it. Just this sentence."
4. *(0:37)* "Nothing leaves my laptop until I click. And it counts for nobody until a colleague approves."
5. *(1:06, outro)* "It didn't just say 22. It said who it came from: me."
6. *(after "So how does Company brain decide what to trust?")* "Six checks, every time. Who said it? Is it still current? Who agrees? Does it match the law? Does it fit your client? Has it held up for others? AI only reads the sentence. Code adds up the six checks into one score, and shows the source and the exact sentence. Only said in a meeting? It stays at fifty percent until a colleague backs it. Contradicts the law? Never above twenty. And every change is in the history."
7. *(close)* "I shared it once."

### Noah
1. *(Wikipedia slide)* "How do you trust knowledge anyone can add? Ask Wikipedia. Millions of strangers write it, and we still trust it, because of its rules: every sentence needs a source, and every edit is in the history. So how does Company brain decide what to trust?"
2. *(after Ilke's six checks)* "And two things Wikipedia can't do. It knows what's different for your client. And you can just ask it, by voice or with a click: it answers with the source, and if it isn't sure, it tells you who to call, the colleague who was right on this before. When the law changes, old answers lose trust by themselves. People approve only when it matters."
3. *(close)* "And Isak never had to ask. Keep it trusted, without making it another task. Thank you."

---

## Q&A (5 minutes)

| Question | Answer |
|---|---|
| Isn't this surveillance? | Off by default. Nothing leaves your laptop unless you click "Share for review", and then only that one sentence. |
| What if someone shares something wrong? | It counts for at most 50% until a colleague other than the author approves it. If it contradicts the law, it is capped at 20%. |
| Ilke's 22 days differ from the law's 20. Why isn't that capped? | It is a client agreement, scoped to that one client: an exception for De Kroon, not an error. Everyone else still gets 20. |
| What if the expert is wrong? | The law still wins. Disagreeing never changes a score directly; it can only send a question to someone with more authority. |
| Does the AI hallucinate? | AI only reads and classifies. Code builds every answer from sources, with the exact sentence. |
| How is the score computed? | Each of the six checks adds or removes points (log-odds), and hard caps override the sum: 50% for unconfirmed meeting or shared claims, 20% for anything that contradicts the law, 30% for anything older than a rule change. All numbers live in one config file. |
| Real Outlook and Teams? | Today: Apple Mail and Teams detection on the desktop. In production: Microsoft Graph for mail and meeting transcripts. |
| Security? | Aikido scan, access per client on every route, a sandboxed desktop app, keys only in environment variables. |

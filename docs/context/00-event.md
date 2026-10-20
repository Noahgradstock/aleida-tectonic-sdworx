# Tectonic Hackathon 2026: the event

## Format
- Belgium's largest hackathon, **first edition** (no earlier Tectonic hackathons to compare with).
- ~800 registered, 252 teams, 7 cities (Ghent, Antwerp, Leuven, Louvain-la-Neuve, Liège, Kortrijk, Brussels).
- **Round 1:** 30 Sep 2026, 18:00–23:00 (≈4–5 h), simultaneously in all cities.
- **Final:** 20 Oct 2026, full day, Ghent (De Vooruit / Wintercircus). The day before the Tectonic conference (21 Oct).
- Two tracks: **KBC** (bank) and **SD Worx** (HR/payroll). 16 teams per track in the final = 32 teams.
- Teams of 3–4 people. English. On site.
- Prize: **€10 000** cash to the winning team (sponsored by Spott).
- The companies may use the solutions in their own work.

## Judging in the FINAL (new weights, see finals guide)
1. **Creativity** 25 %
2. **Pitch quality** 25 % (new, 3 min pitch + 5 min Q&A, live in front of the jury, **no own device**, pitch as ppt/pdf)
3. **Technical ability** 20 %
4. **Fit** 20 %
5. **Security** (Aikido) 10 %

## Final day schedule (20 Oct)
08:00 breakfast at Vooruit · 08:40 welcome · **09:00–16:00 hacking** (lunch 12:30) · **16:00 submission closes** · 16:15–17:35 semifinal pitches in Wintercircus · 18:00 final in Vooruit Theaterzaal (SD Worx winner 18:25, pitch 18:30) · 19:00 overall winner · 19:20 reception.
**Our team Aleida.ai: Room 3 (SD Worx), 16:15–16:25, first slot.**

## Aikido (security, 10 %)
Checks for: **business logic flaws, IDOR, authentication, authorization**. Reasons about the code's logic, not just signatures.
1. https://app.aikido.dev/ai-pentests/discounts/hackathon-tectonic-aikido → "Continue with GitHub"
2. Connect the repo → run AI Code Audit (baseline) → **screenshot**
3. Fix → mark resolved → **screenshot after**. The score is based on remaining issues.

## Submission (Builderbase)
- Short description
- **Pitch presentation (ppt/pdf, < 3 min)** (in the final, replaces the demo video)
- Public GitHub link (public until judging is done)
- Aikido screenshots before/after
- README: what it is, how to run it, what is unfinished

## Rules
- Built during official time. One submission per team. **Final means final**, no changes afterwards.
- No passwords/API keys/confidential data in the repo.
- Check that all links work for the judges.

## Tech partners
| Partner | What | Access |
|---|---|---|
| Google Cloud | Credits, valid for 1 week | Link in Builderbase for the team |
| ElevenLabs | TTS / voice agents | Discord discord.com/invite/VnBvbbcdEC → #coupon-codes |
| Cursor | Coding agent | Discord discord.gg/5UwpfTF7M → #coupon-codes |
| Aikido | Security audit | See above |

Note: one Round 1 team reported that the hackathon GCP project **blocked all Vertex AI models**. Have an alternative LLM route.

Source: participants guide (qualifier, not published here), tectonicconf.eu/hackathon, tectonicconf.eu/faq

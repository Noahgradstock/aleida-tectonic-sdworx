# Case brief: Tectonic final, SD Worx track (20 October 2026)

## The case in one line
- [CASE] Same challenge as the qualifier ("turn fragmented organisational knowledge into a trusted shared resource"), one step further: **"Can your solution stay trusted without becoming another task?"**
- [CASE] Organiser on stage: "We don't want you to start over… look at your solution and see how it responds to the constraints." "We cannot ask our colleagues to maintain documentation." "Think Wi-Fi, think electricity." "At SD Worx we don't have one mentor, we have thousands of mentors." "Zero unnecessary effort, not zero human involvement."
- [CASE] Five questions to answer: what happens automatically · when is human verification genuinely valuable · how maintenance stays no burden · how it fits the existing workflow · how it stays understandable without demanding attention.
- [CASE] Think beyond documents: "Who has dealt with this before? Who really knows this customer/topic? Who knows how this actually works here? Who knows why we do things this way?" Learn from signals already created through everyday work.
- [CASE] Example: new developer, "how do we set up a build pipeline *here*, who do I talk to?" Examples are inspiration, not requirements. The "fly on the wall" is an example, "not a solution we want".

## The real problem
- [INFERRED] Knowledge systems die from maintenance debt: trust decays silently (owners leave, rules change, tacit "why" is never written). The problem is **trust decay + tacit, people-held knowledge**, solved without a new chore.
- [INFERRED] Protagonist candidates: (1) newcomer or acquired-team member (e.g. ex-HR Service Srl consultant in Italy, week 2) asking "how do we do this *here*, who do I ask?"; (2) payroll consultant inheriting a client portfolio when the colleague moves role; (3) the expert who gets the same question 20 times a month and is the unpaid "mentor".

## SD Worx in 8 bullets [COMPANY-DOC]
- HR, Pay & Time; ~100k clients, ~6M paid/month, ~10k colleagues, 27 countries, €1.3bn revenue 2025.
- Strategy: continuous AI-assisted HR+Pay+Time; Europe-first growth through acquisitions.
- 2024–26 acquisitions: F2A, Socialea, Labour Consulting, Paie & RH Solutions, Yeap, Codeas, Checks, HR Service Srl. Each brings its own tools and tacit ways of working.
- AI in house: Legal Watch (AI drafts, experts validate), agentic payroll (consultants manage 7+ agents, 500+ BE consultants), multi-agent customer service, Data & Insights agent.
- Pain: knowledge fragmentation, legacy and integration debt, payroll errors, slower like-for-like growth (3.5%), so pressure on cost-to-serve.
- Talent shortage: fewer payroll experts, so reusable expertise is valuable.
- Competitors: ADP, Workday, SAP Joule, Deel, Personio, Belgian secretariats.
- Own research: only about half of employees trust how their employer uses AI.

## What the jury will care about
- [CASE] Creativity 30% · Technical ability 30% · Fit 30% · Security 10% (Aikido).
- [INFERRED] Explicit answers to the 5 case questions; visibly *calm* UX; human verification only where it adds value; GDPR for signals from people's work (Teams, tickets, commits); a story; completeness.

## Stakeholders
- Employee in doubt: an answer *and* a person, fast, inside the tool they already use.
- Expert (the "mentor"): fewer repeat questions, credit, no new admin, control over what is said in their name.
- Knowledge owners: no review chores; alerts only when something truly changed.
- Management: lower cost-to-serve, faster onboarding of acquired teams, less risk.
- Client: correct answer, sooner.

## Hard constraints
- [CASE] No new maintenance task for colleagues. [CLAUDE.md] Synthetic data only, public repo, deadline 16:00, Aikido scan, 3 builders.
- [INFERRED] GDPR plus works-council sensitivity: mining people's activity looks like surveillance, so it needs consent, minimisation, aggregation and opt-out. Profiling people (expertise) is personal data.

## 2 current events [COMPANY-DOC]
- June 2026: agentic AI rollout to 500+ Belgian payroll consultants (who keeps the agents' knowledge current?).
- June 2026: HR Service Srl acquisition (+350 clients, a new team whose tacit knowledge must merge). Pay Transparency Directive transposition (June 2026) changes rules that existing knowledge describes.

## ALREADY-DONE (don't just rebuild)
Legal Watch · multi-agent CS AI · Data & Insights agent · conversational document Q&A (mysdworx roadmap) · expense assistant · internal 2025 hackathon (legal docs → validation rules; emails → HR actions) · Workday Sana/Illuminate, ADP Assist, Oracle Pay Analyst, SAP Joule, Deel, Rippling, Personio · Glean/Copilot/Guru (enterprise search, verification reminders, expert suggestions).

## BANNED without a non-obvious twist
1. Chatbot over documents. 2. Enterprise search bar. 3. Teams bot answering HR questions. 4. Plain "expert finder" directory / skills profile. 5. Wiki with "please review" reminders (Guru-style verification nags = another task). 6. Onboarding buddy chatbot.

## BAR TO BEAT [HACKATHON1-DOC]
- **TrustLens** (current pick): answer plus a trust card (owner, freshness, scope, authority, conflicts, validation, who to ask). *Weakness now: it needs owners and review dates, i.e. maintenance.*
- Handover Copilot: handover pack from docs, tickets and chats with trust signals and gaps.
- Knowledge Health Radar: conflicts, duplicates and stale content; a law change lights up affected procedures.
- Capture Loop: a solved Teams thread becomes a card, validated with one click.
- Ask-an-Expert Graph: who knows, based on what they wrote, answered and validated; with workload safeguards.

## Questions for the organisers
1. Should we extend our qualifier solution explicitly, or is a new concept equally welcome?
2. Which everyday signals may we assume (Teams, tickets, Git, SharePoint edits, CRM)? Any sandbox data?
3. How do works council and GDPR view expertise inferred from activity: is opt-in acceptable?
4. Which role should we design for: developers (the stage example) or payroll/customer service?
5. Who is on the jury, and does "Fit" mean fit to the extra challenge or to SD Worx's roadmap?

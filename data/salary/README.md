# Salary knowledge (fictional test data)

Fictional source files for testing the trust score. Names, clients, legal references and amounts are made up.

| Folder | Topic | Files |
|---|---|---|
| `sick-leave/` | Relapse period and guaranteed salary (the demo case) | policy, PDF manual, NL Confluence page, Teams export, newsletter, draft email + `sources.json` |
| `indexation/` | Wage indexation January 2026 (PC 200, PC 118, NL, client exception) | 2 official notices, draft guide, Teams export, client email |
| `meal-vouchers/` | Max employer part 2026 | royal decree summary, old manual annex, Teams export, client question |
| `bonus-and-holiday-pay/` | End-of-year bonus (PC 200 vs. client agreement) and holiday pay (BE vs. NL) | sector agreement, client email, Teams export, BE guide, NL Confluence page |
| `meal-voucher-scenario/` | Earlier scenario with engine parameters, legal registry, usage and doubt signals, plus a reference scorer (`node data/salary/meal-voucher-scenario/trust.mjs`) | JSON files |

`sources.json` in this folder describes every claim in `indexation/`, `meal-vouchers/` and `bonus-and-holiday-pay/`: value, author, date, scope (country, PC, client) and the expected trust outcome. It also has test questions with the expected answer. Claim ids match `src/trust-engine/mock` where the same claim exists there.

## Extra topics (`sources-extra.json`)

Eight more fictional topics, 70 documents and 70 claims, to make the brain feel like a real knowledge base. Every decree, circular, agreement, amount and client is made up; official-looking texts say "(fictional, for the demo)". New clients: **Logistiek Van Damme NV** (BE, PC 140) and **Zorggroep Horizon BV** (NL).

| Folder | Fact key | Trusted answer | Planted flaws |
|---|---|---|---|
| `night-work/` | `night-work-premium` | €2.15 per hour (PC 200); €2.60 per hour for Logistiek Van Damme | 2024 agreement still on the drive; 2023 shift guide by Koen (left); new hire Nora quotes the old amount and Lotte corrects her; duplicate `- Copy` of the 2026 notice; Dutch version; signed client agreement on SharePoint; meeting transcript |
| `sunday-work/` | `sunday-work-premium` | 100% | 2019 PDF manual by Marc (left) says 75%; Bram mixes it up with the 50% overtime premium, Jan corrects; unreviewed draft FAQ says 200% (total pay, not premium); NL Confluence page (other country); French version |
| `thuiswerk-nl/` | `home-working-allowance-nl` | €2.45 per day (NL); €2.00 per day for Zorggroep Horizon | 2025 Belastingdienst text; Confluence page never updated (€2,40); Eva quotes the 2024 amount, Lars corrects; German Homeoffice-Pauschale filed in the NL folder (wrong country); unsent draft newsletter with last year's amount; duplicate `- Copy` Teams export |
| `bijtelling-nl/` | `bijtelling-ev-nl` | 22% (NL) | 2025 official text and Confluence page (17%); Eva says 16%, Lars corrects; Belgian note filed in the NL folder (wrong country, 4%); unapproved draft client letter (25%); meeting transcript; open client question from Zorggroep Horizon |
| `first-hire/` | `first-employee-reduction` | €2,000 per quarter | 2016 NSSO text and 2022 guide by Marc (left) say €3,100; Tom quotes the guide, An corrects; unsent draft based on press (€1,500); hedged meeting statement by Nora; French and Dutch versions |
| `short-leave/` | `short-leave-wedding` | 2 days; 3 days for Hotel Ter Duinen | 2014 FAQ by Koen (left) plus a duplicate `- Copy`; Pieter quotes it, Anna corrects; NL Confluence page (other country); French version without a claim; open client question |
| `gifts/` | `gift-tax-free-max` | €50 per employee | 2019 manual by Koen (left) and Sofie say €40, Lotte corrects; draft 2027 policy guesses €60; NL kerstpakket page (other country, no claim); Legal newsletter |
| `anniversary-bonus/` | `anniversary-bonus-max` | €3,640 | 2025 official text; 2024 handbook nobody updated; Nora quotes last year's amount, Jan corrects; NL jubileumuitkering page (other country); Dutch version |

Test questions in `sources-extra.json` cover each topic, including client-specific ones (Logistiek Van Damme, Zorggroep Horizon, Hotel Ter Duinen) and NL ones (thuiswerkvergoeding, bijtelling).

# Belgian payroll: domain glossary (for realistic synthetic data)

> ⚠️ From general knowledge, **not verified for 2026**. Amounts are indexed annually. Use only as realistic *fictional* demo data, and do not claim it is legally correct.

| Term | What | Useful for demo |
|---|---|---|
| **PC / paritair comité / commission paritaire** (joint committee) | Sector-level collective bargaining bodies, each with its own number, e.g. PC 200 (white-collar, general), PC 124 (construction), PC 140.03 (road transport), PC 118 (food), PC 302 (hotels/restaurants) | A rule applies only to a certain PC → "wrong PC" conflict |
| **CAO / CCT** | Collective agreement (per PC or company) | A customer-specific agreement overrides a general rule |
| **Maaltijdcheques / titres-repas** | Meal vouchers per working day. The highest employer share has been around €6.91 (nominal max €8) | Two sources with different amounts (old vs new) |
| **Ecocheques** | Eco vouchers, max ~€250/year | Annual cap, pro rata |
| **Dubbel vakantiegeld / double pécule de vacances** | Double holiday pay for white-collar employees, ~92% of monthly salary, typically paid around the holiday period (May/June) | "When is it paid?" |
| **Eindejaarspremie / 13e maand** | Year-end bonus, often set through PC agreements | Varies per PC |
| **Indexering** | Automatic wage adjustment according to an index, timing per PC (Jan for PC 200) | Freshness: old amounts become wrong |
| **Opzegtermijn / préavis** | Notice period in weeks by seniority (single status since 2014) | Calculation rules = good deterministic logic |
| **Dimona** | Electronic declaration of employment start/end to RSZ/ONSS | "Must be done before the first working day" |
| **DmfA** | Quarterly declaration of wages and social contributions to RSZ/ONSS | Deadline rules |
| **RSZ / ONSS** | Social security authority | |
| **Bedrijfsvoorheffing / précompte professionnel** | Withholding tax on wages | |
| **Fietsvergoeding** | Bicycle allowance per km (cap per km) | Cross-border workers (LU/NL/FR) = different rules |
| **Thuiswerkvergoeding** | Home-working allowance per month (cap ~€150) | The €150 vs €175 conflict in the TrustLens demo |
| **Cross-border worker (grensarbeider)** | Lives in LU/NL/FR/DE and works in BE, or the other way round | Country dimension: the wrong country's rule |
| **Sociaal secretariaat** | Payroll agency (SD Worx is one) | The consultant works for several client companies |

## Roles in the payroll consultant's world
- **Payroll consultant**: portfolio of client companies, answers questions, runs payroll, interprets rules.
- **Client HR admin**: sends changes (new hire, sickness, salary change), often as unstructured emails.
- **Legal expert / competence centre**: interprets new legislation and PC agreements.
- **Team lead**: approves deviations.

## Typical frictions (good "moment of doubt")
- New law/PC change → which customers are affected, what changes in the system?
- Customer email with changes → right field, right date, right customer?
- Payroll run → deviations from last month: error or legitimate?
- Portfolio handover → customer-specific exceptions exist only in someone's head.
- Cross-border workers / several countries → which legislation applies?

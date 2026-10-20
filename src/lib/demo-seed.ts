import "server-only";
import { extractClaims, type Channel } from "@/trust-engine";
import { kb, now } from "@/lib/trust-server";
import { liveKb, recordChange, saveLiveClaim } from "@/lib/live";
import { addDocument } from "@/lib/intake";
import { askToConfirm } from "@/lib/questions";
import { store } from "@/lib/store";

// A realistic morning for demos, so "What changed today" is never empty. Every item goes through the real
// engine (extraction, scoring, ledger), so the numbers are what the rules give. Two things are left open on
// purpose: Jan has not confirmed his meeting line, and the De Kroon agreement waits for an expert's approval.
// Switch off with DEMO_SEED=off. Runs once per store (memory: once per server start).

const MIN = 60_000;
let running: Promise<void> | null = null;
let inside = false;

export async function ensureDemoMorning(): Promise<void> {
  if (inside || process.env.DEMO_SEED === "off") return;
  running ??= (async () => {
    inside = true;
    try {
      if (await store.flagged("demo-morning")) return;
      await store.flag("demo-morning", 365 * 24 * 60 * MIN);
      await seed();
    } catch (err) {
      console.error("demo morning failed:", err);
    } finally {
      inside = false;
    }
  })();
  await running;
}

const person = (id: string) => kb.people.find((p) => p.id === id)!;

// What the mascot heard: the text, where, who wrote it (for email and Teams) and who fed it in.
async function heard(text: string, channel: Channel, writer: string, reporter: string, minutesAgo: number) {
  const at = new Date(Date.now() - minutesAgo * MIN);
  let before = await liveKb();
  const { extracted } = extractClaims(text, channel, { country: "BE", pc: "200" }, before, person(writer), now());
  for (const { claim } of extracted) {
    if (before.claims.some((c) => c.id === claim.id)) continue;
    await saveLiveClaim(claim, reporter);
    const after = { ...before, claims: [...before.claims, claim] };
    await recordChange({ kind: "learned", actor: reporter, claim, before, after, now: now(), at });
    before = after;
  }
}

async function seed() {
  // 08:55-ish: the Monday payroll sync. Jan's line waits for Jan; Tom's guess goes nowhere.
  await heard(
    ["Jan Wouters: For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.", "Tom Claes: I think everyone gets 25 days of holiday now."].join("\n"),
    "meeting",
    "sofie",
    "sofie",
    125,
  );
  // An email to a client with last year's meal voucher amount: the law says otherwise, so it barely counts.
  await heard("Dear client, the employer part of a meal voucher is €6.91 per working day.", "email", "pieter", "pieter", 80);
  // A colleague repeats the new mileage rate in Teams: it matches the law and backs it up.
  await heard("Reminder for everyone: from 1 July the mileage allowance for business travel is €0.4326 per km.", "teams", "lotte", "lotte", 50);
  // The client agreement for De Kroon arrives by email and waits for an expert to approve it.
  await addDocument(
    person("sofie"),
    "Service agreement Brouwerij De Kroon 2026",
    `SERVICE AGREEMENT – PAYROLL (fictional, for the demo)
Between Brouwerij De Kroon NV and SD Worx Belgium.

Article 1. This agreement sets the payroll terms for Brouwerij De Kroon from 1 November 2026.
Article 2. Full-time employees of Brouwerij De Kroon get 22 days of annual leave, two more than the legal minimum.
Article 3. The employer contribution to meal vouchers is €8.91 per working day.

Signed on 3 October 2026 by Pieter Claes, HR manager, Brouwerij De Kroon NV, and Anna De Smet, SD Worx.`,
    new Date(Date.now() - 15 * MIN),
  );
  // Sofie wants the meal voucher amount double-checked before she answers a client.
  await askToConfirm(person("sofie"), "off-meal-2026", { country: "BE", pc: "200" });
}

import "server-only";
import { allFeedback, kb, now, saveFeedback } from "@/lib/trust-server";
import { liveClaims, recordChange, retractions } from "@/lib/live";

// Quiet consent: something someone else heard you say in a meeting counts as yours after a day, unless you
// changed it (confirmed, corrected, took it back or marked it wrong). Nobody has to click anything for the
// brain to stay current; you can still change it afterwards. Every automatic step is a ledger entry.

export const QUIET_MS = Number(process.env.QUIET_HOURS ?? 24) * 3_600_000;
let lastRun = 0;

export async function applyQuietConsent(): Promise<void> {
  if (Date.now() - lastRun < 30_000) return; // at most every 30 seconds
  lastRun = Date.now();
  try {
    const [live, gone, fb] = await Promise.all([liveClaims(), retractions(), allFeedback()]);
    const removed = new Set(gone.map((r) => r.claimId));
    const k = { ...kb, claims: [...kb.claims, ...live.filter((c) => !removed.has(c.id))] };
    for (const c of live) {
      const due = c.heardAt && Date.now() - Date.parse(c.heardAt) >= QUIET_MS;
      const someoneElsesReport = c.source.type === "meeting" && c.author && c.reportedBy !== c.author;
      const touched = fb.some((f) => f.claimId === c.id && (f.userId === c.author || kb.people.find((p) => p.id === f.userId)?.role === "expert"));
      if (!due || !someoneElsesReport || touched || removed.has(c.id)) continue;
      const feedbackBefore = await allFeedback();
      await saveFeedback({ claimId: c.id, userId: c.author!, kind: "correct", context: { country: c.scope.country, pc: c.scope.pc, client: c.scope.client }, date: now().toISOString() });
      const first = kb.people.find((p) => p.id === c.author)?.name.split(" ")[0] ?? "the speaker";
      await recordChange({ kind: "confirmed", actor: c.author!, claim: c, before: k, after: k, feedbackBefore, now: now(), explain: `Counted as ${first}'s after ${QUIET_MS === 86_400_000 ? "a day" : `${Math.round(QUIET_MS / 3_600_000)} hours`} without changes.` });
    }
  } catch (err) {
    console.error("quiet consent failed:", err);
  }
}

// When a claim heard from someone counts as theirs without them doing anything.
export const countsFrom = (heardAt: string | undefined) => (heardAt ? new Date(Date.parse(heardAt) + QUIET_MS).toISOString() : null);

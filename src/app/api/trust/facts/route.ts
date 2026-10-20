import { evaluateFact, explainScore, forecast, parseContext } from "@/trust-engine";
import { allFeedback, currentUser, notYourClient, now, unauthorized } from "@/lib/trust-server";
import { liveKb } from "@/lib/live";
import { canReadClaim, canUseContext } from "@/lib/access";

// GET ?country=BE&pc=200&client=... -> every fact with status and scored claims (for the brain map)
export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  // Includes what the brain learned live (meetings, emails), like the ask route.
  const kb = await liveKb();
  const p = new URL(request.url).searchParams;
  const ctx = parseContext({ country: p.get("country") ?? "", pc: p.get("pc") ?? "", client: p.get("client") ?? "" }, kb);
  if (!ctx) return Response.json({ error: "valid country or client required" }, { status: 400 });
  if (!canUseContext(user, ctx, kb)) return notYourClient();
  const feedback = await allFeedback();
  const facts = kb.facts.map((f) => {
    const r = evaluateFact(f, kb, ctx, feedback, now());
    // Best before and one spoken sentence per fact, so the mascot can warn about a value that is about to change.
    const ahead = r.best ? forecast(f, kb, ctx, feedback, now()) : null;
    return {
      ...r,
      excluded: r.excluded.filter((e) => canReadClaim(user, e.claim, kb)),
      bestBefore: ahead?.bestBefore ?? null,
      headroom: ahead?.headroom ?? null,
      explain: explainScore(r.best, ahead),
    };
  });
  return Response.json({ context: ctx, facts });
}

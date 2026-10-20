import { currentUser, unauthorized } from "@/lib/trust-server";
import { ctxOf, ledger, liveKb } from "@/lib/live";
import { canUseContext } from "@/lib/access";

// GET ?fact=<key> -> the latest score changes, newest first. Only for cases the user may ask about:
// client entries for that client's consultants, country entries for that country's team.
export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const fact = new URL(request.url).searchParams.get("fact");
  if (fact !== null && !/^[a-z0-9-]{1,80}$/.test(fact)) return Response.json({ error: "Unknown fact" }, { status: 400 });
  try {
    const k = await liveKb();
    const claims = new Map(k.claims.map((c) => [c.id, c]));
    const entries = (await ledger())
      .filter((e) => !fact || e.factKey === fact)
      .filter((e) => {
        // Checked against the stored claim, not the entry's copy of the scope.
        const claim = claims.get(e.claimId);
        return claim ? canUseContext(user, ctxOf(claim), k) : false;
      })
      .slice(0, 50);
    return Response.json({ entries });
  } catch (err) {
    console.error("ledger failed:", err);
    return Response.json({ error: "Could not load the ledger right now, try again" }, { status: 500 });
  }
}

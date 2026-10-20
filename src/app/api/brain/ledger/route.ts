import { currentUser, unauthorized } from "@/lib/trust-server";
import { ledger, liveKb } from "@/lib/live";
import { canReadClaim } from "@/lib/access";

// GET ?fact=<key> -> the latest score changes, newest first. Client-specific entries only for that client's consultants.
export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const fact = new URL(request.url).searchParams.get("fact");
  const k = await liveKb();
  const entries = (await ledger())
    .filter((e) => !fact || e.factKey === fact)
    .filter((e) => {
      const claim = k.claims.find((c) => c.id === e.claimId);
      return claim ? canReadClaim(user, claim, k) : false;
    })
    .slice(0, 50);
  return Response.json({ entries });
}

import { extractClaims, parseContext, type Channel } from "@/trust-engine";
import { currentUser, forbidden, notYourClient, now, readJson, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { liveKb, recordChange, saveLiveClaim, type LedgerEntry } from "@/lib/live";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { canReadClaim, canUseContext, canVote } from "@/lib/access";

const CHANNELS: Channel[] = ["meeting", "teams", "email"];
const MAX_TEXT = 8000;

// POST { channel: meeting|teams|email, text, context } -> what the brain learned and how every score moved.
// The reporter is the signed-in user. Meeting speakers come from the transcript, but what they said stays
// capped at 50% until they (or an expert) confirm it from their own account.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const user = await currentUser(request);
  if (!user) return unauthorized();
  // Learning changes what everyone sees: same rule as voting, no guests.
  if (!canVote(user)) return Response.json({ error: "Sign in with your own account to teach the brain" }, { status: 403 });
  if (!(await rateLimit(`ingest:${user.id}`, 20, 60_000))) return tooManyRequests();

  const body = (await readJson(request)) as { channel?: unknown; text?: unknown; context?: unknown } | null;
  const channel = CHANNELS.find((c) => c === body?.channel);
  const text = typeof body?.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
  const before = await liveKb();
  const ctx = parseContext(body?.context, before);
  if (!channel || !text.trim() || !ctx) return Response.json({ error: "channel, text and a valid context are required" }, { status: 400 });
  if (!canUseContext(user, ctx, before)) return notYourClient();

  const { extracted, skipped } = extractClaims(text, channel, ctx, before, user, now());
  const learned: LedgerEntry[] = [];
  let k = before;
  for (const { claim, quote } of extracted) {
    if (k.claims.some((c) => c.id === claim.id)) {
      skipped.push({ sentence: quote, reason: "Already known" });
      continue;
    }
    // Never learn about a client this user does not work on.
    if (!canReadClaim(user, claim, k)) {
      skipped.push({ sentence: quote, reason: "About a client outside your portfolio" });
      continue;
    }
    await saveLiveClaim(claim);
    const after = { ...k, claims: [...k.claims, claim] };
    learned.push(await recordChange({ kind: "learned", actor: user.id, claim, before: k, after, now: now() }));
    k = after;
  }
  return Response.json({ learned, skipped });
}

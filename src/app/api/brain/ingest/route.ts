import { extractClaims, parseContext, type Channel } from "@/trust-engine";
import { currentUser, forbidden, notYourClient, now, readJson, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { ctxOf, firstToLearn, LIVE_MAX_PER_USER_PER_DAY, LIVE_MAX_TOTAL, liveCount, liveKb, recordChange, retractions, saveLiveClaim, type LedgerEntry } from "@/lib/live";
import { GUEST_ID, rateLimit, sameOrigin } from "@/lib/auth";
import { canUseContext, canVote } from "@/lib/access";

const CHANNELS: Channel[] = ["meeting", "teams", "email"];
// readJson refuses bodies over 10 KB. 6000 characters leave room for JSON escaping and multi-byte
// characters (€ is 3 bytes), so a text the UI accepts is never silently dropped as "invalid JSON".
const MAX_TEXT = 6000;
// Every learned claim is scored twice for the ledger: keep one request cheap.
const MAX_CLAIMS_PER_REQUEST = 20;

const bad = (error: string, status = 400) => Response.json({ error }, { status });

// POST { channel: meeting|teams|email, text, context } -> what the brain learned and how every score moved.
// The reporter is the signed-in user. Meeting speakers come from the transcript, but what they said stays
// capped at 50% until they (or an expert) confirm it from their own account, and the reporter cannot confirm it.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const user = await currentUser(request);
  if (!user) return unauthorized();
  // Learning changes what everyone sees: same rule as voting, no guests.
  if (!canVote(user)) return bad("Sign in with your own account to teach the brain", 403);
  if (!(await rateLimit(`ingest:${user.id}`, 20, 60_000))) return tooManyRequests();

  const body = await readJson(request, ["channel", "text", "context", "review"]);
  if (!body || typeof body !== "object") return bad("Send a JSON object of at most 10 KB");
  const { channel: rawChannel, text, context, review } = body as Record<string, unknown>;
  const channel = CHANNELS.find((c) => c === rawChannel);
  if (!channel) return bad("channel must be meeting, teams or email");
  if (typeof text !== "string" || !text.trim()) return bad("text is required");
  // Refuse instead of cutting: a cut sentence can change a value ("€8,91" -> "€8").
  if (text.length > MAX_TEXT) return bad(`text is too long (at most ${MAX_TEXT} characters)`, 413);

  try {
    const before = await liveKb();
    const ctx = parseContext(context, before);
    if (!ctx) return bad("a valid context is required");
    if (!canUseContext(user, ctx, before)) return notYourClient();

    const { extracted, skipped } = extractClaims(text, channel, ctx, before, user, now());
    // Shared on purpose from the desktop assistant: it only counts once a colleague approves it.
    if (review === true) for (const e of extracted) {
      e.claim.review = true;
      e.claim.source = { ...e.claim.source, title: "Shared by a colleague (review)" };
    }
    const learned: LedgerEntry[] = [];
    let k = before;
    const takenBack = new Set((await retractions()).map((r) => r.claimId));
    for (const { claim, quote, speaker } of extracted) {
      const skip = (reason: string) => skipped.push({ sentence: quote, reason });
      if (learned.length >= MAX_CLAIMS_PER_REQUEST) {
        skip(`At most ${MAX_CLAIMS_PER_REQUEST} statements at a time: send the rest separately`);
        continue;
      }
      if (k.claims.some((c) => c.id === claim.id)) {
        skip("Already known");
        continue;
      }
      // The speaker took these exact words back: feeding them again does not bring them back.
      if (takenBack.has(claim.id)) {
        skip("Taken back by the speaker");
        continue;
      }
      // Nobody could ever confirm it: the speaker left, or it is the shared read-only guest.
      if (!speaker || speaker.left || speaker.id === GUEST_ID) {
        skip("Speaker cannot confirm it (left the company or not a colleague)");
        continue;
      }
      // Never learn about a client this user does not work on, or a country outside their team:
      // the sentence decides the scope, so a named client or country must pass the same check as the case.
      if (!canUseContext(user, ctxOf(claim), k)) {
        skip("About a client or country outside your portfolio");
        continue;
      }
      if (liveCount(k) >= LIVE_MAX_TOTAL) {
        skip("The brain cannot learn more right now");
        continue;
      }
      if (!(await rateLimit(`learn:${user.id}`, LIVE_MAX_PER_USER_PER_DAY, 86_400_000))) {
        skip("Daily limit reached for what one person can teach the brain");
        continue;
      }
      if (!(await firstToLearn(claim.id))) {
        skip("Already known");
        continue;
      }
      const saved = await saveLiveClaim(claim, user.id);
      const after = { ...k, claims: [...k.claims, saved] };
      learned.push(await recordChange({ kind: "learned", actor: user.id, claim: saved, before: k, after, now: now() }));
      k = after;
    }
    return Response.json({ learned, skipped });
  } catch {
    console.error("ingest failed");
    return bad("Could not learn from this text right now, try again", 500);
  }
}

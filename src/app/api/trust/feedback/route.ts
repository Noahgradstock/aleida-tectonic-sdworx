import { matchScope, parseFeedback } from "@/trust-engine";
import { allFeedback, currentUser, forbidden, notYourClient, now, readJson, saveFeedback, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { liveKb, recordChange, reporterOf } from "@/lib/live";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { canUseContext, canVote } from "@/lib/access";

const sameContext = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);

// POST { claimId, kind: correct|wrong|outdated|not_applicable, context } — the voter is the signed-in user, never the body.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const user = await currentUser(request);
  if (!user) return unauthorized();
  if (!canVote(user)) return Response.json({ error: "Sign in with your own account to give feedback" }, { status: 403 });
  if (!(await rateLimit(`vote:${user.id}`, 60, 60_000))) return tooManyRequests();
  try {
    const kb = await liveKb();
    const parsed = parseFeedback(await readJson(request, ["claimId", "kind", "context"]), user.id, kb, now());
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const vote = parsed.feedback;
    // Only for cases this consultant works on.
    if (!canUseContext(user, vote.context, kb)) return notYourClient();

    // A vote only counts for a case where the claim is actually shown: you cannot vote on a claim
    // for a country, sector or client it does not apply to (e.g. to hide it for other consultants).
    const claim = kb.claims.find((c) => c.id === vote.claimId)!;
    const feedbackBefore = await allFeedback();
    const scope = matchScope(claim, vote.context, feedbackBefore);
    if (!scope.ok) return Response.json({ error: "This source does not apply to that case" }, { status: 400 });

    // Nobody backs their own input: whoever wrote or reported a claim cannot confirm it. For a meeting
    // claim this means only the speaker (when someone else reported it) or an expert can lift the 50% cap.
    if (vote.kind === "correct" && reporterOf(claim) === user.id) {
      return Response.json({ error: "You put this in yourself: a colleague or an expert has to confirm it" }, { status: 403 });
    }

    // The same vote again changes nothing: no new write, no new ledger entry.
    const previous = feedbackBefore.find((f) => f.userId === user.id && f.claimId === claim.id);
    if (previous && previous.kind === vote.kind && sameContext(previous.context, vote.context)) {
      return Response.json({ ok: true, entry: null, unchanged: true });
    }
    const changesScore = previous?.kind !== vote.kind;
    // Flipping a vote back and forth would flood the ledger: a person changes their mind a few times a day, not hundreds.
    if (changesScore && !(await rateLimit(`vote-change:${user.id}`, 100, 86_400_000))) return tooManyRequests();

    await saveFeedback(vote);
    const kind = ({ correct: "confirmed", wrong: "rejected", outdated: "outdated", not_applicable: null } as const)[vote.kind];
    const entry =
      changesScore && kind
        ? await recordChange({ kind, actor: user.id, claim, before: kb, after: kb, feedbackBefore, now: now() })
        : null;
    return Response.json({ ok: true, entry });
  } catch {
    console.error("feedback failed");
    return Response.json({ error: "Could not save your feedback right now, try again" }, { status: 500 });
  }
}

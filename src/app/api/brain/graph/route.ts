import { buildKnowledgeGraph } from "@/trust-engine";
import { allFeedback, currentUser, now, unauthorized } from "@/lib/trust-server";
import { liveKb, unconfirmedReport } from "@/lib/live";
import { canReadClaim } from "@/lib/access";
import { referenceContext, topicStatuses } from "@/lib/brain-data";

// GET -> the Brain: people, topics, documents and clients with a knowledge CV per person, plus the
// trust status of every topic for the user's reference case. Another client's agreements never leave the server.
export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const [k, feedback] = await Promise.all([liveKb(), allFeedback()]);
  const graph = buildKnowledgeGraph(k, feedback, now(), {
    canSee: (c) => canReadClaim(user, c, k),
    isHearsay: (c) => unconfirmedReport(c, feedback, k.people),
  });
  const { ctx, label } = referenceContext(user, k);
  return Response.json({ ...graph, topics: topicStatuses(k, ctx, feedback), reference: label });
}

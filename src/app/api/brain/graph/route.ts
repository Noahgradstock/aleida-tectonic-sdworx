import { buildKnowledgeGraph } from "@/trust-engine";
import { allFeedback, currentUser, now, unauthorized } from "@/lib/trust-server";
import { liveKb, unconfirmedReport } from "@/lib/live";
import { canReadClaim, clientsOf } from "@/lib/access";
import { referenceContext, topicStatuses } from "@/lib/brain-data";
import { allQuestions } from "@/lib/questions";

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
  // Doubt as a signal: how many colleagues are waiting for a confirmation on each topic. Counts only, no names.
  const asked: Record<string, number> = {};
  for (const q of await allQuestions()) if (q.status === "open") asked[q.factKey] = (asked[q.factKey] ?? 0) + 1;
  return Response.json({ ...graph, topics: topicStatuses(k, ctx, feedback, clientsOf(user, k)), reference: label, asked, today: now().toISOString().slice(0, 10) });
}

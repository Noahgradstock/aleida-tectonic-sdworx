import { currentUser, forbidden, readJson, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { answerQuestion, type AnswerKind } from "@/lib/questions";

const ANSWERS: AnswerKind[] = ["correct", "wrong", "not_mine"];

// POST { id, answer: correct|wrong|not_mine } -> only the person who was asked can answer.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const user = await currentUser(request);
  if (!user) return unauthorized();
  if (!(await rateLimit(`answer:${user.id}`, 30, 60_000))) return tooManyRequests();
  const body = (await readJson(request, ["id", "answer"])) as { id?: unknown; answer?: unknown } | null;
  const id = typeof body?.id === "string" && body.id.length <= 300 ? body.id : null;
  const answer = ANSWERS.find((a) => a === body?.answer);
  if (!id || !answer) return Response.json({ error: "id and answer (correct, wrong or not_mine) are required" }, { status: 400 });
  try {
    const r = await answerQuestion(user, id, answer);
    return r.ok ? Response.json({ question: r.question, entry: r.entry }) : Response.json({ error: r.error }, { status: r.status });
  } catch {
    console.error("answer failed");
    return Response.json({ error: "Could not save your answer right now" }, { status: 500 });
  }
}

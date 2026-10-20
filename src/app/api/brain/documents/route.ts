import { currentUser, forbidden, readJson, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { canVote } from "@/lib/access";
import { addDocument } from "@/lib/intake";

// POST { title, text } -> reads a whole document (e.g. a client agreement), checks it, and puts it up for approval.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const user = await currentUser(request);
  if (!user) return unauthorized();
  if (!canVote(user)) return Response.json({ error: "Sign in with your own account to add a document" }, { status: 403 });
  if (!(await rateLimit(`doc:${user.id}`, 10, 60_000))) return tooManyRequests();
  const body = (await readJson(request)) as { title?: unknown; text?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const text = typeof body?.text === "string" ? body.text : "";
  if (!title || !text.trim()) return Response.json({ error: "A title and the document text are required" }, { status: 400 });
  if (text.length > 6000) return Response.json({ error: "The document is too long for the demo (6,000 characters)" }, { status: 413 });
  try {
    const r = await addDocument(user, title, text);
    return r.ok ? Response.json({ doc: r.doc }) : Response.json({ error: r.error }, { status: r.status });
  } catch (err) {
    console.error("document failed:", err);
    return Response.json({ error: "Could not read the document right now" }, { status: 500 });
  }
}

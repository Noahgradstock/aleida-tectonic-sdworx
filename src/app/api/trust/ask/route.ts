import { ask, lastUpdated, matchFact, parseContext, rankContacts } from "@/trust-engine";
import { matchFactWithGemini } from "@/lib/gemini-match";
import { allFeedback, currentUser, forbidden, notYourClient, now, readJson, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { liveKb } from "@/lib/live";
import { maskPersonalData } from "@/lib/privacy";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { canReadClaim, canUseContext } from "@/lib/access";

// POST { question, context: { country, pc?, client? } } -> answer with trust receipt
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const user = await currentUser(request);
  if (!user) return unauthorized();
  // Each question can cost a Gemini call: 30 per user per minute is plenty for a person, not for a script.
  if (!(await rateLimit(`ask:${user.id}`, 30, 60_000))) return tooManyRequests();
  const body = (await readJson(request)) as { question?: unknown; context?: unknown; factKey?: unknown } | null;
  const kb = await liveKb();
  const question = typeof body?.question === "string" ? body.question.slice(0, 500) : "";
  const ctx = parseContext(body?.context, kb);
  if (!question || !ctx) return Response.json({ error: "question and a valid context are required" }, { status: 400 });
  if (!canUseContext(user, ctx, kb)) return notYourClient();
  // Keywords are instant; Gemini handles free text and other languages when they find nothing.
  // GDPR: names, ages and identifiers are masked before anything is sent to Gemini.
  const masked = maskPersonalData(question, [
    ...kb.people.flatMap((p) => [
      { label: "person", value: p.name },
      { label: "person", value: p.name.split(" ")[0] },
    ]),
    ...kb.clients.map((c) => ({ label: "client", value: c.name })),
  ]);
  // A topic picked from the list needs no matching at all.
  const picked = typeof body?.factKey === "string" && kb.facts.some((f) => f.key === body.factKey) ? body.factKey : null;
  const byKeywords = picked ? null : matchFact(question, kb.facts);
  const factKey = picked ?? (byKeywords ? null : await matchFactWithGemini(masked.text, kb.facts));
  const matchedBy = picked ? "picked" : byKeywords ? "keywords" : factKey ? "gemini" : "none";
  const privacy = { masked: masked.text, redactions: masked.redactions, sentToAi: !picked && !byKeywords };
  const feedback = await allFeedback();
  const result = ask(question, ctx, kb, feedback, now(), factKey);
  if (!result.matched) return Response.json({ ...result, matchedBy, privacy });
  // "Set aside" sources can be another client's agreement: only show those to that client's consultants.
  result.excluded = result.excluded.filter((e) => canReadClaim(user, e.claim, kb));
  const contacts = rankContacts(result, ctx, kb, feedback, now());
  return Response.json({ ...result, contacts, lastUpdated: lastUpdated(result), matchedBy, privacy });
}

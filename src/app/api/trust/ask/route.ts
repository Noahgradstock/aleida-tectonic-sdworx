import { ask, explainScore, forecast, lastUpdated, matchFact, parseContext, rankContacts, recentTrail } from "@/trust-engine";
import { matchFactWithGemini } from "@/lib/gemini-match";
import { allFeedback, currentUser, forbidden, notYourClient, now, readJson, tooManyRequests, unauthorized } from "@/lib/trust-server";
import { liveKb, unconfirmedReport } from "@/lib/live";
import { allQuestions, declinedFor, previewRecipient } from "@/lib/questions";
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
  const body = (await readJson(request, ["question", "context", "factKey"])) as { question?: unknown; context?: unknown; factKey?: unknown } | null;
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
  // Who to contact is built from claim authors. A meeting line someone else typed in under a colleague's
  // name only counts once that colleague (or an expert) confirmed it, so nobody can raise or ruin a
  // colleague's track record by putting words in their mouth.
  const vouched = { ...kb, claims: kb.claims.filter((c) => !unconfirmedReport(c, feedback, kb.people)) };
  const declined = declinedFor(await allQuestions(), result.fact.key);
  const contacts = rankContacts(result, ctx, vouched, feedback, now(), { declined });
  // Who else dealt with this lately, in any country or client this user may see.
  const trail = recentTrail(result, kb, now(), { canSee: (c) => canReadClaim(user, c, kb), isHearsay: (c) => unconfirmedReport(c, feedback, kb.people) });
  // Who "Ask to confirm" would reach: never the author of the answer, never someone over their weekly budget.
  const to = result.best ? await previewRecipient(user, result.best.claim.id, ctx) : null;
  const author = result.best?.claim.author ? kb.people.find((p) => p.id === result.best!.claim.author) : undefined;
  const confirmer = to ? { id: to.id, name: to.name, note: author && author.id !== to.id ? `${author.name.split(" ")[0]} wrote this, so a colleague confirms it` : null } : null;
  // Will it still be trusted tomorrow? The same engine, run forward in time.
  const ahead = forecast(result.fact, kb, ctx, feedback, now());
  return Response.json({ ...result, contacts, trail, confirmer, forecast: ahead, explain: explainScore(result.best, ahead), lastUpdated: lastUpdated(result), matchedBy, privacy });
}

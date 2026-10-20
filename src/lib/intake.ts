import "server-only";
import { evaluateFact, readDocument, type DocCheck, type Person } from "@/trust-engine";
import { allFeedback, now, saveFeedback } from "@/lib/trust-server";
import { ctxOf, liveKb, recordChange, saveLiveClaim } from "@/lib/live";
import { canUseContext } from "@/lib/access";
import { store } from "@/lib/store";

// Whole documents (a client agreement from an email, or uploaded): read, checked, waiting for one expert's
// approval, then a source like any other. A newer agreement with the same client replaces the older one.

export type StoredDoc = {
  id: string;
  title: string;
  client: string | null;
  signedOn: string | null;
  checks: DocCheck[];
  changes: string[]; // "Annual leave days: says 22 days, the answer today is 20 days"
  claimIds: string[];
  uploadedBy: string;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected" | "replaced";
  decidedBy?: string;
};

const MAX_DOCS = 200;
export async function allDocs(): Promise<StoredDoc[]> {
  return (await store.hvals("documents")).map((v) => JSON.parse(v) as StoredDoc);
}
const save = (d: StoredDoc) => store.hset("documents", d.id, JSON.stringify(d));
const isExpert = (p: Person) => p.role === "expert";

export async function addDocument(user: Person, title: string, text: string): Promise<{ ok: true; doc: StoredDoc } | { ok: false; status: number; error: string }> {
  const k = await liveKb();
  const read = readDocument({ title, text }, user, k, now());
  // Only documents about a client you work on.
  if (!read.client || !canUseContext(user, { country: read.client.country, pc: read.client.pc, client: read.client.id }, k)) {
    return { ok: false, status: 403, error: read.client ? "This document is about a client you do not work on" : "No client named in the document" };
  }
  if ((await allDocs()).length >= MAX_DOCS) return { ok: false, status: 429, error: "Too many documents right now" };

  // What it would change, in words, for the expert who approves it.
  const fb = await allFeedback();
  const changes = read.claims.map((c) => {
    const fact = k.facts.find((f) => f.key === c.factKey)!;
    const today = evaluateFact(fact, k, ctxOf(c), fb, now()).best?.claim.value ?? "nothing";
    return today === c.value ? `${fact.label}: ${c.value}, same as today` : `${fact.label}: says ${c.value}, the answer today is ${today}`;
  });

  const doc: StoredDoc = {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    client: read.client.id,
    signedOn: read.signedOn,
    checks: read.checks,
    changes,
    claimIds: read.claims.map((c) => c.id),
    uploadedBy: user.id,
    uploadedAt: new Date().toISOString(),
    status: "pending",
  };
  let before = k;
  for (const c of read.claims) {
    if (before.claims.some((x) => x.id === c.id)) continue;
    await saveLiveClaim(c, user.id);
    const after = { ...before, claims: [...before.claims, c] };
    await recordChange({ kind: "learned", actor: user.id, claim: c, before, after, now: now() });
    before = after;
  }
  await save(doc);
  return { ok: true, doc };
}

// Documents this person may approve: they are an expert, did not upload it, and work on that client.
export async function docsToApprove(user: Person): Promise<StoredDoc[]> {
  if (!isExpert(user)) return [];
  const k = await liveKb();
  return (await allDocs()).filter((d) => {
    const c = k.clients.find((x) => x.id === d.client);
    return d.status === "pending" && d.uploadedBy !== user.id && !!c && canUseContext(user, { country: c.country, pc: c.pc, client: c.id }, k);
  });
}

export async function decide(user: Person, id: string, decision: "approve" | "reject"): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const doc = (await docsToApprove(user)).find((d) => d.id === id);
  if (!doc) return { ok: false, status: 404, error: "Not found" };
  const k = await liveKb();
  const claims = k.claims.filter((c) => doc.claimIds.includes(c.id));
  const first = user.name.split(" ")[0];

  if (decision === "reject") {
    for (const c of claims) {
      await store.hset("retractions", c.id, JSON.stringify({ claimId: c.id, by: user.id, at: new Date().toISOString() }));
      await recordChange({ kind: "removed", actor: user.id, claim: c, before: k, after: { ...k, claims: k.claims.filter((x) => x.id !== c.id) }, now: now(), explain: `${first} rejected "${doc.title}" as a source.` });
    }
    await save({ ...doc, status: "rejected", decidedBy: user.id });
    return { ok: true };
  }

  // Approve: one confirmation per statement, by this expert. An older approved agreement with the same client is replaced.
  for (const old of (await allDocs()).filter((d) => d.status === "approved" && d.client === doc.client)) {
    for (const cid of old.claimIds) await store.hset("retractions", cid, JSON.stringify({ claimId: cid, by: user.id, at: new Date().toISOString(), correctedTo: doc.id }));
    await save({ ...old, status: "replaced" });
  }
  for (const c of claims) {
    const feedbackBefore = await allFeedback();
    await saveFeedback({ claimId: c.id, userId: user.id, kind: "correct", context: ctxOf(c), date: now().toISOString() });
    await recordChange({ kind: "confirmed", actor: user.id, claim: c, before: k, after: k, feedbackBefore, now: now(), explain: `${first} approved "${doc.title}" as a source.` });
  }
  await save({ ...doc, status: "approved", decidedBy: user.id });
  return { ok: true };
}

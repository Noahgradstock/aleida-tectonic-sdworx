"use client";

import { useCallback, useEffect, useState } from "react";
import type { Contact, Evidence } from "@/trust-engine";

// The live loop: everyday work goes in (a meeting, a Teams message, an email), the brain learns,
// and every score change is logged with the exact points that moved it.

type Ctx = { client?: string; country?: string; pc?: string };
type Me = { id: string; name: string; role: string };
type Snapshot = { value: string | null; score: number | null; status: string };
type Entry = {
  id: string;
  at: string;
  kind: "learned" | "confirmed" | "rejected" | "outdated";
  actor: string;
  channel: string;
  factKey: string;
  factLabel: string;
  claimId: string;
  value: string;
  quote: string;
  speaker: string | null;
  scope: { country: string; pc?: string; client?: string };
  claimScore: { before: number | null; after: number };
  answer: { before: Snapshot; after: Snapshot };
  evidence: Evidence[];
  caps: string[];
};
type Answer = {
  matched: boolean;
  fact?: { key: string; label: string };
  status?: string;
  best?: { claim: { value: string; source: { title: string } }; score: number } | null;
  contacts?: { ranked: Contact[]; setAside: { person: { id: string; name: string }; reason: string }[] };
  lastUpdated?: { date: string; source: string; by: string | null } | null;
};

const CASES: { label: string; ctx: Ctx }[] = [
  { label: "Brouwerij De Kroon (BE, PC 200)", ctx: { client: "brouwerij-de-kroon" } },
  { label: "Belgium · PC 200", ctx: { country: "BE", pc: "200" } },
];

const DEMO: Record<"meeting" | "teams" | "email", string> = {
  meeting: [
    "Jan Wouters: For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.",
    "Sofie Maes: Good, I'll put that in the payroll file.",
    "Tom Claes: I think everyone gets 25 days of holiday now.",
  ].join("\n"),
  teams: "Reminder for the team: a full-time employee in a five-day week gets 20 days of annual leave.",
  email: "Dear client, your employees are entitled to 24 days of annual leave this year.",
};

const pct = (n: number | null | undefined) => (n == null ? "–" : `${Math.round(n * 100)}%`);
const color = (s: number | null | undefined) => (s == null ? "#a3a3a3" : s >= 0.75 ? "#0f8a4f" : s >= 0.5 ? "#9a6400" : "#c0392b");
const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  return s < 60 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(iso).toLocaleDateString("en-GB");
};
const KIND: Record<Entry["kind"], string> = { learned: "Learned", confirmed: "Confirmed", rejected: "Rejected", outdated: "Outdated" };

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

export default function Loop() {
  const [me, setMe] = useState<Me | null>(null);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [facts, setFacts] = useState<{ key: string; label: string }[]>([]);
  const [caseIdx, setCaseIdx] = useState(0);
  const [factKey, setFactKey] = useState("annual-leave-days");
  const [channel, setChannel] = useState<keyof typeof DEMO>("meeting");
  const [text, setText] = useState(DEMO.meeting);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fed, setFed] = useState<{ learned: Entry[]; skipped: { sentence: string; reason: string }[] } | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  const ctx = CASES[caseIdx].ctx;

  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((r) => setMe(r.user)).catch(() => {});
    api<{ people: { id: string; name: string }[]; facts: { key: string; label: string }[] }>("/api/trust/meta")
      .then((m) => {
        setPeople(Object.fromEntries(m.people.map((p) => [p.id, p.name])));
        setFacts(m.facts);
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    try {
      const label = facts.find((f) => f.key === factKey)?.label ?? factKey;
      const [a, l] = await Promise.all([
        api<Answer>("/api/trust/ask", { question: label, context: ctx, factKey }),
        api<{ entries: Entry[] }>(`/api/brain/ledger?fact=${encodeURIComponent(factKey)}`),
      ]);
      setAnswer(a);
      setEntries(l.entries);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [factKey, facts, ctx]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function feed() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ learned: Entry[]; skipped: { sentence: string; reason: string }[] }>("/api/brain/ingest", { channel, text, context: ctx });
      setFed(r);
      if (r.learned[0]) setFactKey(r.learned[0].factKey);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function vote(entry: Entry, kind: "correct" | "wrong") {
    setError(null);
    try {
      await api("/api/trust/feedback", { claimId: entry.claimId, kind, context: entry.scope.client ? { client: entry.scope.client } : entry.scope });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const name = (id: string | null) => (id ? (people[id] ?? id) : "Unknown");
  const canConfirm = (e: Entry) => !!me && (me.id === e.speaker || me.role === "expert");
  const confirmed = new Set(entries.filter((e) => e.kind === "confirmed").map((e) => e.claimId));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-20">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-neutral-500">Live loop</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight">The brain learns from work that already happens</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          A meeting, a Teams message or an email goes in. Code pulls out each statement with its exact quote, scores it with the same
          six layers, and logs how every score moved. Spoken claims stay capped at 50% until the speaker or an expert confirms them.
          All people, clients and documents are fictional.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-neutral-500">Case</span>
        {CASES.map((c, i) => (
          <button key={c.label} onClick={() => setCaseIdx(i)} className={`rounded-full px-3 py-1 ${i === caseIdx ? "bg-[#161616] text-white" : "bg-white text-neutral-700 shadow-sm"}`}>
            {c.label}
          </button>
        ))}
        {me && <span className="ml-auto text-neutral-500">Signed in as {me.name}</span>}
      </div>

      {error && <p className="mb-4 rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#c0392b]">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* 1. Everyday work goes in */}
        <section className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="font-serif text-2xl">1. Everyday work</h2>
          <div className="mt-3 flex gap-1 text-xs">
            {(Object.keys(DEMO) as (keyof typeof DEMO)[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setChannel(c);
                  setText(DEMO[c]);
                  setFed(null);
                }}
                className={`rounded-full px-3 py-1 capitalize ${c === channel ? "bg-[#161616] text-white" : "bg-neutral-100 text-neutral-700"}`}
              >
                {c === "meeting" ? "Meeting transcript" : c === "teams" ? "Teams message" : "Email draft"}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={8000}
            rows={7}
            aria-label="Text to feed to the brain"
            className="mt-3 w-full resize-y rounded-xl border border-neutral-200 p-3 font-mono text-xs leading-relaxed focus:border-neutral-400 focus:outline-none"
          />
          <button onClick={feed} disabled={busy || !text.trim()} className="mt-3 rounded-full bg-[#161616] px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-40">
            {busy ? "Learning…" : "Feed to the brain"}
          </button>
          <p className="mt-2 text-xs text-neutral-500">In the product the desktop mascot does this in the background. Nobody pastes anything.</p>

          {fed && (
            <div className="mt-5 space-y-2 text-sm">
              <p className="font-medium">
                Learned {fed.learned.length} · ignored {fed.skipped.length}
              </p>
              {fed.learned.map((e) => (
                <div key={e.id} className="rounded-lg bg-[#eef7f1] px-3 py-2">
                  <span className="font-medium">{name(e.speaker)}</span>: “{e.quote}” → <b>{e.value}</b> on {e.factLabel.toLowerCase()}
                </div>
              ))}
              {fed.skipped.map((s, i) => (
                <div key={i} className="rounded-lg bg-neutral-50 px-3 py-2 text-neutral-600">
                  “{s.sentence}” <span className="text-neutral-400">· {s.reason}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. The answer, who to ask, and the ledger */}
        <section className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-2xl">2. The answer now</h2>
              <select value={factKey} onChange={(e) => setFactKey(e.target.value)} aria-label="Topic" className="rounded-full bg-neutral-100 px-3 py-1 text-sm">
                {facts.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            {answer?.matched && answer.best ? (
              <>
                <div className="mt-3 flex items-end gap-4">
                  <div className="font-serif text-5xl leading-none tracking-tight">{answer.best.claim.value}</div>
                  <div className="pb-1 text-sm">
                    <span className="font-medium" style={{ color: color(answer.best.score) }}>
                      {pct(answer.best.score)} {answer.status}
                    </span>
                    <span className="text-neutral-500"> · from {answer.best.claim.source.title}</span>
                  </div>
                </div>
                {answer.lastUpdated && (
                  <p className="mt-2 text-xs text-neutral-500">
                    Last thing the brain learned on this topic: {answer.lastUpdated.date} · {answer.lastUpdated.source}
                    {answer.lastUpdated.by ? ` · ${name(answer.lastUpdated.by)}` : ""}
                  </p>
                )}

                <h3 className="mt-5 text-sm font-medium">Who to contact first</h3>
                <ol className="mt-2 space-y-2">
                  {answer.contacts?.ranked.slice(0, 3).map((c, i) => (
                    <li key={c.person.id} className={`rounded-xl px-3 py-2 text-sm ${i === 0 ? "bg-[#eef3ff]" : "bg-neutral-50"}`}>
                      <div className="flex items-baseline justify-between">
                        <span className="font-medium">
                          {i + 1}. {c.person.name}
                        </span>
                        <span className="tabular-nums text-xs text-neutral-500">{c.points > 0 ? "+" : ""}{c.points} pts</span>
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-600">{c.reasons.join(" · ")}</div>
                    </li>
                  ))}
                  {answer.contacts?.setAside.map((s) => (
                    <li key={s.person.id} className="px-3 text-xs text-neutral-400">
                      Not {s.person.name}: {s.reason}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">Nothing in the brain applies to this case yet.</p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h2 className="font-serif text-2xl">3. Why the score moved</h2>
            {entries.length === 0 && <p className="mt-3 text-sm text-neutral-500">No changes yet. Feed something to the brain.</p>}
            <ol className="mt-3 space-y-4">
              {entries.map((e) => (
                <li key={e.id} className="border-l-2 pl-4" style={{ borderColor: color(e.claimScore.after) }}>
                  <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-neutral-500">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">{KIND[e.kind]}</span>
                    <span>{ago(e.at)}</span>
                    <span>· {e.channel}</span>
                    <span>· by {name(e.actor)}</span>
                    {e.scope.client && <span>· {e.scope.client}</span>}
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="font-medium">{name(e.speaker)}</span>: “{e.quote}”
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="w-24 text-xs text-neutral-500">This claim</span>
                    <Bar from={e.claimScore.before} to={e.claimScore.after} />
                    <span className="tabular-nums" style={{ color: color(e.claimScore.after) }}>
                      {e.claimScore.before == null ? "new" : pct(e.claimScore.before)} → {pct(e.claimScore.after)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm">
                    <span className="w-24 text-xs text-neutral-500">The answer</span>
                    <span>
                      {e.answer.before.value ?? "–"} ({pct(e.answer.before.score)}) → <b>{e.answer.after.value ?? "–"}</b> ({pct(e.answer.after.score)}, {e.answer.after.status})
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.evidence.map((ev, i) => (
                      <span key={i} title={ev.label} className={`rounded-full px-2 py-0.5 text-[11px] ${ev.points >= 0 ? "bg-[#eef7f1] text-[#0f8a4f]" : "bg-[#fdecea] text-[#c0392b]"}`}>
                        {ev.tag} {ev.points > 0 ? "+" : ""}
                        {ev.points}
                      </span>
                    ))}
                    {e.caps.map((c) => (
                      <span key={c} className="rounded-full bg-[#fff4e0] px-2 py-0.5 text-[11px] text-[#9a6400]">
                        {c}
                      </span>
                    ))}
                  </div>
                  {e.kind === "learned" && e.channel === "meeting" && !confirmed.has(e.claimId) && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {canConfirm(e) ? (
                        <>
                          <button onClick={() => vote(e, "correct")} className="rounded-full bg-[#161616] px-3 py-1 text-white">
                            ✓ Still right
                          </button>
                          <button onClick={() => vote(e, "wrong")} className="rounded-full bg-neutral-100 px-3 py-1">
                            ✗ Wrong
                          </button>
                        </>
                      ) : (
                        <span className="text-neutral-500">Waiting for {name(e.speaker)} or an expert to confirm with one click.</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}

function Bar({ from, to }: { from: number | null; to: number }) {
  return (
    <span className="relative h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100">
      {from != null && <span className="absolute inset-y-0 left-0 bg-neutral-300" style={{ width: `${from * 100}%` }} />}
      <span className="absolute inset-y-0 left-0 transition-all duration-700" style={{ width: `${to * 100}%`, background: color(to), opacity: 0.85 }} />
    </span>
  );
}

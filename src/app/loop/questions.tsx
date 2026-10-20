"use client";

import { useCallback, useEffect, useState } from "react";

// Questions colleagues sent you: one card, three buttons. Hidden when there is nothing to answer.

type Q = {
  id: string;
  factLabel: string;
  value: string;
  quote: string;
  source: string;
  context: { client?: string; country?: string; pc?: string };
  fromName: string;
  caseName: string;
  askedAt: string;
};
type Done = { q: Q; label: string; tone: string };

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};
const pct = (n: number | null | undefined) => (n == null ? "–" : `${Math.round(n * 100)}%`);

export default function QuestionsForYou() {
  const [qs, setQs] = useState<Q[]>([]);
  const [done, setDone] = useState<Record<string, Done>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/brain/questions").catch(() => null);
    if (res?.ok) setQs(((await res.json()) as { forMe: Q[] }).forMe);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    const t = setInterval(load, 5_000);
    return () => clearInterval(t);
  }, [load]);

  async function answer(q: Q, kind: "correct" | "wrong" | "not_mine") {
    setBusy(q.id);
    const res = await fetch("/api/brain/questions/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: q.id, answer: kind }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setDone((d) => ({ ...d, [q.id]: { q, label: json.error ?? "Could not save", tone: "text-[#c0392b]" } }));
    else if (kind === "not_mine") setDone((d) => ({ ...d, [q.id]: { q, label: "Thanks. Passed on to the next person, and you won't be asked about this topic again.", tone: "text-neutral-600" } }));
    else {
      const e = json.entry as { claimScore: { before: number | null; after: number } } | null;
      const moved = e ? ` The score moved ${pct(e.claimScore.before)} → ${pct(e.claimScore.after)}.` : "";
      setDone((d) => ({ ...d, [q.id]: { q, label: `Thanks, ${q.fromName.split(" ")[0]} has the answer.${moved}`, tone: kind === "correct" ? "text-[#0f8a4f]" : "text-[#c0392b]" } }));
    }
    setBusy(null);
  }

  // Answered cards stay, with their thank-you line, after they leave the open list.
  const open = qs.filter((q) => !done[q.id]);
  const shown = [...open, ...Object.values(done).map((d) => d.q)];
  if (!shown.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-20" aria-label="Questions for you">
      <div className="rounded-2xl bg-[#eef3ff] p-5">
        <h2 className="text-sm font-medium text-[#1463ff]">
          {open.length || "No more"} question{open.length === 1 ? "" : "s"} waiting for you
        </h2>
        <ul className="mt-3 space-y-3">
          {shown.map((q) => (
            <li key={q.id} className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <p className="text-xs text-neutral-500">
                {q.fromName} asks · {ago(q.askedAt)} · {q.caseName}
              </p>
              <p className="mt-1 text-sm">
                Is this still right? <span className="text-neutral-500">{q.factLabel}:</span> <b className="font-serif text-lg">{q.value}</b>
              </p>
              {q.quote && <p className="mt-1 text-xs italic text-neutral-600">“{q.quote.length > 180 ? `${q.quote.slice(0, 179)}…` : q.quote}” · {q.source}</p>}
              {done[q.id] ? (
                <p className={`mt-3 text-sm ${done[q.id].tone}`}>{done[q.id].label}</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button disabled={!!busy} onClick={() => answer(q, "correct")} className="rounded-full bg-[#1463ff] px-4 py-1.5 text-sm font-medium text-white active:scale-[0.97] disabled:opacity-50">
                    ✓ Still right
                  </button>
                  <button disabled={!!busy} onClick={() => answer(q, "wrong")} className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-neutral-200 active:scale-[0.97] disabled:opacity-50">
                    ✗ Wrong
                  </button>
                  <button disabled={!!busy} onClick={() => answer(q, "not_mine")} className="rounded-full px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50">
                    Not my area
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

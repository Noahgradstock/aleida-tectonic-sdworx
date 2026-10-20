"use client";

import { useCallback, useEffect, useState } from "react";
import { channelIcon, Icon } from "../icons";

// Your corner of the brain: what waits for your yes, and a log of everything that came from you.
// Only ever your own entries; every change you make here is logged for everyone in "Why the score moved".

type Item = {
  id: string;
  kind: "said" | "added" | "confirmed" | "rejected";
  channel: string;
  source: string;
  factLabel: string;
  value: string;
  quote: string;
  speakerName: string | null;
  reportedByName: string | null;
  date: string;
  scope: string;
  state: "counts" | "waiting" | "removed";
  score: number | null;
  isAnswer: boolean;
  can: { confirm: boolean; correct: boolean; remove: boolean; restore: boolean; undo: boolean };
  correctedTo?: string | null;
};
type Question = { id: string; factLabel: string; value: string; quote: string; source: string; fromName: string; askedAt: string; caseName?: string };
type Doc = { id: string; title: string; clientName: string; uploadedByName: string; uploadedAt: string; checks: { ok: boolean; label: string }[]; changes: string[] };
type Mine = { waiting: Item[]; questions: Question[]; documents: Doc[]; log: Item[] };

const CHANNEL: Record<string, string> = { agreement: "Agreement", meeting: "Meeting", email: "Email", teams: "Teams", sharepoint: "Document", official: "Official" };
const pct = (n: number | null) => (n == null ? "" : `${Math.round(n * 100)}%`);
const tone = (n: number | null) => (n == null ? "#a3a3a3" : n >= 0.75 ? "#0f8a4f" : n >= 0.5 ? "#9a6400" : "#c0392b");
const when = (d: string) => {
  const t = Date.parse(d);
  if (d.length > 10) {
    const m = Math.max(0, Math.round((Date.now() - t) / 60_000));
    if (m < 60 * 24) return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
  }
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Could not save that");
  return json as { explain?: string };
}

export default function YourInbox({ onChange }: { onChange?: () => void }) {
  const [mine, setMine] = useState<Mine | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, { text: string; good: boolean }>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/brain/mine").catch(() => null);
    if (res?.ok) setMine((await res.json()) as Mine);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    const t = setInterval(load, 5_000);
    return () => clearInterval(t);
  }, [load]);

  async function run(key: string, call: () => Promise<{ explain?: string }>, done?: string) {
    setBusy(key);
    try {
      const r = await call();
      setNote((n) => ({ ...n, [key]: { text: done ?? r.explain ?? "Saved.", good: true } }));
      setEditing(null);
      await load();
      onChange?.();
    } catch (e) {
      setNote((n) => ({ ...n, [key]: { text: (e as Error).message, good: false } }));
    } finally {
      setBusy(null);
    }
  }
  const mineAct = (item: Item, action: string, value?: string) =>
    run(item.id, () => post("/api/brain/mine", { action, id: item.id.replace(/^vote:/, ""), value }));
  const answer = (q: Question, kind: "correct" | "wrong" | "not_mine") =>
    run(q.id, () => post("/api/brain/questions/answer", { id: q.id, answer: kind }), kind === "not_mine" ? "Passed on. You won't be asked about this topic again." : "Thanks, your answer now counts.");

  if (!mine) return null;
  const inbox = mine.waiting.length + mine.questions.length + (mine.documents?.length ?? 0);
  const log = showAll ? mine.log : mine.log.slice(0, 4);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-6" aria-label="Your inbox and log">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl">Waiting for you</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${inbox ? "bg-[#1463ff] text-white" : "bg-neutral-100 text-neutral-500"}`}>{inbox || "All clear"}</span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">What you said, and questions from colleagues.</p>

      {inbox > 0 && (
        <ul className="mt-4 space-y-3">
          {(mine.documents ?? []).map((d) => (
            <li key={d.id} className="rounded-2xl border border-[#1463ff]/20 bg-[#f5f8ff] p-4">
              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Icon name="document" size={13} />
                Document · uploaded by {d.uploadedByName} · {when(d.uploadedAt)}
              </p>
              <p className="mt-2 text-sm">
                Approve <b>{d.title}</b> as a source for <b>{d.clientName}</b>?
              </p>
              <ul className="mt-2 space-y-0.5 text-xs">
                {d.checks.map((c) => (
                  <li key={c.label} className={`flex items-center gap-1.5 ${c.ok ? "text-[#0f8a4f]" : "text-[#9a6400]"}`}>
                    <Icon name={c.ok ? "check" : "cross"} size={12} />
                    {c.label}
                  </li>
                ))}
              </ul>
              {d.changes.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-neutral-600">
                  {d.changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {!note[d.id] && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn primary disabled={!!busy} onClick={() => run(d.id, () => post("/api/brain/documents/decide", { id: d.id, decision: "approve" }), "Approved. It now counts as a source for this client.")}>
                    <Icon name="check" size={14} />
                    Approve as a source
                  </Btn>
                  <Btn ghost disabled={!!busy} onClick={() => run(d.id, () => post("/api/brain/documents/decide", { id: d.id, decision: "reject" }), "Rejected. It counts nowhere.")}>
                    <Icon name="cross" size={14} />
                    Reject
                  </Btn>
                </div>
              )}
              <Note n={note[d.id]} />
            </li>
          ))}
          {mine.waiting.map((it) => (
            <li key={it.id} className="rounded-2xl border border-[#1463ff]/20 bg-[#f5f8ff] p-4">
              <Meta it={it} lead={`${it.reportedByName ?? "A colleague"} added this from a meeting`} />
              <p className="mt-2 text-sm">
                You said <b className="font-serif text-lg">{it.value}</b> <span className="text-neutral-500">· {it.factLabel} · {it.scope}</span>
              </p>
              <Quote text={it.quote} />
              {editing === it.id ? (
                <Corrector value={draft} onChange={setDraft} onSave={() => mineAct(it, "correct", draft)} onCancel={() => setEditing(null)} busy={busy === it.id} />
              ) : note[it.id] ? null : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn primary disabled={!!busy} onClick={() => mineAct(it, "confirm")}>
                    <Icon name="check" size={14} />
                    That&apos;s right
                  </Btn>
                  <Btn disabled={!!busy} onClick={() => (setEditing(it.id), setDraft(it.value))}>
                    <Icon name="pencil" size={14} />
                    Correct
                  </Btn>
                  <Btn ghost disabled={!!busy} onClick={() => mineAct(it, "remove")}>
                    <Icon name="cross" size={14} />
                    Not what I said
                  </Btn>
                </div>
              )}
              <Note n={note[it.id]} />
            </li>
          ))}
          {mine.questions.map((q) => (
            <li key={q.id} className="rounded-2xl border border-[#1463ff]/20 bg-[#f5f8ff] p-4">
              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Icon name="question" size={13} />
                Question · {q.fromName} asks · {when(q.askedAt)}
                {q.caseName ? ` · ${q.caseName}` : ""}
              </p>
              <p className="mt-2 text-sm">
                Is this still right? <span className="text-neutral-500">{q.factLabel}:</span> <b className="font-serif text-lg">{q.value}</b>
              </p>
              {q.quote && <Quote text={`${q.quote} · ${q.source}`} />}
              {!note[q.id] && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn primary disabled={!!busy} onClick={() => answer(q, "correct")}>
                    <Icon name="check" size={14} />
                    Still right
                  </Btn>
                  <Btn disabled={!!busy} onClick={() => answer(q, "wrong")}>
                    <Icon name="cross" size={14} />
                    Wrong
                  </Btn>
                  <Btn ghost disabled={!!busy} onClick={() => answer(q, "not_mine")}>
                    Not my area
                  </Btn>
                </div>
              )}
              <Note n={note[q.id]} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-neutral-100 pt-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium">Your log</h3>
          <span className="text-xs text-neutral-400">Only you see this list</span>
        </div>
        {mine.log.length === 0 && <p className="mt-2 text-sm text-neutral-500">Nothing yet. What you say in meetings, emails and Teams shows up here.</p>}
        <ol className="mt-2 divide-y divide-neutral-100">
          {log.map((it) => {
            const lead =
              it.kind === "said"
                ? "You said"
                : it.kind === "added"
                  ? `You added ${it.speakerName?.split(" ")[0] ?? "a colleague"}'s words`
                  : it.kind === "confirmed"
                    ? it.channel === "agreement"
                      ? "You approved the agreement"
                      : `You confirmed ${it.speakerName?.split(" ")[0] ?? "a source"}`
                    : `You marked ${it.speakerName?.split(" ")[0] ?? "a source"} wrong`;
            const removed = it.state === "removed";
            return (
              <li key={it.id} className={`group py-3 ${removed ? "opacity-55" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3f1ec] text-neutral-600">
                    <Icon name={channelIcon(it.channel)} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <b className={`shrink-0 font-serif text-lg leading-tight ${removed ? "line-through" : ""}`}>{it.value}</b>
                      <span className="truncate text-sm text-neutral-600">{it.factLabel}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-neutral-400">
                      {lead} · {when(it.date)}
                      {removed ? (it.correctedTo ? " · corrected" : " · taken back") : it.isAnswer ? <span className="text-[#0f8a4f]"> · the answer people get</span> : null}
                    </div>
                  </div>
                  {!removed && it.score != null && (
                    <span className="shrink-0 text-sm font-medium tabular-nums" style={{ color: tone(it.score) }}>
                      {pct(it.score)}
                    </span>
                  )}
                  {/* actions show on hover (and always on touch screens), so the list stays calm */}
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    {it.can.correct && (
                      <IconBtn icon="pencil" label="Correct" onClick={() => (setEditing(it.id), setDraft(it.value))} disabled={!!busy} />
                    )}
                    {it.can.remove && <IconBtn icon="cross" label="Remove" onClick={() => mineAct(it, "remove")} disabled={!!busy} />}
                    {it.can.restore && <IconBtn icon="undo" label="Undo" onClick={() => mineAct(it, "restore")} disabled={!!busy} />}
                    {it.can.undo && <IconBtn icon="undo" label="Withdraw" onClick={() => mineAct(it, "undo")} disabled={!!busy} />}
                  </div>
                </div>
                {editing === it.id && (
                  <div className="pl-11">
                    <Corrector value={draft} onChange={setDraft} onSave={() => mineAct(it, "correct", draft)} onCancel={() => setEditing(null)} busy={busy === it.id} />
                  </div>
                )}
                <div className="pl-11">
                  <Note n={note[it.id]} />
                </div>
              </li>
            );
          })}
        </ol>
        {mine.log.length > 4 && (
          <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs text-neutral-500 hover:text-neutral-900">
            {showAll ? "Show less" : `Show all ${mine.log.length}`}
          </button>
        )}
      </div>
    </section>
  );
}

function Meta({ it, lead }: { it: Item; lead: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-neutral-500">
      <Icon name={channelIcon(it.channel)} size={13} />
      {CHANNEL[it.channel] ?? it.channel} · {lead} · {when(it.date)}
    </p>
  );
}

function Quote({ text }: { text: string }) {
  if (!text) return null;
  return <p className="mt-1 text-xs italic text-neutral-600">“{text.length > 180 ? `${text.slice(0, 179)}…` : text}”</p>;
}

function Note({ n }: { n?: { text: string; good: boolean } }) {
  if (!n) return null;
  return <p className={`mt-2 text-xs ${n.good ? "text-[#0f8a4f]" : "text-[#c0392b]"}`}>{n.text}</p>;
}

function Btn({ children, onClick, disabled, primary, ghost }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; ghost?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97] disabled:opacity-50 ${
        primary ? "bg-[#1463ff] text-white hover:bg-[#0f52d9]" : ghost ? "text-neutral-500 hover:text-neutral-900" : "bg-white text-neutral-700 ring-1 ring-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

function IconBtn({ icon, label, onClick, disabled }: { icon: "pencil" | "cross" | "undo"; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-[#1463ff] disabled:opacity-40">
      <Icon name={icon} size={15} />
    </button>
  );
}

function Corrector({ value, onChange, onSave, onCancel, busy }: { value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={60}
        aria-label="Corrected value"
        className="w-32 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:border-[#1463ff] focus:outline-none"
      />
      <button type="submit" disabled={busy} className="rounded-full bg-[#1463ff] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        Save
      </button>
      <button type="button" onClick={onCancel} className="text-sm text-neutral-500">
        Cancel
      </button>
    </form>
  );
}

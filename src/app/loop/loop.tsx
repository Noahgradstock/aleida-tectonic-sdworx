"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Blob from "../blob";
import { channelIcon, Icon, type IconName } from "../icons";
import YourInbox from "./inbox";
import { Checker } from "../trust-visuals";
import { CopilotLogo, DocsLogo, OutlookLogo, TeamsLogo } from "../logos";
import { ago, CHANNEL, color, Meter, pct, type Client, type Entry, type Me } from "./parts";

// What changed today: a feed of everything the mascot heard (meetings, emails, Teams) and what it did
// to the answers, across all topics, newest first. Your own inbox sits on the left.
// Normally the mascot feeds the brain by itself; you can also paste something in to try it.

const DEMO: Record<"meeting" | "teams" | "email", string> = {
  meeting: [
    "Jan Wouters: For Brouwerij De Kroon we agreed 22 holiday days, two extra on top of the law.",
    "Sofie Maes: Good, I'll put that in the payroll file.",
    "Tom Claes: I think everyone gets 25 days of holiday now.",
  ].join("\n"),
  teams: "Reminder for the team: a full-time employee in a five-day week gets 20 days of annual leave.",
  email: "Dear client, your employees are entitled to 24 days of annual leave this year.",
};
const TAB: Record<keyof typeof DEMO | "document", { label: string; from: string; logo: React.ReactNode }> = {
  meeting: { label: "Meeting", from: "Copilot transcript", logo: <CopilotLogo /> },
  teams: { label: "Teams", from: "Chat message", logo: <TeamsLogo /> },
  email: { label: "Email", from: "Outlook or Gmail", logo: <OutlookLogo /> },
  document: { label: "Document", from: "Agreement or policy", logo: <DocsLogo /> },
};
const DEMO_AGREEMENT = `SERVICE AGREEMENT – PAYROLL (fictional, for the demo)
Between Brouwerij De Kroon NV and SD Worx Belgium.

Article 1. This agreement sets the payroll terms for Brouwerij De Kroon from 1 November 2026.
Article 2. Full-time employees of Brouwerij De Kroon get 22 days of annual leave, two more than the legal minimum.
Article 3. The employer contribution to meal vouchers is €8.91 per working day.

Signed on 3 October 2026 by Pieter Claes, HR manager, Brouwerij De Kroon NV, and Anna De Smet, SD Worx.`;
type Mode = keyof typeof DEMO | "document";
type DocResult = { title: string; checks: { ok: boolean; label: string }[]; changes: string[] };

const POLL_MS = 5000;

const KIND_ICON: Record<Entry["kind"], IconName> = {
  learned: "meeting",
  confirmed: "check",
  rejected: "cross",
  outdated: "clock",
  removed: "undo",
  corrected: "pencil",
  restored: "undo",
};

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

export default function Loop({ howItWorks }: { howItWorks?: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [show, setShow] = useState<"all" | "heard" | "confirmed" | "changed">("all"); // filter for the log
  const [feeding, setFeeding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((r) => setMe(r.user)).catch(() => {});
    api<{ people: { id: string; name: string }[]; clients: Client[] }>("/api/trust/meta")
      .then((m) => {
        setPeople(Object.fromEntries(m.people.map((p) => [p.id, p.name])));
        setClients(Object.fromEntries(m.clients.map((c) => [c.id, c])));
      })
      .catch(() => {});
  }, []);

  // New entries since the last look glow once, so something the mascot just heard is easy to spot.
  const load = useCallback(async () => {
    try {
      const r = await api<{ entries: Entry[] }>("/api/brain/ledger");
      const ids = new Set(r.entries.map((e) => e.id));
      if (seen.current) {
        const added = r.entries.filter((e) => !seen.current!.has(e.id));
        setFresh(new Set(added.map((e) => e.id)));
        // Something new came in: open it, so the six checks can be seen ticking off.
        if (added[0]) setOpen(added[0].id);
      }
      seen.current = ids;
      setEntries(r.entries);
      setNow(Date.now());
    } catch {
      /* the next poll tries again */
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    const t = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const name = (id: string | null) => (id ? (people[id] ?? id) : "Someone");
  const scopeName = (e: Entry) => (e.scope.client ? (clients[e.scope.client]?.name ?? e.scope.client) : [e.scope.country, e.scope.pc && `PC ${e.scope.pc}`].filter(Boolean).join(", "));

  // A meeting claim waits for its speaker until confirmed, taken back or corrected.
  const state = useMemo(() => {
    const list = entries ?? [];
    const takenBack = new Set<string>();
    const confirmed = new Set<string>();
    for (const e of [...list].reverse()) {
      if (e.kind === "removed") takenBack.add(e.claimId);
      if (e.kind === "corrected" && e.replaces) takenBack.add(e.replaces);
      if (e.kind === "restored") takenBack.delete(e.claimId);
      if (e.kind === "confirmed" && e.claimScore.after >= 0.75) confirmed.add(e.claimId);
    }
    const waiting = (e: Entry) =>
      e.kind === "learned" &&
      (e.channel === "meeting" || e.channel === "agreement") &&
      !takenBack.has(e.claimId) &&
      !confirmed.has(e.claimId) &&
      e.caps.some((c) => c.includes("not confirmed yet") || c.includes("not approved"));
    return { takenBack, waiting };
  }, [entries]);

  const today = new Date(now || 0).toDateString();
  const KIND_GROUP: Record<Entry["kind"], "heard" | "confirmed" | "changed"> = {
    learned: "heard",
    confirmed: "confirmed",
    rejected: "changed",
    outdated: "changed",
    removed: "changed",
    corrected: "changed",
    restored: "changed",
  };
  const listed = (entries ?? []).filter((e) => show === "all" || KIND_GROUP[e.kind] === show);
  const todays = listed.filter((e) => new Date(e.at).toDateString() === today);
  const earlier = listed.filter((e) => new Date(e.at).toDateString() !== today);
  const heard = todays.filter((e) => e.kind === "learned").length;
  const waitingCount = (entries ?? []).filter(state.waiting).length;

  // Plain render functions (not components), so cards are not remounted on every poll.
  function feedGroup(title: string, items: Entry[]) {
    if (!items.length) return null;
    return (
      <div className="mb-8">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-neutral-500">{title}</h3>
        <ol className="space-y-3">
          {items.map((e) => feedCard(e))}
        </ol>
      </div>
    );
  }

  function feedCard(e: Entry) {
    const waiting = state.waiting(e);
    const gone = state.takenBack.has(e.claimId) && e.kind === "learned";
    const a = e.answer;
    const changed = a.before.value !== a.after.value;
    const expanded = open === e.id;
    const isFresh = fresh.has(e.id);
    const headline =
      e.kind === "learned"
        ? e.channel === "agreement"
          ? "Read in a client agreement"
          : `Heard in ${CHANNEL[e.channel] ?? e.channel}`
        : e.kind === "confirmed"
          ? e.channel === "agreement"
            ? `${name(e.actor)} approved the agreement`
            : `${name(e.actor)} confirmed it`
          : e.kind === "rejected"
            ? `${name(e.actor)} marked it wrong`
            : e.kind === "corrected"
              ? `${name(e.actor)} corrected it`
              : e.kind === "removed"
                ? `${name(e.actor)} took it back`
                : e.kind === "restored"
                  ? `${name(e.actor)} put it back`
                  : `${name(e.actor)} marked it outdated`;
    const icon: IconName = e.kind === "learned" ? channelIcon(e.channel) : KIND_ICON[e.kind];

    return (
      <li key={e.id} className={`rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-5 ${isFresh ? "ring-2 ring-[#3DBE9A]/60" : ""} ${gone ? "opacity-60" : ""}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3f1ec] text-neutral-700">
            <Icon name={icon} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium text-neutral-900">{headline}</div>
            <div className="text-xs text-neutral-400">
              {e.kind === "learned" && e.channel === "agreement" ? `uploaded by ${name(e.actor)} · ` : e.kind === "learned" && e.actor !== e.speaker ? `via ${name(e.actor)} · ` : ""}
              {new Date(e.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {ago(e.at, now)} · {scopeName(e)}
            </div>
          </div>
          {waiting && <Pill tone="amber">{e.channel === "agreement" ? "Waiting for approval" : `${name(e.speaker).split(" ")[0]} can check`}</Pill>}
          {gone && <Pill tone="gray">Taken back</Pill>}
        </div>

        {e.kind === "learned" && (
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-800">
            <span className="font-medium">{e.channel === "agreement" ? (e.source ?? "Agreement") : name(e.speaker).split(" ")[0]}:</span> “{e.quote}”
          </p>
        )}

        {/* the result, as one line: what the answer is now, and how far this claim is trusted */}
        <div className="mt-3 rounded-xl bg-[#fbfaf7] px-4 py-3">
          <div className="text-xs text-neutral-500">{e.factLabel}</div>
          <div className="mt-0.5 flex items-baseline justify-between gap-3">
            {changed ? (
              <span className="font-serif text-2xl leading-tight">
                <span className="text-neutral-400 line-through">{a.before.value ?? "nothing"}</span>
                <Icon name="arrow" size={16} className="mx-2 inline align-[-1px] text-neutral-400" />
                <span className="text-[#0f8a4f]">{a.after.value}</span>
              </span>
            ) : (
              <span className="font-serif text-2xl leading-tight text-neutral-800">
                Still {a.after.value ?? "no answer"}
              </span>
            )}
            <span className="shrink-0 text-sm text-neutral-500">
              this claim <b className="font-medium tabular-nums" style={{ color: color(e.claimScore.after) }}>{pct(e.claimScore.after)}</b>
            </span>
          </div>
          <div className="mt-2">
            <Meter from={e.claimScore.before} to={e.claimScore.after} animate={isFresh} cap={waiting ? 0.5 : null} />
          </div>
        </div>

        <button onClick={() => setOpen(expanded ? null : e.id)} className="mt-3 flex items-center gap-1 text-xs font-medium text-[#1463ff] hover:underline" aria-expanded={expanded}>
          <Icon name="chevron" size={12} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          {expanded ? "Hide the checks" : "Why: see the six checks"}
        </button>
        {expanded && (
          <div className="mt-2 rounded-xl bg-[#fbfaf7] p-3">
            {e.explain && <p className="text-sm text-neutral-800">{e.explain}</p>}
            <div className="mt-3 rounded-lg bg-white p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-neutral-400">The six checks</p>
              <Checker evidence={e.evidence} score={e.claimScore.after} caps={e.caps} animate={isFresh} compact />
            </div>
            <div className="mt-3 flex gap-4 text-xs font-medium">
              <Link href="/" className="text-[#1463ff] hover:underline">
                Ask about it
              </Link>
              <Link href="/brain" className="text-[#1463ff] hover:underline">
                See it in the Brain
              </Link>
            </div>
          </div>
        )}
        {me && waiting && e.channel !== "agreement" && e.speaker === me.id && <p className="mt-2 text-xs text-[#9a6400]">This is yours. It counts after a day by itself; change it under “For you” if it is wrong.</p>}
      </li>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:pt-12">
      <header className="flex flex-wrap items-center gap-5">
        <Blob size={72} mood={waitingCount ? "thinking" : "listening"} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">What changed today</h1>
          <p className="mt-1 text-[15px] text-neutral-600">Meetings, emails and Teams keep the answers current. Check what was heard and confirm what&apos;s yours.</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3DBE9A] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3DBE9A]" />
            </span>
            Jef is listening · heard {heard} thing{heard === 1 ? "" : "s"} today
            {waitingCount ? ` · ${waitingCount} waiting for a confirmation` : ""}
          </p>
        </div>
        <button
          onClick={() => setFeeding(true)}
          className="group flex items-center gap-2.5 rounded-full bg-[#161616] py-1.5 pl-1.5 pr-4 text-sm font-medium text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition hover:bg-black"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
            <Icon name="upload" size={14} />
          </span>
          Import
        </button>
      </header>

      {howItWorks && <div className="mt-8 max-w-6xl">{howItWorks}</div>}

      {toast && (
        <p role="status" className="mt-4 rounded-xl bg-[#eef7f1] px-4 py-2 text-sm text-[#0f8a4f]">
          {toast}
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 self-start">
          <YourInbox onChange={() => void load()} />
        </div>

        <section className="min-w-0" aria-label="What the brain heard">
          {entries === null ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="font-serif text-2xl">Nothing heard yet</p>
              <p className="mt-2 text-sm text-neutral-500">When Jef hears a meeting, an email or a Teams message, it shows up here with what it changed.</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="font-serif text-3xl">The log</h2>
                <p className="mt-1 text-sm text-neutral-500">Everything the brain heard and every change it made, newest first. Open “Why” to trace any answer back.</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs" role="tablist" aria-label="Show">
                  {(
                    [
                      ["all", "All"],
                      ["heard", "Heard"],
                      ["confirmed", "Confirmed"],
                      ["changed", "Corrected or taken back"],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={show === k}
                      onClick={() => setShow(k)}
                      className={`rounded-full px-3 py-1 ${show === k ? "bg-[#161616] text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-400"}`}
                    >
                      {label} {k === "all" ? (entries?.length ?? 0) : (entries ?? []).filter((e) => KIND_GROUP[e.kind] === k).length}
                    </button>
                  ))}
                </div>
              </div>
              {feedGroup("Today", todays)}
              {feedGroup("Earlier", earlier)}
              {listed.length === 0 && <p className="text-sm text-neutral-500">Nothing of this kind yet.</p>}
            </>
          )}
        </section>
      </div>

      {feeding && (
        <Feeder
          onClose={() => setFeeding(false)}
          onDone={(msg) => {
            setFeeding(false);
            setToast(msg);
            setTimeout(() => setToast(null), 6000);
            void load();
          }}
        />
      )}
    </main>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "amber" | "gray" }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone === "amber" ? "bg-[#fff4e0] text-[#9a6400]" : "bg-neutral-100 text-neutral-500"}`}>{children}</span>;
}

// Paste a transcript, an email or a message yourself. Normally the mascot does this in the background.
function Feeder({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [channel, setChannel] = useState<Mode>("meeting");
  const [text, setText] = useState(DEMO.meeting);
  const [title, setTitle] = useState("Service agreement Brouwerij De Kroon 2026");
  const [result, setResult] = useState<DocResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function feed() {
    setBusy(true);
    setError(null);
    if (channel === "document") {
      try {
        const r = await api<{ doc: DocResult }>("/api/brain/documents", { title, text });
        setResult(r.doc);
      } catch (e) {
        setError((e as Error).message);
      }
      setBusy(false);
      return;
    }
    try {
      const r = await api<{ learned: Entry[]; skipped: { sentence: string; reason: string }[] }>("/api/brain/ingest", { channel, text, context: { country: "BE", pc: "200" } });
      onDone(`Learned ${r.learned.length} statement${r.learned.length === 1 ? "" : "s"}${r.skipped.length ? `, ignored ${r.skipped.length} (${r.skipped[0].reason.toLowerCase()})` : ""}.`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const pick = (c: Mode) => {
    setChannel(c);
    setText(c === "document" ? DEMO_AGREEMENT : DEMO[c]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Import" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 px-6 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#161616] text-white">
              <Icon name="upload" size={18} />
            </span>
            <h2 className="font-serif text-3xl leading-none">Import</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
            <Icon name="cross" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Source">
            {(Object.keys(TAB) as Mode[]).map((c) => {
              const on = c === channel;
              return (
                <button
                  key={c}
                  role="radio"
                  aria-checked={on}
                  onClick={() => pick(c)}
                  className={`relative flex flex-col items-start gap-2 rounded-2xl p-3 text-left transition ${on ? "bg-white ring-2 ring-[#161616]" : "bg-[#f6f5f2] ring-1 ring-transparent hover:ring-neutral-300"}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] [&_svg]:h-5 [&_svg]:w-5">{TAB[c].logo}</span>
                  <span>
                    <span className="block text-sm font-medium text-neutral-900">{TAB[c].label}</span>
                    <span className="block text-[11px] text-neutral-500">{TAB[c].from}</span>
                  </span>
                  {on && (
                    <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#161616] text-white">
                      <Icon name="check" size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {channel === "document" && !result && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-neutral-200 px-3 py-2 focus-within:border-neutral-400">
                <Icon name="document" size={14} className="text-neutral-400" />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  aria-label="Document title"
                  className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-full bg-[#f6f5f2] px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200">
                <Icon name="upload" size={14} />
                Upload a file
                <input
                  type="file"
                  accept=".txt,.md,.eml,text/plain"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 20_000) return setError("That file is too large for the demo");
                    setText(await f.text());
                    setTitle(f.name.replace(/\.[a-z]+$/i, ""));
                  }}
                />
              </label>
            </div>
          )}

          {result ? (
            <div className="mt-4 rounded-2xl bg-[#fbfaf7] p-4 ring-1 ring-neutral-200">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Icon name="document" size={14} className="text-neutral-400" />
                {result.title}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {result.checks.map((c) => (
                  <li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-[#0f8a4f]" : "text-[#9a6400]"}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${c.ok ? "bg-[#e6f4ec]" : "bg-[#fff4e0]"}`}>
                      <Icon name={c.ok ? "check" : "cross"} size={12} />
                    </span>
                    {c.label}
                  </li>
                ))}
              </ul>
              {result.changes.length > 0 && (
                <ul className="mt-3 space-y-0.5 border-t border-neutral-200 pt-2 text-xs text-neutral-600">
                  {result.changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
                <Icon name="clock" size={12} />
                Waits for an expert on this client to approve it. Until then it counts for at most 50%.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-[#fbfaf7] focus-within:border-neutral-400">
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Icon name={channelIcon(channel)} size={13} />
                  {TAB[channel].from}
                </span>
                <span className="tabular-nums">{text.length.toLocaleString("en")} / 6,000</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={6000}
                rows={7}
                aria-label="Text to import"
                className="block w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed focus:outline-none"
              />
            </div>
          )}

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-[#c0392b]">
              <Icon name="cross" size={14} />
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
              Cancel
            </button>
            {result ? (
              <button onClick={() => onDone(`Read "${result.title}": waiting for an expert to approve it.`)} className="flex items-center gap-2 rounded-full bg-[#161616] px-5 py-2 text-sm font-medium text-white hover:bg-black">
                <Icon name="check" size={14} />
                Done
              </button>
            ) : (
              <button onClick={feed} disabled={busy || !text.trim()} className="flex items-center gap-2 rounded-full bg-[#161616] px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-40">
                {busy ? "Reading…" : channel === "document" ? "Read the document" : "Feed to the brain"}
                {!busy && <Icon name="arrow" size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

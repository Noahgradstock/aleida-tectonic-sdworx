"use client";

import { ForecastLine } from "../trust-visuals";
import YourInbox from "./inbox";
import { useCallback, useEffect, useState } from "react";
import {
  ago,
  CHANNEL,
  color,
  Contacts,
  CountUp,
  country,
  Delta,
  History,
  LedgerRow,
  Meter,
  pct,
  possessive,
  statusWord,
  tone,
  waitsForConfirm,
  capOf,
  type Answer,
  type Client,
  type Ctx,
  type Entry,
  type Me,
  type Scope,
  type Snapshot,
} from "./parts";

// The live loop: everyday work goes in (a meeting, a Teams message, an email), the brain learns,
// and every score change is logged with the exact points that moved it.

const CASES: { label: string; ctx: Ctx }[] = [
  { label: "Brouwerij De Kroon (BE, PC 200)", ctx: { client: "brouwerij-de-kroon" } },
  { label: "Belgium, PC 200", ctx: { country: "BE", pc: "200" } },
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
const CHANNEL_TAB: Record<keyof typeof DEMO, string> = { meeting: "Meeting transcript", teams: "Teams message", email: "Email draft" };

const POLL_MS = 6000;

type View = { key: string; answer: Answer | null; entries: Entry[]; fresh: string[] };

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

const sameSnap = (a: Snapshot, b: Snapshot) => a.value === b.value && a.status === b.status && Math.round((a.score ?? -1) * 100) === Math.round((b.score ?? -1) * 100);

// What a person did, in words: for the freshness line and "What changed".
const DID: Record<Entry["kind"], string> = {
  learned: "added it",
  confirmed: "confirmed it",
  rejected: "marked it wrong",
  outdated: "marked it outdated",
  removed: "took it back",
  corrected: "corrected it",
  restored: "put it back",
};
const DID_VALUE: Record<Entry["kind"], (v: string) => string> = {
  learned: (v) => `added ${v}`,
  confirmed: (v) => `confirmed ${v}`,
  rejected: (v) => `marked ${v} wrong`,
  outdated: (v) => `marked ${v} outdated`,
  removed: (v) => `took back ${v}`,
  corrected: (v) => `corrected it to ${v}`,
  restored: (v) => `put ${v} back`,
};

export default function Loop() {
  const [me, setMe] = useState<Me | null>(null);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [facts, setFacts] = useState<{ key: string; label: string }[]>([]);
  const [caseIdx, setCaseIdx] = useState(0);
  const [factKey, setFactKey] = useState("annual-leave-days");
  const [channel, setChannel] = useState<keyof typeof DEMO>("meeting");
  const [text, setText] = useState(DEMO.meeting);
  const [busy, setBusy] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fed, setFed] = useState<{ learned: Entry[]; skipped: { sentence: string; reason: string }[] } | null>(null);
  const [view, setView] = useState<View>({ key: "", answer: null, entries: [], fresh: [] });
  const [now, setNow] = useState(0);

  const ctx = CASES[caseIdx].ctx;

  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((r) => setMe(r.user)).catch(() => {});
    api<{ people: { id: string; name: string }[]; clients: Client[]; facts: { key: string; label: string }[] }>("/api/trust/meta")
      .then((m) => {
        setPeople(Object.fromEntries(m.people.map((p) => [p.id, p.name])));
        setClients(Object.fromEntries((m.clients ?? []).map((c) => [c.id, c])));
        setFacts(m.facts);
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(
    async (quiet = false) => {
      const key = `${factKey}|${caseIdx}`;
      try {
        const label = facts.find((f) => f.key === factKey)?.label ?? factKey;
        const [a, l] = await Promise.all([
          api<Answer>("/api/trust/ask", { question: label, context: CASES[caseIdx].ctx, factKey }),
          api<{ entries: Entry[] }>(`/api/brain/ledger?fact=${encodeURIComponent(factKey)}`),
        ]);
        setNow(Date.now());
        // Remember which ledger entries arrived since the last look: those play the score animation once.
        setView((v) => {
          const firstLoad = v.key !== key;
          const old = new Set(v.entries.map((e) => e.id));
          const added = l.entries.filter((e) => !old.has(e.id)).map((e) => e.id);
          return { key, answer: a, entries: l.entries, fresh: firstLoad ? l.entries.slice(0, 1).map((e) => e.id) : [...v.fresh, ...added] };
        });
      } catch (e) {
        if (!quiet) setError((e as Error).message);
      }
    },
    [factKey, facts, caseIdx],
  );

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
    // Changes made elsewhere (Jan confirming from his own laptop) show up here on their own.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, POLL_MS);
    return () => clearInterval(t);
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
    setVoting(true);
    try {
      await api("/api/trust/feedback", { claimId: entry.claimId, kind, context: entry.scope.client ? { client: entry.scope.client } : entry.scope });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVoting(false);
    }
  }

  const name = (id: string | null) => (id ? (people[id] ?? id) : "Unknown speaker");
  const canConfirm = (e: Entry) => !!me && (me.id === e.speaker || me.role === "expert");
  const scopeLabel = (sc: Scope) => (sc.client ? (clients[sc.client]?.name ?? sc.client) : `${country(sc.country)}${sc.pc ? `, PC ${sc.pc}` : ""}`);
  const caseName = ctx.client ? (clients[ctx.client]?.name ?? CASES[caseIdx].label) : CASES[caseIdx].label;

  // Which ledger entries are about this case. Exact scope for the history (its snapshots are per scope);
  // broader rules count too when asking "does something still wait for a confirmation here?".
  const here = ctx.client ? clients[ctx.client] : undefined;
  const ctxCountry = here?.country ?? ctx.country ?? "BE";
  const ctxPc = here?.pc ?? ctx.pc;
  const sameScope = (sc: Scope) => (ctx.client ? sc.client === ctx.client : !sc.client && sc.country === ctxCountry && (!sc.pc || sc.pc === ctxPc));
  const applies = (sc: Scope) => sameScope(sc) || (!sc.client && sc.country === ctxCountry && (!sc.pc || sc.pc === ctxPc));

  const { answer, entries } = view;
  const fresh = new Set(view.fresh);
  const latestPerClaim = new Map<string, Entry>();
  for (const e of entries) if (!latestPerClaim.has(e.claimId)) latestPerClaim.set(e.claimId, e);
  // Claims their speaker took back or corrected no longer wait for anyone (unless put back later).
  const takenBack = new Set<string>();
  for (const e of [...entries].reverse()) {
    if (e.kind === "removed") takenBack.add(e.claimId);
    if (e.kind === "corrected" && e.replaces) takenBack.add(e.replaces);
    if (e.kind === "restored") takenBack.delete(e.claimId);
  }
  const isPending = (e: Entry) => latestPerClaim.get(e.claimId)?.id === e.id && e.kind !== "rejected" && !takenBack.has(e.claimId) && waitsForConfirm(e.caps);

  const best = answer?.matched ? answer.best : null;
  const current: Snapshot | null = best ? { value: best.claim.value, score: best.score, status: answer?.status ?? "trusted" } : null;
  const latestHere = entries.find((e) => sameScope(e.scope)) ?? entries.find((e) => applies(e.scope)) ?? null;
  const heroFresh = !!latestHere && fresh.has(latestHere.id) && latestHere.answer.after.value === current?.value;
  const pendingHere = [...latestPerClaim.values()].filter((e) => isPending(e) && applies(e.scope) && e.value !== current?.value).slice(0, 2);

  // The answer for this case over time, oldest to newest, without repeats.
  const history: Snapshot[] = [];
  const scoped = entries.filter((e) => sameScope(e.scope)).reverse();
  if (scoped[0]) history.push(scoped[0].answer.before);
  for (const e of scoped) history.push(e.answer.after);
  if (current) history.push(current);
  const steps = history.filter((p, i) => p.value != null && (i === 0 || !sameSnap(p, history[i - 1])));

  const freshness = latestHere
    ? `Last updated ${ago(latestHere.at, now)} from ${CHANNEL[latestHere.channel] ?? latestHere.channel}. ${
        latestHere.kind === "learned"
          ? `${name(latestHere.actor)} added it.`
          : `${name(latestHere.actor)} ${DID[latestHere.kind]}.`
      }`
    : answer?.lastUpdated
      ? `Last updated on ${new Date(answer.lastUpdated.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} from ${answer.lastUpdated.source}${answer.lastUpdated.by ? `, by ${name(answer.lastUpdated.by)}` : ""}.`
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-20 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="max-w-3xl">
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">The brain learns from work that already happens</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
            A meeting, a Teams message or an email goes in. Code pulls out each statement with its exact quote, scores it with six visible rules, and
            logs how every score moved. Something said in a meeting counts for at most 50% until the speaker or an expert confirms it.
          </p>
        </div>
        <p className="rounded-full bg-white/70 px-3 py-1 text-sm text-neutral-600 ring-1 ring-neutral-200">All people, clients and documents are fictional</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-neutral-600">Case</span>
        {CASES.map((c, i) => (
          <button
            key={c.label}
            onClick={() => setCaseIdx(i)}
            aria-pressed={i === caseIdx}
            className={`rounded-full px-3.5 py-1.5 ${i === caseIdx ? "bg-[#161616] text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200 hover:ring-neutral-400"}`}
          >
            {c.label}
          </button>
        ))}
        {me && (
          <span className="ml-auto text-neutral-500">
            Signed in as <span className="text-neutral-800">{me.name}</span>
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#fdecea] px-4 py-2.5 text-sm text-[#c0392b]">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left: everyday work goes in, and your own inbox and log right under it */}
        <div className="min-w-0 space-y-6 self-start">
        <section className="rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-6">
          <h2 className="font-serif text-3xl">Everyday work</h2>
          <div role="group" aria-label="Kind of work" className="mt-3 flex flex-wrap gap-1 text-sm">
            {(Object.keys(DEMO) as (keyof typeof DEMO)[]).map((c) => (
              <button
                key={c}
                aria-pressed={c === channel}
                onClick={() => {
                  setChannel(c);
                  setText(DEMO[c]);
                  setFed(null);
                }}
                className={`rounded-full px-3 py-1 ${c === channel ? "bg-[#161616] text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
              >
                {CHANNEL_TAB[c]}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={8000}
            rows={7}
            aria-label="Text to feed to the brain"
            className="mt-3 w-full resize-y rounded-2xl border border-neutral-200 bg-[#fcfbf9] p-3.5 font-mono text-[13px] leading-relaxed focus:border-neutral-500 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={feed}
              disabled={busy || !text.trim()}
              className="rounded-full bg-[#161616] px-5 py-2.5 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#161616] disabled:opacity-40"
            >
              {busy ? "Learning…" : "Feed to the brain"}
            </button>
            <span className="text-sm text-neutral-500">In the product the desktop mascot does this in the background.</span>
          </div>

          {fed && (
            <div className="mt-5 border-t border-neutral-100 pt-4 text-sm">
              <p className="font-medium">
                Learned {fed.learned.length} {fed.learned.length === 1 ? "statement" : "statements"}, ignored {fed.skipped.length}
              </p>
              <ul className="mt-2 space-y-2">
                {fed.learned.map((e) => {
                  const cap = capOf(e.caps);
                  return (
                    <li key={e.id} className="rounded-xl bg-[#eef7f1] px-3.5 py-2.5">
                      <span className="text-neutral-600">{name(e.speaker)}: </span>“{e.quote}”
                      <span className="mt-1 block text-neutral-700">
                        Learned <b>{e.value}</b> for {scopeLabel(e.scope)}, starts at{" "}
                        <b style={{ color: color(e.claimScore.after) }}>{pct(e.claimScore.after)}</b>
                        {cap != null ? ` (capped until confirmed)` : ""}.
                      </span>
                    </li>
                  );
                })}
                {fed.skipped.map((x, i) => (
                  <li key={i} className="rounded-xl bg-neutral-50 px-3.5 py-2.5 text-neutral-500">
                    “{x.sentence}” <span className="block text-neutral-400">Ignored: {x.reason.charAt(0).toLowerCase() + x.reason.slice(1)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <YourInbox onChange={() => void refresh(true)} />
        </div>

        <div className="min-w-0 space-y-6">
          {/* The answer now */}
          <section className="rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm text-neutral-600">
                The answer now for <span className="font-medium text-neutral-900">{caseName}</span>
              </h2>
              <select
                value={factKey}
                onChange={(e) => setFactKey(e.target.value)}
                aria-label="Topic"
                className="max-w-full rounded-full bg-neutral-100 px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-[#161616]"
              >
                {facts.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {best && current ? (
              <>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <p className="font-serif text-6xl leading-none tracking-tight sm:text-7xl">{best.claim.value}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-6xl leading-none tabular-nums sm:text-7xl" style={{ color: tone(current) }}>
                      <CountUp key={`${latestHere?.id}-${best.score}`} from={latestHere?.answer.before.score ?? best.score} to={best.score} animate={heroFresh} />
                    </p>
                    <p className="mt-1 text-[15px] font-medium" style={{ color: tone(current) }}>
                      {statusWord(current.status)}
                    </p>
                  </div>
                </div>

                {freshness && (
                  <p className="mt-4 flex items-start gap-2 text-[15px] text-neutral-700">
                    <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: tone(current) }} />
                    <span>
                      {freshness} <span className="text-neutral-500">Based on: {best.claim.source.title}.</span>
                    </span>
                  </p>
                )}

                {/* Something waits for one click: the only time this page asks a person for anything. */}
                {pendingHere.map((e) => (
                  <div key={e.id} className="mt-5 rounded-2xl bg-[#fff6e6] p-4 sm:p-5">
                    <p className="text-[15px] leading-relaxed text-neutral-800">
                      <span className="font-medium">{name(e.speaker)}</span> said <span className="font-medium">{e.value}</span> in {CHANNEL[e.channel] ?? e.channel}{" "}
                      {ago(e.at, now)}. Until {e.speaker ? name(e.speaker).split(" ")[0] : "the speaker"} or an expert confirms it, it counts for at most{" "}
                      {pct(capOf(e.caps))}, so the answer stays {best.claim.value}.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {canConfirm(e) ? (
                        <>
                          <button
                            onClick={() => vote(e, "correct")}
                            disabled={voting}
                            className="rounded-full bg-[#161616] px-4 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#161616] disabled:opacity-40"
                          >
                            ✓ Still right
                          </button>
                          <button
                            onClick={() => vote(e, "wrong")}
                            disabled={voting}
                            className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-neutral-300 hover:ring-neutral-500 disabled:opacity-40"
                          >
                            ✗ Wrong
                          </button>
                          <span className="text-sm text-neutral-600">{me?.id === e.speaker ? "You said this." : "You are an expert on this topic."}</span>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-[#9a6400]">Waiting for {name(e.speaker)}. One click from them settles it.</p>
                      )}
                    </div>
                  </div>
                ))}
                {pendingHere.length === 0 && current.status === "conflict" && (
                  <p className="mt-5 rounded-2xl bg-[#fff6e6] p-4 text-[15px] text-neutral-800">Sources disagree on this. Check with the person below before you answer.</p>
                )}

                {/* What just changed: the score moving, in one line */}
                {latestHere && (
                  <div className="mt-6 border-t border-neutral-100 pt-5">
                    <p className="text-[15px] text-neutral-700">
                      What changed {ago(latestHere.at, now)}:{" "}
                      {latestHere.kind === "learned"
                        ? `the brain learned ${latestHere.value} from ${CHANNEL[latestHere.channel] ?? latestHere.channel}.`
                        : `${name(latestHere.actor)} ${DID_VALUE[latestHere.kind](latestHere.value)}.`}
                    </p>
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
                      <span className="col-span-2 text-sm text-neutral-600">
                        {latestHere.speaker ? `${possessive(name(latestHere.speaker))} claim` : "The claim"}, {latestHere.value}
                      </span>
                      <Meter key={latestHere.id} from={latestHere.claimScore.before} to={latestHere.claimScore.after} animate={fresh.has(latestHere.id)} cap={capOf(latestHere.caps)} tall />
                      <span className="flex items-center gap-3">
                        <span className="text-base tabular-nums text-neutral-500">{latestHere.claimScore.before == null ? "new" : pct(latestHere.claimScore.before)} →</span>
                        <span className="min-w-[3ch] text-right font-serif text-4xl tabular-nums leading-none" style={{ color: color(latestHere.claimScore.after) }}>
                          <CountUp key={latestHere.id} from={latestHere.claimScore.before ?? 0} to={latestHere.claimScore.after} animate={fresh.has(latestHere.id)} />
                        </span>
                        <Delta key={latestHere.id} from={latestHere.claimScore.before} to={latestHere.claimScore.after} animate={fresh.has(latestHere.id)} big />
                      </span>
                    </div>
                    {latestHere.answer.before.value !== latestHere.answer.after.value && (
                      <p className="mt-3 text-[15px] text-neutral-700">
                        The answer changed from <span className="line-through decoration-neutral-400">{latestHere.answer.before.value ?? "nothing"}</span> to{" "}
                        <span className="font-semibold" style={{ color: tone(latestHere.answer.after) }}>
                          {latestHere.answer.after.value}
                        </span>
                        .
                      </p>
                    )}
                  </div>
                )}

                {steps.length > 1 && <History points={steps} label={`How this answer changed, oldest to newest. Dashed line: 75%, the bar for trusted.`} />}
                {/* …and where it goes next: the same rules run forward in time */}
                {answer?.forecast && (
                  <div className="mt-6 border-t border-neutral-100 pt-5">
                    <ForecastLine forecast={answer.forecast} />
                  </div>
                )}
              </>
            ) : (
              <p className="mt-4 text-[15px] text-neutral-500">Nothing in the brain applies to this case yet. Feed it a meeting, a message or an email.</p>
            )}
          </section>

          {/* Who to contact */}
          {best && answer?.contacts && (
            <section className="rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-6">
              <h2 className="font-serif text-3xl">Who to contact</h2>
              <p className="mt-1 text-sm text-neutral-500">Ranked on who was right before on this topic, how recently they dealt with it, and whether it was about this country.</p>
              <Contacts ranked={answer.contacts.ranked} setAside={answer.contacts.setAside} me={me} />
            </section>
          )}

          {/* The ledger */}
          <section className="rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-6">
            <h2 className="font-serif text-3xl">Why the score moved</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Every change on this topic, newest first. Each chip is one rule and the points it added or took away.
            </p>
            {entries.length === 0 ? (
              <p className="mt-4 text-[15px] text-neutral-500">No changes yet. Feed something to the brain.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {entries.map((e, i) => (
                  <LedgerRow key={e.id} e={e} name={name} scopeLabel={scopeLabel} latest={i === 0} fresh={fresh.has(e.id)} pending={isPending(e)} now={now} />
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

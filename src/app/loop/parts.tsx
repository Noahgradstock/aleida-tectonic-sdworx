"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Contact, Evidence } from "@/trust-engine";
import s from "./loop.module.css";

// Shared types, helpers and the small visual pieces of the live loop page.

export type Ctx = { client?: string; country?: string; pc?: string };
export type Me = { id: string; name: string; role: string };
export type Snapshot = { value: string | null; score: number | null; status: string };
export type Scope = { country: string; pc?: string; client?: string };
export type Entry = {
  id: string;
  at: string;
  kind: "learned" | "confirmed" | "rejected" | "outdated" | "removed" | "corrected" | "restored";
  actor: string;
  channel: string;
  factKey: string;
  factLabel: string;
  claimId: string;
  value: string;
  quote: string;
  speaker: string | null;
  scope: Scope;
  claimScore: { before: number | null; after: number };
  answer: { before: Snapshot; after: Snapshot };
  evidence: Evidence[];
  caps: string[];
  explain?: string; // older entries have none
  replaces?: string; // a correction: the claim it took the place of
};
export type SetAside = { person: { id: string; name: string }; reason: string };
export type Answer = {
  matched: boolean;
  fact?: { key: string; label: string };
  status?: string;
  best?: { claim: { value: string; source: { title: string; type?: string } }; score: number } | null;
  contacts?: { ranked: Contact[]; setAside: SetAside[] };
  lastUpdated?: { date: string; source: string; by: string | null } | null;
  forecast?: import("@/trust-engine").Forecast;
};
export type Client = { id: string; name: string; country: string; pc?: string };

export const GREEN = "#0f8a4f";
export const AMBER = "#9a6400";
export const RED = "#c0392b";
const GRAY = "#a3a3a3";

export const color = (n: number | null | undefined) => (n == null ? GRAY : n >= 0.75 ? GREEN : n >= 0.5 ? AMBER : RED);
export const pct = (n: number | null | undefined) => (n == null ? "–" : `${Math.round(n * 100)}%`);

// An answer can score high and still not be safe to use: a conflict or a stale source turns it amber.
export const tone = (a: Snapshot) => (a.score == null ? GRAY : a.status === "trusted" ? color(a.score) : a.status === "orphan" ? RED : AMBER);
export const STATUS: Record<string, string> = {
  trusted: "Trusted",
  conflict: "Sources disagree",
  stale: "May be out of date",
  orphan: "No expert backs it",
};
export const statusWord = (st: string | undefined) => (st ? (STATUS[st] ?? st) : "");

export const CHANNEL: Record<string, string> = {
  meeting: "a meeting",
  teams: "a Teams message",
  email: "an email",
  official: "an official notice",
  sharepoint: "a document",
};
const COUNTRY: Record<string, string> = { BE: "Belgium", DE: "Germany", NL: "the Netherlands", FR: "France" };
export const country = (c: string) => COUNTRY[c] ?? c;

export function ago(iso: string, now: number) {
  const sec = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (sec < 45) return "just now";
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`;
  return `on ${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

export const capOf = (caps: string[]) => {
  const m = caps.map((c) => /Capped at (\d+)%/.exec(c)).find(Boolean);
  return m ? Number(m[1]) / 100 : null;
};
export const waitsForConfirm = (caps: string[]) => caps.some((c) => c.includes("not confirmed yet"));

const firstName = (n: string) => n.split(" ")[0];
export const possessive = (n: string) => `${firstName(n)}${firstName(n).endsWith("s") ? "’" : "’s"}`;

// ——— Motion ———

const DELAY = 250;
const DURATION = 1200;
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/** A percentage that counts from `from` to `to` once, in step with the growing bar. */
export function CountUp({ from, to, animate }: { from: number; to: number; animate: boolean }) {
  const [v, setV] = useState(animate ? from : to);
  useEffect(() => {
    if (!animate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t0 = 0;
    const step = (t: number) => {
      if (!t0) t0 = t;
      const p = reduce ? 1 : Math.min(1, Math.max(0, (t - t0 - DELAY) / DURATION));
      setV(from + (to - from) * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, animate]);
  return <>{Math.round((animate ? v : to) * 100)}%</>;
}

/** A score bar: grey ghost of the old score, a tick where it was, the new fill, and an optional cap line. */
export function Meter({ from, to, animate, cap, tall }: { from: number | null; to: number; animate: boolean; cap?: number | null; tall?: boolean }) {
  const moved = from != null && Math.round(from * 100) !== Math.round(to * 100);
  const fill = { width: `${to * 100}%`, background: color(to), "--from": `${(from ?? 0) * 100}%`, "--to": `${to * 100}%` } as CSSProperties;
  return (
    <span className={`relative block w-full rounded-full bg-neutral-200/70 ${tall ? "h-3.5" : "h-2"}`}>
      {moved && <span className="absolute inset-y-0 left-0 rounded-full bg-neutral-300" style={{ width: `${from * 100}%` }} />}
      <span className={`absolute inset-y-0 left-0 rounded-full ${animate ? s.grow : ""}`} style={fill} />
      {moved && <span className="absolute -inset-y-1 w-0.5 rounded bg-neutral-500" style={{ left: `calc(${from * 100}% - 1px)` }} title={`Was ${pct(from)}`} />}
      {cap != null && (
        <span className="absolute -inset-y-1.5 border-l-2 border-dashed" style={{ left: `${cap * 100}%`, borderColor: AMBER }} title={`Capped at ${pct(cap)}`} />
      )}
    </span>
  );
}

/** "+48 pts" in green, "−20 pts" in red, "No change" in grey. Lands after the bar has grown. */
export function Delta({ from, to, animate, big }: { from: number | null; to: number; animate: boolean; big?: boolean }) {
  const size = big ? "px-3 py-1 text-base" : "px-2.5 py-0.5 text-sm";
  if (from == null) return <span className={`${animate ? s.land : ""} inline-block shrink-0 rounded-full bg-neutral-100 font-medium text-neutral-700 ${size}`}>New</span>;
  const d = Math.round((to - from) * 100);
  const cls = d > 0 ? "bg-[#e3f3e9] text-[#0f8a4f]" : d < 0 ? "bg-[#fbe3e0] text-[#c0392b]" : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`${animate ? s.land : ""} inline-block shrink-0 rounded-full font-semibold tabular-nums ${cls} ${size}`}>
      {d === 0 ? "No change" : `${d > 0 ? "+" : "−"}${Math.abs(d)} pts`}
    </span>
  );
}

// ——— Score history ———

/** The answer for this case over time, oldest to newest: a step line coloured by how safe it was to use. */
export function History({ points, label }: { points: Snapshot[]; label: string }) {
  const n = points.length;
  if (n === 0) return null;
  const H = 40;
  const y = (sc: number | null) => 6 + (1 - (sc ?? 0)) * (H - 12);
  return (
    <figure className="mt-6">
      <figcaption className="text-sm text-neutral-600">{label}</figcaption>
      <svg viewBox={`0 0 ${n * 100} ${H}`} preserveAspectRatio="none" className="mt-2 block h-10 w-full" role="img" aria-label={points.map((p) => `${p.value ?? "no answer"} ${pct(p.score)}`).join(", then ")}>
        <line x1="0" x2={n * 100} y1={y(0.75)} y2={y(0.75)} stroke="#d4d4d4" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <g key={i}>
            {i > 0 && <line x1={i * 100} x2={i * 100} y1={y(points[i - 1].score)} y2={y(p.score)} stroke="#c4c4c4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
            <line x1={i * 100} x2={(i + 1) * 100} y1={y(p.score)} y2={y(p.score)} stroke={tone(p)} strokeWidth={i === n - 1 ? 4 : 3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
      <ol className="mt-1.5 grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {points.map((p, i) => {
          const changed = i === 0 || p.value !== points[i - 1].value || p.status !== points[i - 1].status;
          return (
            <li key={i} className={`min-w-0 text-xs leading-snug ${i === n - 1 ? "text-neutral-900" : "text-neutral-500"}`}>
              {changed ? (
                <>
                  <span className="block truncate font-medium" style={{ color: i === n - 1 ? tone(p) : undefined }}>
                    {p.value ?? "No answer"} {pct(p.score)}
                  </span>
                  <span className="block truncate">{i === n - 1 ? `Now: ${statusWord(p.status).toLowerCase()}` : statusWord(p.status)}</span>
                </>
              ) : (
                <span className="block truncate">{i === n - 1 ? "Now" : ""} {pct(p.score)}</span>
              )}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

// ——— Who to contact ———

export function Contacts({ ranked, setAside, me }: { ranked: Contact[]; setAside: SetAside[]; me: Me | null }) {
  const [first, ...rest] = ranked.filter((c) => c.points > 0);
  const you = (id: string) => (me?.id === id ? " (you)" : "");
  if (!first) return <p className="mt-3 text-sm text-neutral-500">Nobody has dealt with this topic yet.</p>;
  return (
    <>
      <div className="mt-4 rounded-2xl bg-[#eef3ec] p-4">
        <p className="text-lg leading-snug">
          Contact <span className="font-semibold">{first.person.name}</span>
          {you(first.person.id)} first.
        </p>
        <ul className="mt-2 space-y-1 text-sm text-neutral-700">
          {first.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f8a4f]" />
              {r}
            </li>
          ))}
        </ul>
        {first.lastSeen && (
          <p className="mt-3 border-l-2 border-[#0f8a4f]/40 pl-3 text-sm italic text-neutral-600">
            “{first.lastSeen.quote}”
            <span className="not-italic text-neutral-500"> {CHANNEL[first.lastSeen.channel] ? `in ${CHANNEL[first.lastSeen.channel]}` : ""}, {new Date(first.lastSeen.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          </p>
        )}
      </div>
      {rest.slice(0, 2).map((c, i) => (
        <div key={c.person.id} className="mt-2 rounded-xl px-4 py-2.5 text-sm ring-1 ring-neutral-200">
          <p>
            {i === 0 ? "If not available: " : "Also knows it: "}
            <span className="font-medium">{c.person.name}</span>
            {you(c.person.id)}
          </p>
          <p className="mt-0.5 text-neutral-500">{c.reasons.join(". ")}.</p>
        </div>
      ))}
      {setAside.length > 0 && (
        <div className="mt-4 text-sm text-neutral-500">
          <p className="text-neutral-600">Not suggested</p>
          <ul className="mt-1 space-y-0.5">
            {setAside.map((x) => (
              <li key={x.person.id}>
                <span className="text-neutral-600 line-through decoration-neutral-300">{x.person.name}</span>: {x.reason.charAt(0).toLowerCase() + x.reason.slice(1)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// ——— One ledger entry ———

export function LedgerRow({
  e,
  name,
  scopeLabel,
  latest,
  fresh,
  pending,
  now,
}: {
  e: Entry;
  name: (id: string | null) => string;
  scopeLabel: (sc: Scope) => string;
  latest: boolean;
  fresh: boolean;
  pending: boolean;
  now: number;
}) {
  const by = name(e.actor);
  const headline =
    e.kind === "learned"
      ? `Learned from ${CHANNEL[e.channel] ?? e.channel}, added by ${by}`
      : e.kind === "confirmed"
        ? `Confirmed by ${by}${e.actor === e.speaker ? ", who said it" : ""}`
        : e.kind === "rejected"
          ? `Marked wrong by ${by}`
          : e.kind === "removed"
            ? `Taken back by ${by}`
            : e.kind === "corrected"
              ? `Corrected by ${by}`
              : e.kind === "restored"
                ? `Put back by ${by}`
                : `Marked outdated by ${by}`;
  const d = e.claimScore.before == null ? 0 : e.claimScore.after - e.claimScore.before;
  const flash = d > 0.005 ? ["#0f8a4f", "#eef7f1"] : d < -0.005 ? ["#c0392b", "#fdecea"] : ["#a3a3a3", "#f5f5f5"];
  const style = { "--flash": flash[0], "--flash-bg": flash[1], "--rest-bg": latest ? "#faf9f6" : "transparent" } as CSSProperties;
  const a = e.answer;
  const answerMoved = a.before.value !== a.after.value || a.before.status !== a.after.status || a.before.score !== a.after.score;
  const cap = capOf(e.caps);
  const claimLabel = e.speaker ? `${possessive(name(e.speaker))} claim` : "This claim";

  return (
    <li className={`rounded-2xl p-4 ${latest ? "bg-[#faf9f6] ring-1 ring-neutral-200" : ""} ${fresh ? s.arrive : ""}`} style={style}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {latest && <span className="rounded-full bg-[#161616] px-2 py-0.5 text-xs font-medium text-white">Latest</span>}
        <span className="font-medium">{headline}</span>
        <span className="text-sm text-neutral-500">{ago(e.at, now)}</span>
      </div>
      <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-800">
        <span className="text-neutral-500">{name(e.speaker)}: </span>“{e.quote}”
        <span className="text-sm text-neutral-500"> Applies to {scopeLabel(e.scope)}.</span>
      </p>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto]">
        <span className="col-span-2 text-sm text-neutral-600 sm:col-span-1">
          {claimLabel}, {e.value}
        </span>
        <Meter from={e.claimScore.before} to={e.claimScore.after} animate={fresh} cap={cap} />
        <span className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-neutral-500">{e.claimScore.before == null ? "new" : pct(e.claimScore.before)} →</span>
          <span className="min-w-[3ch] text-right font-serif text-2xl tabular-nums leading-none" style={{ color: color(e.claimScore.after) }}>
            <CountUp key={e.id} from={e.claimScore.before ?? 0} to={e.claimScore.after} animate={fresh} />
          </span>
          <Delta from={e.claimScore.before} to={e.claimScore.after} animate={fresh} />
        </span>
      </div>

      <p className="mt-2 text-sm text-neutral-600">
        {answerMoved ? (
          <>
            The answer went from {a.before.value ?? "nothing"} ({pct(a.before.score)}, {statusWord(a.before.status).toLowerCase()}) to{" "}
            <span className="font-medium" style={{ color: tone(a.after) }}>
              {a.after.value ?? "nothing"} ({pct(a.after.score)}, {statusWord(a.after.status).toLowerCase()})
            </span>
            .
          </>
        ) : (
          <>The answer stayed {a.after.value ?? "empty"} ({pct(a.after.score)}).</>
        )}
      </p>

      {e.explain && <p className="mt-2 text-sm font-medium text-neutral-800">{e.explain}</p>}

      {(e.evidence.length > 0 || e.caps.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[...e.evidence]
            .sort((x, y) => Math.abs(y.points) - Math.abs(x.points))
            .map((ev, i) => (
              <span key={i} title={ev.label} className={`rounded-full px-2.5 py-0.5 text-xs ${ev.points >= 0 ? "bg-[#eef7f1] text-[#0f8a4f]" : "bg-[#fdecea] text-[#c0392b]"}`}>
                {ev.tag} <span className="font-semibold tabular-nums">{ev.points > 0 ? "+" : "−"}{Math.abs(ev.points)}</span>
              </span>
            ))}
          {e.caps.map((c) => (
            <span key={c} className="rounded-full bg-[#fff4e0] px-2.5 py-0.5 text-xs text-[#9a6400]">
              {c}
            </span>
          ))}
        </div>
      )}

      {pending && (
        <p className="mt-3 text-sm text-[#9a6400]">
          Waiting for {name(e.speaker)} or an expert to confirm it. One click lifts the 50% cap.
        </p>
      )}
    </li>
  );
}

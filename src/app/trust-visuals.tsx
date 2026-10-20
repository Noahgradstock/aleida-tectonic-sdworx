"use client";

import { useEffect, useState } from "react";
import { LAYERS, type Evidence, type Forecast } from "@/trust-engine";

// The two pictures of trust:
// A. Waterfall: how today's score was built, one human question per row, every point visible.
// B. Forecast: the same engine run forward in time, with the day the answer stops being trusted.

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const pct = (n: number) => `${Math.round(n * 100)}%`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1)}`;
const GREEN = "#0f8a4f";
const RED = "#c0392b";
const AMBER = "#c98a00";
const BLUE = "#1463ff";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Plays once after mount; respects people who prefer less motion.
function useReveal() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    void Promise.resolve().then(() => requestAnimationFrame(() => setOn(true)));
  }, []);
  return on;
}

export function Waterfall({ evidence, score, caps }: { evidence: Evidence[]; score: number; caps: string[] }) {
  const on = useReveal();
  // Running total per layer, in order: each row starts where the previous one ended.
  const rows = LAYERS.reduce<{ id: string; question: string; items: Evidence[]; points: number; from: number; to: number; sum: number }[]>((acc, layer) => {
    const items = evidence.filter((e) => e.layer === layer.id);
    const points = items.reduce((s, e) => s + e.points, 0);
    const before = acc.length ? acc[acc.length - 1].sum : 0;
    return [...acc, { ...layer, items, points, from: sigmoid(before), to: sigmoid(before + points), sum: before + points }];
  }, []);
  const raw = sigmoid(rows[rows.length - 1]?.sum ?? 0);
  const capped = score < raw - 0.005;
  const capLabel = caps[0]?.replace(/^Capped at \d+%: /, "");

  return (
    <div className="rounded-2xl bg-[#fbfaf7] p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-xl">How we got to {pct(score)}</h3>
        <span className="text-xs text-neutral-500">Every claim starts at 50%. Six questions move it.</span>
      </div>

      <div className="relative mt-7">
        {/* the scale: 50% start and the 75% trusted line */}
        <div className="pointer-events-none absolute inset-y-0 left-[38%] right-[64px] sm:left-[34%]">
          <div className="absolute inset-y-0 border-l border-dashed border-neutral-300" style={{ left: "50%" }} />
          <div className="absolute inset-y-0 border-l border-dashed" style={{ left: "75%", borderColor: `${BLUE}55` }} />
          <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-neutral-400" style={{ left: "50%" }}>
            start 50%
          </span>
          <span className="absolute -top-5 -translate-x-1/2 text-[10px]" style={{ left: "75%", color: BLUE }}>
            trusted 75%
          </span>
          {capped && <div className="absolute inset-y-0 border-l-2 border-dashed" style={{ left: `${score * 100}%`, borderColor: AMBER }} />}
        </div>

        <ol className="relative space-y-1.5">
          {rows.map((r, i) => {
            const up = r.points >= 0;
            const left = Math.min(r.from, r.to) * 100;
            const width = Math.abs(r.to - r.from) * 100;
            const idle = r.items.length === 0;
            return (
              <li key={r.id} className={`flex items-center gap-3 ${idle ? "opacity-45" : ""}`}>
                <div className="w-[38%] min-w-0 sm:w-[34%]">
                  <div className="text-sm font-medium leading-tight">{r.question}</div>
                  <div className="truncate text-xs text-neutral-500" title={r.items.map((e) => e.label).join(" · ")}>
                    {idle ? "Nothing to add" : r.items.map((e) => e.label).join(" · ")}
                  </div>
                </div>
                <div className="relative h-6 flex-1">
                  {!idle && (
                    <span
                      className="absolute top-1 h-4 rounded-[5px] transition-all duration-700 ease-out"
                      style={{
                        left: `${left}%`,
                        width: on ? `${Math.max(width, 0.8)}%` : "0%",
                        background: up ? GREEN : RED,
                        opacity: 0.85,
                        transitionDelay: `${i * 120}ms`,
                      }}
                    />
                  )}
                </div>
                <span className="w-[52px] shrink-0 text-right text-sm tabular-nums font-medium" style={{ color: idle ? "#a3a3a3" : up ? GREEN : RED }}>
                  {idle ? "–" : signed(r.points)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-neutral-200 pt-3">
        <span className="text-sm text-neutral-600">
          {capped ? (
            <>
              Adds up to {pct(raw)}, <span style={{ color: AMBER }}>capped at {pct(score)}</span>: {capLabel}.
            </>
          ) : (
            <>Points add up, then turn into a percentage. +2 is about 88%, −2 about 12%.</>
          )}
        </span>
        <span className="font-serif text-3xl leading-none" style={{ color: score >= 0.75 ? GREEN : score >= 0.5 ? AMBER : RED }}>
          = {pct(score)}
        </span>
      </div>
    </div>
  );
}

// One plain sentence about the future, for cards, the Brain panel and the mascot.
export function forecastSentence(f: Forecast): string {
  if (f.bestBefore) return `Trusted until ${fmtDate(f.bestBefore.date)}. ${f.bestBefore.reason}.`;
  if (f.headroom != null) {
    const hits = Math.floor(f.headroom / 1.5);
    return `No end date in sight. It stays trusted until a new rule is published${hits > 0 ? `, and can take ${hits === 1 ? "one correction" : `${hits} corrections`} from a colleague before it drops` : ""}.`;
  }
  return "Not trusted today, so there is nothing to keep.";
}

export function ForecastLine({ forecast, compact }: { forecast: Forecast; compact?: boolean }) {
  const on = useReveal();
  const pts = forecast.curve.filter((p) => p.score != null);
  if (pts.length < 2) return null;
  const W = 600;
  const H = compact ? 70 : 140;
  const padT = 18;
  const padB = compact ? 6 : 34;
  const t0 = Date.parse(pts[0].date);
  const t1 = Date.parse(pts[pts.length - 1].date);
  const x = (d: string) => ((Date.parse(d) - t0) / (t1 - t0)) * W;
  // Zoom the scale to where the line lives, but always show the 75% trusted line with room below it.
  const lo = Math.max(0, Math.min(0.55, ...pts.map((p) => p.score! - 0.1)));
  const y = (s: number) => padT + (1 - (s - lo) / (1 - lo)) * (H - padT - padB);
  // A new segment wherever the answer's value changes, so "€8.91" and "€9.50" read as two different answers.
  const segments: { value: string | null; trusted: boolean; points: typeof pts }[] = [];
  for (const p of pts) {
    const last = segments[segments.length - 1];
    if (last && last.value === p.value) last.points.push(p);
    else segments.push({ value: p.value, trusted: p.trusted, points: last ? [last.points[last.points.length - 1], p] : [p] });
  }
  const bb = forecast.bestBefore;
  const path = (ps: typeof pts) => ps.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.score!).toFixed(1)}`).join(" ");
  const years = [...new Set(pts.map((p) => p.date.slice(0, 4)))].slice(1);

  return (
    <div>
      {!compact && (
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-xl">Will it hold?</h3>
          <span className="text-xs text-neutral-500">The same rules, run forward 18 months</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full overflow-visible" role="img" aria-label={forecastSentence(forecast)}>
        <line x1={0} x2={W} y1={y(0.75)} y2={y(0.75)} stroke={BLUE} strokeOpacity={0.35} strokeDasharray="4 4" />
        {!compact && (
          <text x={W} y={y(0.75) - 4} textAnchor="end" fontSize={10} fill={BLUE} fillOpacity={0.7}>
            trusted
          </text>
        )}
        {years.map((yr) => (
          <g key={yr}>
            <line x1={x(`${yr}-01-01`)} x2={x(`${yr}-01-01`)} y1={padT} y2={H - padB} stroke="#e5e5e5" />
            {!compact && (
              <text x={x(`${yr}-01-01`)} y={H - 12} textAnchor="middle" fontSize={11} fill="#737373">
                Jan {yr}
              </text>
            )}
          </g>
        ))}
        {segments.map((s, i) => (
          <path
            key={i}
            d={path(s.points)}
            fill="none"
            stroke={s.trusted ? (i === 0 ? GREEN : BLUE) : AMBER}
            strokeWidth={compact ? 2 : 2.5}
            strokeDasharray={i === 0 ? undefined : "5 4"}
            pathLength={1}
            style={{ strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        ))}
        {/* the time axis: today on the left, 18 months ahead on the right */}
        {!compact && (
          <g fontSize={11} fill="#737373">
            <line x1={0} x2={W} y1={H - padB + 6} y2={H - padB + 6} stroke="#e5e5e5" />
            <text x={0} y={H - 12}>
              Today
            </text>
            <text x={W} y={H - 12} textAnchor="end">
              {new Date(pts[pts.length - 1].date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
            </text>
          </g>
        )}
        {/* today */}
        <circle cx={0} cy={y(pts[0].score!)} r={4} fill={GREEN} />
        {!compact && (
          <text x={6} y={y(pts[0].score!) + 18} fontSize={11} fill="#262626" fontWeight={600}>
            Today: {pts[0].value} · {pct(pts[0].score!)}
          </text>
        )}
        {/* best before */}
        {bb && (
          <g>
            <line x1={x(bb.date)} x2={x(bb.date)} y1={padT - 6} y2={H - padB} stroke={AMBER} strokeWidth={1.5} strokeDasharray="3 3" />
            <circle cx={x(bb.date)} cy={padT - 6} r={3.5} fill={AMBER} />
            {!compact && (
              <text x={x(bb.date) + 6} y={padT - 2} fontSize={11} fill={AMBER} fontWeight={600}>
                Best before {fmtDate(bb.date)}
              </text>
            )}
            {!compact && segments[1]?.value && (
              <text x={Math.min(W - 4, x(bb.date) + 6)} y={y(segments[1].points[segments[1].points.length - 1].score!) + 16} fontSize={11} fill={BLUE}>
                then {segments[1].value}
              </text>
            )}
          </g>
        )}
      </svg>
      <p className={`${compact ? "mt-1 text-xs" : "mt-2 text-sm"} text-neutral-600`}>{forecastSentence(forecast)}</p>
    </div>
  );
}

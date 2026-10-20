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
    return [...acc, { ...layer, items, points, from: before, to: before + points, sum: before + points }];
  }, []);
  const total = rows[rows.length - 1]?.sum ?? 0;
  const raw = sigmoid(total);
  // The bars are drawn in points, so +1 is a third of +3. Zero (= 50%) and the trusted line (75%) are marked.
  const TRUSTED = Math.log(3); // 75% in points, about +1.1
  const lo = Math.min(0, ...rows.map((r) => r.sum)) - 0.3;
  const hi = Math.max(TRUSTED + 0.4, ...rows.map((r) => r.sum)) + 0.3;
  const x = (pts: number) => ((pts - lo) / (hi - lo)) * 100;
  const capped = score < raw - 0.005;
  const capLabel = caps[0]?.replace(/^Capped at \d+%: /, "");

  return (
    <div className="rounded-2xl bg-[#fbfaf7] p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-xl">How we got to {pct(score)}</h3>
        <span className="text-xs text-neutral-500">Every claim starts at 0 points (50%). Six questions add or take away points.</span>
      </div>

      <div className="relative mt-7">
        {/* the scale in points: 0 is the start (50%), +1.1 is the trusted line (75%) */}
        <div className="pointer-events-none absolute inset-y-0 left-[38%] right-[64px] sm:left-[34%]">
          <div className="absolute inset-y-0 border-l border-dashed border-neutral-300" style={{ left: `${x(0)}%` }} />
          <div className="absolute inset-y-0 border-l border-dashed" style={{ left: `${x(TRUSTED)}%`, borderColor: `${BLUE}55` }} />
          <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[10px] text-neutral-400" style={{ left: `${x(0)}%` }}>
            start 0
          </span>
          <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[10px]" style={{ left: `${x(TRUSTED)}%`, color: BLUE }}>
            trusted +1.1
          </span>
        </div>

        <ol className="relative space-y-1.5">
          {rows.map((r, i) => {
            const up = r.points >= 0;
            const left = x(Math.min(r.from, r.to));
            const width = x(Math.max(r.from, r.to)) - left;
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
          {/* the sum of the six rows */}
          <li className="flex items-center gap-3 border-t border-dashed border-neutral-200 pt-2">
            <div className="w-[38%] min-w-0 text-sm font-medium sm:w-[34%]">Total</div>
            <div className="relative h-6 flex-1">
              <span
                className="absolute top-1 h-4 rounded-[5px] transition-all duration-700 ease-out"
                style={{
                  left: `${x(Math.min(0, total))}%`,
                  width: on ? `${Math.max(x(Math.max(0, total)) - x(Math.min(0, total)), 0.8)}%` : "0%",
                  background: total >= 0 ? GREEN : RED,
                  transitionDelay: `${rows.length * 120}ms`,
                }}
              />
            </div>
            <span className="w-[52px] shrink-0 text-right text-sm font-semibold tabular-nums" style={{ color: total >= 0 ? GREEN : RED }}>
              {signed(total)}
            </span>
          </li>
        </ol>
      </div>

      <PointsToPercent total={total} />

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-neutral-200 pt-3">
        <span className="text-sm text-neutral-600">
          {capped ? (
            <>
              Adds up to {pct(raw)}, <span style={{ color: AMBER }}>capped at {pct(score)}</span>: {capLabel}.
            </>
          ) : (
            <>
              {signed(total)} points = {pct(raw)}. Each extra point counts for less near the top: close to 100%, never there.
            </>
          )}
        </span>
        <span className="font-serif text-3xl leading-none" style={{ color: score >= 0.75 ? GREEN : score >= 0.5 ? AMBER : RED }}>
          = {pct(score)}
        </span>
      </div>
    </div>
  );
}

// Points → percentage, once, on one scale: the marker is the total, the ticks show the same curve as the engine.
function PointsToPercent({ total }: { total: number }) {
  const LO = -3;
  const HI = 5;
  const at = (pts: number) => ((Math.min(HI, Math.max(LO, pts)) - LO) / (HI - LO)) * 100;
  const ticks = [-2, 0, Math.log(3), 2, 4];
  const tone = sigmoid(total) >= 0.75 ? GREEN : sigmoid(total) >= 0.5 ? AMBER : RED;
  return (
    <div className="mt-5" aria-label={`${signed(total)} points is ${pct(sigmoid(total))}`}>
      <div className="mb-1 text-[11px] text-neutral-500">From points to a percentage</div>
      <div className="relative mx-3 h-12">
        <span className="absolute left-0 right-0 top-5 h-1.5 rounded-full" style={{ background: `linear-gradient(to right, ${RED}55, ${AMBER}55 ${at(0)}%, ${GREEN}55 ${at(Math.log(3))}%)` }} />
        {ticks.map((t) => (
          <span key={t} className="absolute top-[18px] flex -translate-x-1/2 flex-col items-center" style={{ left: `${at(t)}%` }}>
            <span className="h-2.5 w-px bg-neutral-400" />
            <span className="mt-0.5 whitespace-nowrap text-[10px] leading-tight text-neutral-500">
              {t === 0 ? "0" : signed(t)} · <span style={{ color: t === Math.log(3) ? BLUE : undefined }}>{pct(sigmoid(t))}</span>
            </span>
          </span>
        ))}
        <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${at(total)}%` }}>
          <span className="whitespace-nowrap rounded-full px-1.5 text-[10px] font-semibold leading-4 text-white" style={{ background: tone }}>
            {pct(sigmoid(total))}
          </span>
          <span className="mt-0.5 h-3 w-3 rounded-full border-2 border-white" style={{ background: tone }} />
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

// The checker: the six questions as a checklist, ticked off one by one (for the log and the "How it works" card).
// Green tick = the question added trust, red cross = it took trust away, grey dash = nothing to add.
export function Checker({ evidence, score, caps, animate = false, compact = false }: { evidence: Evidence[]; score: number; caps: string[]; animate?: boolean; compact?: boolean }) {
  const on = useReveal();
  const shown = !animate || on;
  const cap = caps[0]?.replace(/^Capped at (\d+)%: /, "capped at $1%: ");
  return (
    <div>
      <ol className={compact ? "space-y-1" : "space-y-1.5"}>
        {LAYERS.map((layer, i) => {
          const items = evidence.filter((e) => e.layer === layer.id);
          const points = items.reduce((s, e) => s + e.points, 0);
          const idle = items.length === 0 || Math.abs(points) < 0.05;
          const tone = idle ? "#a3a3a3" : points > 0 ? GREEN : RED;
          return (
            <li
              key={layer.id}
              className="flex items-center gap-2.5 transition-all duration-300 ease-out"
              style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(4px)", transitionDelay: animate ? `${150 + i * 260}ms` : "0ms" }}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: idle ? "#e5e5e5" : tone }}>
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={idle ? "M7 12h10" : points > 0 ? "M5 12.5l4.5 4.5L19 7.5" : "M7 7l10 10M17 7L7 17"} />
                </svg>
              </span>
              <span className={`w-36 shrink-0 ${compact ? "text-xs" : "text-sm"} font-medium ${idle ? "text-neutral-400" : "text-neutral-800"}`}>{layer.question}</span>
              <span className={`min-w-0 flex-1 truncate ${compact ? "text-[11px]" : "text-xs"} text-neutral-500`} title={items.map((e) => e.label).join(" · ")}>
                {idle ? "nothing to add" : items.map((e) => e.label).join(" · ")}
              </span>
              <span className={`w-10 shrink-0 text-right ${compact ? "text-xs" : "text-sm"} font-medium tabular-nums`} style={{ color: tone }}>
                {idle ? "–" : signed(points)}
              </span>
            </li>
          );
        })}
      </ol>
      <p
        className={`mt-2 flex items-baseline justify-between gap-3 border-t border-neutral-200 pt-2 ${compact ? "text-xs" : "text-sm"} transition-opacity duration-300`}
        style={{ opacity: shown ? 1 : 0, transitionDelay: animate ? `${150 + LAYERS.length * 260}ms` : "0ms" }}
      >
        <span className="text-neutral-500">{cap ? cap.charAt(0).toUpperCase() + cap.slice(1) : "Starts at 50%, the six questions move it."}</span>
        <b className="shrink-0 font-serif text-lg" style={{ color: score >= 0.75 ? GREEN : score >= 0.5 ? AMBER : RED }}>
          = {pct(score)}
        </b>
      </p>
    </div>
  );
}

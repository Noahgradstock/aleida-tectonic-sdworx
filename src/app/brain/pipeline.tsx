"use client";

import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "../icons";
import { Flag } from "@/lib/demo-shared";
import { CopilotLogo, DatabaseLogo, DocsLogo, GmailLogo, OutlookLogo, TeamsLogo } from "../logos";
import { KIND } from "./documents";
import { LAYERS } from "@/trust-engine";
import type { BrainData } from "./brain-map";

// How the brain reads: connect → find → scan → extract, in one calm row above the documents.

type Channel = BrainData["channels"][number]["type"];
const SOURCES: { name: string; type: Channel | null; logo: ReactNode }[] = [
  { name: "Copilot", type: "meeting", logo: <CopilotLogo /> },
  { name: "Teams", type: "teams", logo: <TeamsLogo /> },
  { name: "Outlook", type: "email", logo: <OutlookLogo /> },
  { name: "Gmail", type: "email", logo: <GmailLogo /> },
  { name: "Database", type: null, logo: <DatabaseLogo /> },
  { name: "SharePoint", type: "sharepoint", logo: <DocsLogo /> },
  { name: "EU law", type: "official", logo: <Flag country="EU" size={16} /> },
  { name: "BE law", type: "official", logo: <Flag country="BE" size={16} /> },
];

// The short version for the top of a page: four steps in one airy row, each with one line and a live number,
// joined by a line. The detailed cards open underneath on request.
export function HowItWorks({ data }: { data: BrainData }) {
  const [open, setOpen] = useState(false);
  const statements = data.topics.reduce((n, t) => n + t.claims.length, 0);
  const steps: { icon: IconName; title: string; text: string; stat: string }[] = [
    { icon: "meeting", title: "Hears", text: "Meetings, Teams, email and Copilot", stat: "" },
    { icon: "document", title: "Finds", text: "Documents that mention the topic", stat: `${data.documents.length} documents in this demo` },
    { icon: "paste", title: "Reads", text: "The exact line, word for word", stat: `${statements} statements` },
    { icon: "check", title: "Scores", text: "Six questions, one trust score", stat: "Trusted from 75%" },
  ];
  return (
    <section aria-label="How it works">
      <h2 className="mb-2 font-serif text-xl">How it works</h2>
      <div className="relative rounded-2xl bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        {/* the line the steps sit on */}
        <div className="pointer-events-none absolute inset-x-[6%] top-[33px] hidden h-px bg-neutral-200 lg:block" />
        <ol className="relative grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
          {steps.map((st, i) => (
            <li key={st.title} className="flex items-start gap-3">
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#161616] text-white ring-4 ring-white">
                <Icon name={st.icon} size={14} />
              </span>
              <div className="min-w-0 bg-white pr-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] text-neutral-400">0{i + 1}</span>
                  <span className="text-[15px] font-medium">{st.title}</span>
                </div>
                <div className="text-xs text-neutral-500">{st.text}</div>
                {i === 0 ? (
                  // the places it listens to, as small logos
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 [&_svg]:h-4 [&_svg]:w-4">
                    {SOURCES.slice(0, 6).map((src) => (
                      <span key={src.name} title={src.name} className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f6f5f2]">
                        {src.logo}
                      </span>
                    ))}
                    <span title={SOURCES.slice(6).map((x) => x.name).join(", ")} className="text-[11px] text-neutral-400">
                      +{SOURCES.length - 6}
                    </span>
                  </div>
                ) : (
                  <span className="mt-1.5 inline-block rounded-full bg-[#f3f1ec] px-2 py-0.5 text-[11px] font-medium text-neutral-700">{st.stat}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="absolute bottom-3 right-4 text-xs font-medium text-[#1463ff] hover:underline">
          {open ? "Hide the details" : "See the details"}
        </button>
      </div>
      {open && (
        <div className="mt-4">
          <Pipeline data={data} bare />
        </div>
      )}
    </section>
  );
}

export default function Pipeline({ data, bare }: { data: BrainData; bare?: boolean }) {
  const count = (t: Channel | null) => (t ? (data.channels.find((c) => c.type === t)?.claims ?? 0) : 0);
  // A real example: the best-scored statement on the sick leave relapse question.
  const example = data.topics
    .find((t) => t.key === "sick-relapse")
    ?.claims.filter((c) => c.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  // What the brain found: documents by kind (most common first), the statements in them, and who made them.
  const kinds = Object.entries(data.documents.reduce<Record<string, number>>((m, d) => ((m[d.kind] = (m[d.kind] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const statements = data.topics.reduce((n, t) => n + t.claims.length, 0);
  const voices = data.people.filter((p) => p.claims > 0).length;
  const author = example?.author ? data.people.find((p) => p.id === example.author)?.name : "Official publication";

  return (
    <section>
      {!bare && (
        <>
          <h2 className="font-serif text-2xl leading-none">How it works</h2>
          <p className="mt-1.5 text-sm text-neutral-500">From what people say to a trusted answer, in four steps. Nobody has to write anything down.</p>
        </>
      )}

      <ol className="mt-6 grid gap-3 sm:grid-cols-4">
        <Step n={1} title="Hears" text="Jef, our mascot, listens to meetings, Teams, email and Copilot, read-only with your own access.">
          <div className="grid grid-cols-4 gap-x-1 gap-y-2">
            {SOURCES.map((s) => (
              <div key={s.name} className="flex flex-col items-center gap-1" title={`${s.name}: ${count(s.type)} statements`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6f5f2] [&>svg:not([aria-label])]:h-6 [&>svg:not([aria-label])]:w-6">{s.logo}</div>
                <span className="text-[10px] text-neutral-500">{s.name}</span>
              </div>
            ))}
          </div>
        </Step>

        <Step n={2} title="Finds" text="Every document that already mentions the topic. In this demo a sample; in use, all of SharePoint, Teams and email.">
          {/* a fan of the documents it found, by kind, and what came out of them */}
          <div className="flex items-end gap-4">
            <div className="relative h-16 w-24 shrink-0">
              {kinds.slice(0, 5).map(([kind], i, all) => (
                <span
                  key={kind}
                  className="absolute bottom-0 left-6 flex h-14 w-11 flex-col rounded-[5px] bg-white p-1 shadow-[0_1px_4px_rgba(0,0,0,0.14)] ring-1 ring-black/5"
                  style={{ transform: `rotate(${(i - (all.length - 1) / 2) * 11}deg) translateX(${(i - (all.length - 1) / 2) * 7}px)`, transformOrigin: "bottom center", zIndex: i }}
                >
                  <span className="h-1.5 w-full rounded-sm" style={{ background: KIND[kind as keyof typeof KIND]?.color ?? "#a3a3a3" }} />
                  <span className="mt-1 h-0.5 w-4/5 rounded bg-neutral-200" />
                  <span className="mt-0.5 h-0.5 w-3/5 rounded bg-neutral-200" />
                  <span className="mt-0.5 h-0.5 w-4/5 rounded bg-neutral-200" />
                </span>
              ))}
            </div>
            <div className="min-w-0">
              <div className="font-serif text-4xl leading-none">{data.documents.length}</div>
              <div className="text-[11px] text-neutral-500">documents</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
            <span>
              <b className="font-medium text-neutral-800">{statements}</b> statements
            </span>
            <span>
              <b className="font-medium text-neutral-800">{voices}</b> people
            </span>
            <span>
              <b className="font-medium text-neutral-800">{kinds.length}</b> kinds of source
            </span>
          </div>
        </Step>

        <Step n={3} title="Reads" text="Picks out the exact line that answers the question.">
          {/* a small page: grey lines, and the one line that answers, highlighted as the scan passes */}
          <div className="relative overflow-hidden rounded-xl bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-600">
              <span className="h-2.5 w-2 rounded-[2px] bg-[#1463ff]" />
              <span className="truncate">{example?.title ?? "Sick leave policy"}</span>
            </div>
            <div className="mt-2 space-y-1">
              <span className="block h-1 w-11/12 rounded bg-neutral-200" />
              <span className="block h-1 w-4/5 rounded bg-neutral-200" />
            </div>
            <p className="relative mt-1.5 rounded-md bg-[#eef3ff] px-1.5 py-1 text-[10.5px] leading-snug text-neutral-700">
              …a new illness within <mark className="rounded-sm bg-[#cfe0ff] px-0.5 font-medium text-[#161616]">{example?.value ?? "8 weeks"}</mark> after returning
              counts as the same illness…
            </p>
            <div className="mt-1.5 space-y-1">
              <span className="block h-1 w-3/4 rounded bg-neutral-200" />
            </div>
            <span className="scan-line absolute inset-x-0 h-[2px] bg-[#1463ff] shadow-[0_0_10px_rgba(20,99,255,0.5)]" />
          </div>
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#1463ff]">
            <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            Kept word for word
          </span>
        </Step>

        <Step n={4} title="Scores" text="What, who and when go through six questions and become a trust score.">
          {example && (
            <>
            <div className="flex items-center gap-3 rounded-xl bg-[#f6f5f2] p-3">
              <ScoreRing score={example.score ?? 0} />
              {/* the six questions every statement goes through */}
              <ol className="min-w-0 space-y-0.5 text-[11px] text-neutral-700">
                {LAYERS.map((l, i) => (
                  <li key={l.id} className="flex items-center gap-1.5">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[8px] text-neutral-500 ring-1 ring-neutral-200">{i + 1}</span>
                    {l.question}
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-2 truncate text-[11px] text-neutral-500">
              Example: “{example.value}” from {author}, {example.date}
            </p>
            </>
          )}
        </Step>
      </ol>
    </section>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: ReactNode }) {
  return (
    <li className="relative flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">0{n}</div>
        <div className="mt-0.5 text-base font-medium">{title}</div>
        <div className="text-xs text-neutral-500">{text}</div>
      </div>
      <div className="mt-auto">{children}</div>
      {n < 4 && (
        <span className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#f3f1ec] text-[11px] text-neutral-400 sm:flex">
          <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      )}
    </li>
  );
}

// The score as a ring: green from 75%, amber from 50%, red below.
function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const tone = score >= 0.75 ? "#0f8a4f" : score >= 0.5 ? "#c98a00" : "#c0392b";
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden>
          <circle cx="28" cy="28" r={r} fill="none" stroke="#e7e5df" strokeWidth="5" />
          <circle cx="28" cy="28" r={r} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score)} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-serif text-xl" style={{ color: tone }}>
          {Math.round(score * 100)}
        </span>
      </div>
      <span className="mt-1 text-[10px] font-medium" style={{ color: tone }}>
        {score >= 0.75 ? "Trusted" : score >= 0.5 ? "Use with care" : "Don't rely on"}
      </span>
    </div>
  );
}

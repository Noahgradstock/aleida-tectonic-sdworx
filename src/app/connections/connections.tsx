"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { SourceType } from "@/trust-engine";
import { DatabaseLogo, OutlookLogo, TeamsLogo } from "../logos";

// Where the brain learns from. The Microsoft sign-in and the connections are simulated for the demo;
// the fact counts are real (they come from the same claims the Brain shows).

export type SourceStats = { facts: number; latest: string | null };

type Status = "on" | "off" | "needs-it" | "requested" | "setup";

type Source = {
  id: string;
  name: string;
  logo: ReactNode;
  microsoft?: boolean;
  types: SourceType[]; // which claims in the brain came from here
  summary: string; // one line under the name
  reads: string;
  keeps: string;
  updates: string;
  access: string;
  start: Status;
  note?: string; // shown while it waits for IT
};

const MicrosoftLogo = () => (
  <svg viewBox="0 0 21 21" className="h-5 w-5" aria-hidden>
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

const OneDriveLogo = () => (
  <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
    <path d="M13 10.5a7 7 0 0 1 12.3 2.6A5 5 0 0 1 26 23H12z" fill="#0364b8" />
    <path d="M8.5 13a6 6 0 0 1 8.6 1.4l9.3 8.6H9.5A5 5 0 0 1 8.5 13z" fill="#0078d4" />
    <path d="M26 23H9.5a5 5 0 0 1-.9-9.9l13.6 9.9z" fill="#28a8ea" />
  </svg>
);

const LawLogo = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="#161616" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3.5 20.5h17" />
  </svg>
);

const SOURCES: Source[] = [
  {
    id: "onedrive",
    name: "OneDrive and SharePoint",
    logo: <OneDriveLogo />,
    microsoft: true,
    types: ["sharepoint"],
    summary: "Payroll policy folders and client agreements",
    reads: "Files in the folders your team shares. Only files you can already open.",
    keeps: "The fact, a short quote and a link back to the file. Never a copy of the file.",
    updates: "When a file changes, Microsoft tells the brain. Nothing is crawled.",
    access: "Files.Read.All, Sites.Read.All (read-only)",
    start: "on",
  },
  {
    id: "outlook",
    name: "Outlook",
    logo: <OutlookLogo />,
    microsoft: true,
    types: ["email"],
    summary: "Mail you send about pay, leave and contracts",
    reads: "Mail you send that states a value, such as a number of days or an amount.",
    keeps: "The fact, who said it and when. Personal data is masked first.",
    updates: "When you send a mail.",
    access: "Mail.Read (read-only, your own mailbox)",
    start: "on",
  },
  {
    id: "teams",
    name: "Teams chats and channels",
    logo: <TeamsLogo />,
    microsoft: true,
    types: ["teams"],
    summary: "Channels: Payroll BE, Client desk",
    reads: "Messages in the channels your team chose. Private chats only if you turn them on.",
    keeps: "The fact, who wrote it, and who agreed or corrected it in the thread.",
    updates: "When a message is posted or edited.",
    access: "ChannelMessage.Read.All, Chat.Read (read-only)",
    start: "on",
  },
  {
    id: "meetings",
    name: "Teams meeting transcripts",
    logo: <TeamsLogo />,
    microsoft: true,
    types: ["meeting"],
    summary: "Agreements made in client meetings",
    reads: "Transcripts of meetings that had transcription on. Each sentence comes with its speaker.",
    keeps: "The fact and the speaker. It stays capped at 50% until the speaker confirms it.",
    updates: "When a meeting ends and its transcript is ready.",
    access: "OnlineMeetingTranscript.Read.All (needs an admin)",
    start: "needs-it",
    note: "An IT admin has to approve this once for the whole company. Until then, meeting notes come in through Live loop.",
  },
  {
    id: "law",
    name: "Belgian law and official notices",
    logo: <LawLogo />,
    types: ["official"],
    summary: "Official Gazette, FPS Employment, joint committee notices",
    reads: "Public publications. No sign-in needed.",
    keeps: "The full text, with every version kept. These are the reference the rest is checked against.",
    updates: "Checked every morning for new publications.",
    access: "Public sources",
    start: "on",
  },
  {
    id: "payroll",
    name: "Payroll database",
    logo: <DatabaseLogo />,
    types: [],
    summary: "Client leave and pay settings, and finished payroll runs",
    reads: "One read-only view per topic, for example v_client_leave_policy.",
    keeps: "The value from each row. A payroll run that went out without a correction counts as a confirmation.",
    updates: "Every few minutes: only rows changed since the last check.",
    access: "A read-only database user, set up by IT",
    start: "setup",
  },
];

const MORE = [
  { name: "Google Drive", what: "Files and shared drives" },
  { name: "Confluence", what: "Team spaces and how-to pages" },
  { name: "Salesforce", what: "Client contracts and contacts" },
  { name: "Another SQL database", what: "Any system with a read-only view" },
];

const PERMISSIONS = [
  { what: "Read files in OneDrive and SharePoint that you can open", scope: "Files.Read.All" },
  { what: "Read the mail you send", scope: "Mail.Read" },
  { what: "Read messages in the Teams channels your team chose", scope: "ChannelMessage.Read.All" },
  { what: "Read your basic profile and your colleagues' roles", scope: "User.Read.All" },
];

const NEVER = ["Send mail or post messages", "Change or delete files", "Keep full copies of your mail, chats or files"];

const KEEPS = [
  { level: "Reference", stored: "The full document, every version", examples: "Law, official notices, signed client agreements, approved policy" },
  { level: "Working knowledge", stored: "The fact, a short quote and a link", examples: "Mail, Teams, meeting transcripts, working files" },
  { level: "Noise", stored: "Nothing", examples: "Small talk, drafts without facts, anything personal" },
];

const STORAGE_KEY = "connections-demo-v1";
const CHANGED = "connections-demo-changed";
const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
};
const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

type Saved = { signedIn: boolean; status: Record<string, Status> };

const initial = (): Saved => ({ signedIn: false, status: Object.fromEntries([...SOURCES.map((s) => [s.id, s.start]), ...MORE.map((m) => [m.name, "setup"])]) });

const shortDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: d.getUTCFullYear() === 2026 ? undefined : "numeric", timeZone: "UTC" });
};

export default function Connections({ userName, stats }: { userName: string; stats: Partial<Record<SourceType, SourceStats>> }) {
  // A per-viewer demo state: which sources are switched on. Survives a reload, never leaves the browser.
  const raw = useSyncExternalStore(subscribe, readSaved, () => null);
  const saved = useMemo<Saved>(() => {
    try {
      return raw ? { ...initial(), ...(JSON.parse(raw) as Saved) } : initial();
    } catch {
      return initial();
    }
  }, [raw]);
  const [open, setOpen] = useState<string | null>(null);
  const [consent, setConsent] = useState<"closed" | "asking" | "connecting">("closed");
  const save = (next: Saved) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(CHANGED));
  };
  const setStatus = (id: string, s: Status) => save({ ...saved, status: { ...saved.status, [id]: s } });

  async function allow() {
    setConsent("connecting");
    await new Promise((r) => setTimeout(r, 1100));
    save({ ...saved, signedIn: true });
    setConsent("closed");
  }

  // What each source does right now. Microsoft sources wait for the sign-in.
  const statusOf = (s: Source): Status | "signed-out" => (s.microsoft && !saved.signedIn ? "signed-out" : saved.status[s.id] ?? s.start);
  const listening = SOURCES.filter((s) => statusOf(s) === "on").length;
  const needsIt = SOURCES.filter((s) => statusOf(s) === "needs-it").length;
  const waiting = [...SOURCES.map((s) => statusOf(s)), ...MORE.map((m) => saved.status[m.name])].filter((s) => s === "requested").length;

  const headline = !saved.signedIn
    ? "Sign in with Microsoft so the brain can learn from your files, mail and Teams."
    : `Listening to ${listening} source${listening === 1 ? "" : "s"}. ${
        needsIt ? `${needsIt} need${needsIt === 1 ? "s" : ""} IT approval.` : waiting ? `Waiting for IT on ${waiting}. Nothing needs you.` : "Nothing needs you."
      }`;
  const calm = saved.signedIn && !needsIt;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-20 sm:px-6 lg:pt-12">
      <header>
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Connections</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-neutral-600">
          Where the brain learns from. Documents stay where they are. The brain keeps the facts, who said them and how far to trust them.
        </p>
      </header>

      {/* The one line that matters: quiet when all is well, specific when someone has to act. */}
      <section aria-live="polite" className="mt-8 flex items-start gap-4 rounded-2xl bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:px-6">
        <span className="relative mt-3 flex h-2.5 w-2.5 shrink-0">
          {calm && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3DBE9A] opacity-50 motion-reduce:animate-none" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${!saved.signedIn ? "bg-neutral-300" : calm ? "bg-[#3DBE9A]" : "bg-[#e0a526]"}`} />
        </span>
        <p className="font-serif text-2xl leading-snug text-neutral-900 sm:text-[28px]">{headline}</p>
      </section>

      <Group
        title="Microsoft 365"
        aside={
          saved.signedIn ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
              <MicrosoftLogo />
              <span>
                Signed in as <span className="text-neutral-800">{userName}</span>, SD Worx tenant
              </span>
              <button onClick={() => save({ ...saved, signedIn: false })} className="rounded-lg px-2 py-1 text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline">
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConsent("asking")}
              className="flex items-center gap-2.5 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition hover:border-black/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1463ff]"
            >
              <MicrosoftLogo />
              Sign in with Microsoft
            </button>
          )
        }
      >
        {SOURCES.filter((s) => s.microsoft).map((s) => (
          <Row key={s.id} source={s} status={statusOf(s)} stats={stats} open={open === s.id} onOpen={() => setOpen(open === s.id ? null : s.id)} setStatus={setStatus} />
        ))}
      </Group>

      <Group title="Other sources">
        {SOURCES.filter((s) => !s.microsoft).map((s) => (
          <Row key={s.id} source={s} status={statusOf(s)} stats={stats} open={open === s.id} onOpen={() => setOpen(open === s.id ? null : s.id)} setStatus={setStatus} />
        ))}
        <AddSource status={saved.status} setStatus={setStatus} open={open === "more"} onOpen={() => setOpen(open === "more" ? null : "more")} />
      </Group>

      <section className="mt-12">
        <h2 className="font-serif text-3xl">What the brain keeps</h2>
        <p className="mt-1 max-w-2xl text-[15px] text-neutral-600">We keep the rules, not the inbox. Who may see a file stays decided by Microsoft, not by a copy of it.</p>
        <div className="mt-5 grid gap-px overflow-hidden rounded-2xl bg-black/5 sm:grid-cols-3">
          {KEEPS.map((k) => (
            <div key={k.level} className="bg-white px-5 py-5">
              <div className="text-sm font-medium text-neutral-900">{k.level}</div>
              <div className="mt-3 text-[15px] leading-snug text-neutral-800">{k.stored}</div>
              <div className="mt-2 text-sm leading-snug text-neutral-500">{k.examples}</div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-12 text-center text-xs text-neutral-400">
        Demo: the Microsoft sign-in and the connections are simulated. Fact counts are real. All people, clients and documents are fictional.
      </p>

      {consent !== "closed" && <Consent connecting={consent === "connecting"} onAllow={allow} onCancel={() => setConsent("closed")} />}
    </main>
  );
}

function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-3xl">{title}</h2>
        {aside}
      </div>
      <ul className="mt-4 divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">{children}</ul>
    </section>
  );
}

const PILL: Record<Status | "signed-out", { label: string; className: string }> = {
  on: { label: "Listening", className: "bg-[#e6f6f0] text-[#1f7a5c]" },
  off: { label: "Off", className: "bg-neutral-100 text-neutral-500" },
  "needs-it": { label: "Needs IT approval", className: "bg-[#fdf3dc] text-[#8a5a00]" },
  requested: { label: "Waiting for IT", className: "bg-[#eef3ff] text-[#1446b8]" },
  setup: { label: "Not set up", className: "bg-neutral-100 text-neutral-500" },
  "signed-out": { label: "Sign in first", className: "bg-neutral-100 text-neutral-400" },
};

function Row({
  source: s,
  status,
  stats,
  open,
  onOpen,
  setStatus,
}: {
  source: Source;
  status: Status | "signed-out";
  stats: Partial<Record<SourceType, SourceStats>>;
  open: boolean;
  onOpen: () => void;
  setStatus: (id: string, s: Status) => void;
}) {
  const facts = s.types.reduce((n, t) => n + (stats[t]?.facts ?? 0), 0);
  const latest = s.types.map((t) => stats[t]?.latest ?? null).filter(Boolean).sort().at(-1) ?? null;
  const pill = PILL[status];
  const dim = status === "signed-out" || status === "off";
  const panelId = `source-${s.id}`;

  return (
    <li>
      <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3f1ec] ${dim ? "opacity-50 grayscale" : ""}`}>{s.logo}</span>
        <button onClick={onOpen} aria-expanded={open} aria-controls={panelId} className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1463ff]">
          <span className={`block text-[15px] font-medium ${dim ? "text-neutral-500" : "text-neutral-900"}`}>{s.name}</span>
          <span className="block truncate text-sm text-neutral-500">{s.summary}</span>
        </button>
        <div className="hidden w-36 shrink-0 text-right text-sm sm:block">
          {facts > 0 ? (
            <>
              <div className="tabular-nums text-neutral-900">
                {facts} fact{facts === 1 ? "" : "s"}
              </div>
              {latest && <div className="text-neutral-500">latest {shortDate(latest)}</div>}
            </>
          ) : (
            <div className="text-neutral-400">No facts yet</div>
          )}
        </div>
        <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium md:inline ${pill.className}`}>{pill.label}</span>
        <Control source={s} status={status} setStatus={setStatus} />
        <button onClick={onOpen} aria-label={open ? `Hide details for ${s.name}` : `Show details for ${s.name}`} className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800">
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {open && (
        <div id={panelId} className="border-t border-black/5 bg-[#faf9f6] px-4 py-5 sm:px-5 sm:pl-[76px]">
          <span className={`mb-4 inline-block rounded-full px-2.5 py-1 text-xs font-medium md:hidden ${pill.className}`}>{pill.label}</span>
          {(status === "needs-it" || status === "requested") && s.note && <p className="mb-4 max-w-2xl text-sm text-neutral-700">{s.note}</p>}
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <Detail term="What it reads">{s.reads}</Detail>
            <Detail term="What the brain keeps">{s.keeps}</Detail>
            <Detail term="When it updates">{s.updates}</Detail>
            <Detail term="Access">{s.access}</Detail>
          </dl>
          {s.id === "payroll" && status === "setup" && (
            <ol className="mt-5 max-w-2xl list-decimal space-y-1 pl-5 text-sm text-neutral-700">
              <li>IT creates a read-only database user for the brain.</li>
              <li>IT and payroll agree one view per topic, such as client leave days.</li>
              <li>The brain checks the view every few minutes for changed rows.</li>
            </ol>
          )}
        </div>
      )}
    </li>
  );
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-neutral-500">{term}</dt>
      <dd className="mt-0.5 text-neutral-800">{children}</dd>
    </div>
  );
}

// The action on the right of a row: a switch while it can run, otherwise the one step that unblocks it.
function Control({ source: s, status, setStatus }: { source: Source; status: Status | "signed-out"; setStatus: (id: string, s: Status) => void }) {
  if (status === "signed-out") return <span className="w-[92px] shrink-0" aria-hidden />;
  if (status === "needs-it" || status === "setup")
    return (
      <button
        onClick={() => setStatus(s.id, "requested")}
        className="w-[92px] shrink-0 rounded-lg bg-[#161616] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1463ff]"
      >
        Ask IT
      </button>
    );
  if (status === "requested")
    return (
      <button onClick={() => setStatus(s.id, s.start)} aria-label={`Cancel the request to IT for ${s.name}`} className="w-[92px] shrink-0 rounded-lg px-2.5 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
        Cancel
      </button>
    );
  const on = status === "on";
  return (
    <span className="flex w-[92px] shrink-0 justify-end">
      <button
        role="switch"
        aria-checked={on}
        aria-label={`${on ? "Stop" : "Start"} learning from ${s.name}`}
        onClick={() => setStatus(s.id, on ? "off" : "on")}
        className={`relative h-6 w-10 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1463ff] motion-reduce:transition-none ${on ? "bg-[#1463ff]" : "bg-neutral-300"}`}
      >
        <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
    </span>
  );
}

function AddSource({ status, setStatus, open, onOpen }: { status: Record<string, Status>; setStatus: (id: string, s: Status) => void; open: boolean; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} aria-expanded={open} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-[#faf9f6] sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-black/15 text-neutral-500">
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-medium text-neutral-900">Add a source</span>
          <span className="block text-sm text-neutral-500">Each source plugs into the same intake. The trust engine does not change.</span>
        </span>
      </button>
      {open && (
        <ul className="grid gap-px border-t border-black/5 bg-black/5 sm:grid-cols-2">
          {MORE.map((m) => {
            const asked = status[m.name] === "requested";
            return (
              <li key={m.name} className="flex items-center gap-3 bg-[#faf9f6] px-4 py-3 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-neutral-900">{m.name}</span>
                  <span className="block text-sm text-neutral-500">{m.what}</span>
                </span>
                <button
                  onClick={() => setStatus(m.name, asked ? "setup" : "requested")}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${asked ? "text-neutral-500 hover:bg-neutral-100" : "bg-[#161616] text-white hover:bg-black"}`}
                >
                  {asked ? "Waiting for IT" : "Ask IT"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// What signing in grants, in plain words, before anything is connected.
function Consent({ connecting, onAllow, onCancel }: { connecting: boolean; onAllow: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !connecting && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [connecting, onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={() => !connecting && onCancel()}>
      <div role="dialog" aria-modal="true" aria-labelledby="consent-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <MicrosoftLogo />
          Microsoft 365 sign-in (demo)
        </div>
        <h2 id="consent-title" className="mt-4 font-serif text-3xl leading-tight">
          Company brain asks for read-only access
        </h2>
        <ul className="mt-5 space-y-3">
          {PERMISSIONS.map((p) => (
            <li key={p.scope} className="flex gap-3 text-[15px] text-neutral-800">
              <Check />
              <span>
                {p.what}
                <span className="block text-xs text-neutral-400">{p.scope}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-2xl bg-[#f3f1ec] px-4 py-4">
          <div className="text-sm font-medium text-neutral-900">It never</div>
          <ul className="mt-2 space-y-1.5">
            {NEVER.map((n) => (
              <li key={n} className="flex gap-3 text-sm text-neutral-700">
                <Cross />
                {n}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-neutral-500">
          Meeting transcripts need an IT admin to approve them once for the whole company. You can switch any source off later.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} disabled={connecting} className="rounded-xl px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-40">
            Cancel
          </button>
          <button
            onClick={onAllow}
            disabled={connecting}
            autoFocus
            className="min-w-[132px] rounded-xl bg-[#1463ff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0f52d8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1463ff] disabled:opacity-70"
          >
            {connecting ? "Connecting…" : "Allow access"}
          </button>
        </div>
      </div>
    </div>
  );
}

const Check = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} className="mt-0.5 shrink-0 text-[#1f7a5c]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

const Cross = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} className="mt-0.5 shrink-0 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

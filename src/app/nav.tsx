"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The app's sidebar: the three places, and who you are signed in as at the bottom.
// On small screens it becomes a slim bar at the top.

type User = { id: string; name: string; role: string; team: string };

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const TABS = [
  // a speech bubble: ask a question
  { href: "/", label: "Ask", icon: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" },
  // three linked nodes: the web of what we know
  { href: "/brain", label: "Brain", icon: "M6 6.5a2.5 2.5 0 1 0 0-.01M18 6.5a2.5 2.5 0 1 0 0-.01M12 18a2.5 2.5 0 1 0 0-.01M8.2 7.6l2.6 8M15.8 7.6l-2.6 8M8.5 6.5h7" },
  // a pulse: what changes, live
  { href: "/loop", label: "Live loop", icon: "M3 12h4l2.5-6 5 12 2.5-6H21" },
  // a plug: where the brain learns from
  { href: "/connections", label: "Connections", icon: "M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

export default function Nav() {
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (path === "/login") return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null));
  }, [path]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Full page load so no cached signed-in page stays reachable after logout.
    window.location.replace("/login");
  }

  if (path === "/login") return null;
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {/* keeps the page content clear of the fixed sidebar */}
      <div className="hidden w-60 shrink-0 lg:block" aria-hidden />

      <aside className="fixed inset-x-0 top-0 z-50 flex items-center gap-1 border-b border-black/5 bg-[#f7f6f2]/90 px-3 py-2 backdrop-blur lg:inset-x-auto lg:bottom-0 lg:left-0 lg:w-60 lg:flex-col lg:items-stretch lg:gap-0 lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
        <Link href="/" className="mr-2 flex items-center gap-2.5 px-2 lg:mb-7 lg:mr-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#161616] text-white">
            <Icon d="M7 8a2 2 0 1 0 0-.01M17 8a2 2 0 1 0 0-.01M12 17a2 2 0 1 0 0-.01M8.4 9.4l2.4 5.4M15.6 9.4l-2.4 5.4M9 8h6" />
          </span>
          <span className="hidden font-serif text-xl leading-none sm:inline">Company brain</span>
        </Link>

        <nav aria-label="Main" className="flex gap-1 lg:flex-col">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on(t.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                on(t.href) ? "bg-white font-medium text-[#161616] shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-neutral-600 hover:bg-white/60 hover:text-neutral-900"
              }`}
            >
              <span className={on(t.href) ? "text-[#1463ff]" : ""}>
                <Icon d={t.icon} />
              </span>
              <span className="hidden sm:inline">{t.label}</span>
            </Link>
          ))}
        </nav>

        {user && (
          <div className="ml-auto flex items-center gap-2.5 lg:ml-0 lg:mt-auto lg:border-t lg:border-black/5 lg:px-2 lg:pt-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#161616] text-xs font-semibold text-white">{initials(user.name)}</span>
            <div className="hidden min-w-0 flex-1 lg:block">
              <div className="truncate text-sm font-medium text-neutral-900">{user.name}</div>
              <div className="truncate text-xs text-neutral-500">{user.team}</div>
            </div>
            <button onClick={signOut} title="Sign out" aria-label="Sign out" className="rounded-lg p-1.5 text-neutral-500 hover:bg-white hover:text-neutral-900">
              <Icon d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

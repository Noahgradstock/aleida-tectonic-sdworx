"use client";

import { useState } from "react";

// A full page load, not router.replace(): the router cached "/" as a redirect to /login from before
// the session existed, so a client-side navigation would land back on this page until a manual refresh.
const fullReload = (to: string) => window.location.replace(to);

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) return fullReload("/");
      setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  // Try the app as one of the demo colleagues, no password (e.g. for a jury). Same rules as a real sign-in.
  async function tryAs(persona: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ persona }) });
      if (res.ok) return fullReload(persona === "jan" ? "/loop" : "/");
      setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Demo sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#e9e8e6] to-[#dddcd9] px-4 text-[#161616]">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Company brain</div>
        <h1 className="font-serif text-3xl leading-tight tracking-tight">Sign in</h1>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="rounded-lg border border-black/10 px-3 py-2 text-sm text-[#161616] outline-none focus:border-[#1463ff]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="rounded-lg border border-black/10 px-3 py-2 text-sm text-[#161616] outline-none focus:border-[#1463ff]"
          />
        </label>
        {error && <p className="rounded-lg bg-[#ffe9ea] px-3 py-2 text-xs text-[#c62a30]">{error}</p>}
        <button
          disabled={busy}
          className="mt-1 rounded-full bg-[#161616] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div className="mt-3 border-t border-black/5 pt-4">
          <p className="text-xs font-medium text-neutral-700">Try it without a password</p>
          <p className="mt-0.5 text-[11px] text-neutral-500">Fictional colleagues with real roles. Switch person any time from the sidebar.</p>
          <div className="mt-3 grid gap-2">
            {[
              { id: "sofie", name: "Sofie Maes", role: "Payroll consultant", does: "Asks questions, feeds meetings, sees her log" },
              { id: "jan", name: "Jan Wouters", role: "Payroll expert", does: "Confirms, corrects and approves agreements" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => tryAs(p.id)}
                disabled={busy}
                className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2.5 text-left hover:border-[#1463ff] hover:bg-[#f5f8ff] disabled:opacity-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#161616] text-xs font-semibold text-white">
                  {p.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[#161616]">
                    Try as {p.name.split(" ")[0]} <span className="font-normal text-neutral-500">· {p.role}</span>
                  </span>
                  <span className="block truncate text-[11px] text-neutral-500">{p.does}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </main>
  );
}

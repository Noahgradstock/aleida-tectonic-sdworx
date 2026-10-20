// Shared server state: revoked sessions, rate-limit counters and votes.
// With Upstash Redis configured (Vercel Marketplace sets the env vars) every server instance sees the same state.
// Without it, state lives in memory: fine locally, but per instance and lost on restart.
// Talks to Upstash over its REST API with fetch, so no extra dependency.
// In production without Upstash every call fails (callers answer 503 or refuse), unless ALLOW_MEMORY_STORE=true
// is set on purpose for a single-instance demo: per-instance memory would make logout and rate limits ineffective.
import "server-only";

export interface Store {
  /** Adds 1 to a counter that expires windowMs after its first hit; returns the new value. */
  count(key: string, windowMs: number): Promise<number>;
  /** Takes 1 off a counter (a refunded login attempt). */
  uncount(key: string): Promise<void>;
  flag(key: string, ttlMs: number): Promise<void>;
  flagged(key: string): Promise<boolean>;
  hset(hash: string, field: string, value: string): Promise<void>;
  hvals(hash: string): Promise<string[]>;
}

class MemoryStore implements Store {
  private kv = new Map<string, { value: number; expiresAt: number }>();
  private hashes = new Map<string, Map<string, string>>();

  private live(key: string) {
    const e = this.kv.get(key);
    if (e && e.expiresAt <= Date.now()) this.kv.delete(key);
    return this.kv.get(key);
  }
  async count(key: string, windowMs: number) {
    const e = this.live(key);
    if (e) return ++e.value;
    this.kv.set(key, { value: 1, expiresAt: Date.now() + windowMs });
    if (this.kv.size > 10_000) for (const k of this.kv.keys()) this.live(k);
    return 1;
  }
  async uncount(key: string) {
    const e = this.live(key);
    if (e) e.value--;
  }
  async flag(key: string, ttlMs: number) {
    this.kv.set(key, { value: 1, expiresAt: Date.now() + ttlMs });
  }
  async flagged(key: string) {
    return !!this.live(key);
  }
  async hset(hash: string, field: string, value: string) {
    if (!this.hashes.has(hash)) this.hashes.set(hash, new Map());
    this.hashes.get(hash)!.set(field, value);
  }
  async hvals(hash: string) {
    return [...(this.hashes.get(hash)?.values() ?? [])];
  }
}

export class UpstashStore implements Store {
  constructor(
    private url: string,
    private token: string,
    private http: typeof fetch = fetch,
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const res = await this.http(`${this.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    const failed = out.find((r) => r.error);
    if (failed) throw new Error(`Upstash: ${failed.error}`);
    return out.map((r) => r.result);
  }

  async count(key: string, windowMs: number) {
    const [n] = await this.pipeline([["INCR", key], ["PEXPIRE", key, windowMs, "NX"]]);
    return Number(n);
  }
  async uncount(key: string) {
    await this.pipeline([["DECR", key]]);
  }
  async flag(key: string, ttlMs: number) {
    await this.pipeline([["SET", key, "1", "PX", Math.max(1, Math.round(ttlMs))]]);
  }
  async flagged(key: string) {
    const [v] = await this.pipeline([["EXISTS", key]]);
    return Number(v) === 1;
  }
  async hset(hash: string, field: string, value: string) {
    await this.pipeline([["HSET", hash, field, value]]);
  }
  async hvals(hash: string) {
    const [v] = await this.pipeline([["HVALS", hash]]);
    return (v as string[] | null) ?? [];
  }
}

function createStore(): Store {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) return new UpstashStore(url, token);
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_MEMORY_STORE === "true") return new MemoryStore();
  return unavailable;
}

// Fails every call: production must never silently fall back to per-instance memory.
// Decided on use, not at import, so `next build` still works without the env vars.
const unavailable: Store = new Proxy({} as Store, {
  get: () => async () => {
    throw new Error("No shared store configured (set Upstash Redis, or ALLOW_MEMORY_STORE=true for a single-instance demo)");
  },
});

// One store per server process (survives hot reload in dev).
const g = globalThis as typeof globalThis & { __tavlingStore?: Store };
export const store: Store = (g.__tavlingStore ??= createStore());
export const sharedStore = () => !(store instanceof MemoryStore);

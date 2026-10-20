"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import type { GraphEdge, GraphNode, KnowledgeGraph, PersonCv } from "@/trust-engine";

// "Who knows what": an Obsidian-style web of people, topics, documents and clients.
// Nothing here is maintained by hand: every node and edge comes from claims people wrote or said
// and answers they confirmed. Click a person for their knowledge CV, a topic for who to contact.

type N = GraphNode & SimulationNodeDatum;
type E = Omit<GraphEdge, "source" | "target"> & SimulationLinkDatum<N> & { source: string | N; target: string | N };
type Sel = { kind: "person" | "concept" | "document" | "client"; id: string } | null;

const W = 1100;
const H = 720;
const POLL_MS = 8_000; // pick up what the mascot learned without a reload

const KIND_COLOR: Record<GraphNode["kind"], string> = { person: "#161616", concept: "#1463ff", document: "#a3a3a3", client: "#9a6400" };
const radius = (n: GraphNode) =>
  n.kind === "person" ? 9 + Math.min(10, n.weight * 2.2) : n.kind === "concept" ? 5 + Math.min(9, n.weight * 0.9) : n.kind === "client" ? 7 : 3.5;
const idOf = (x: string | N) => (typeof x === "string" ? x : x.id);
const short = (s: string, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function WhoKnows() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [showClients, setShowClients] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<N[]>([]); // a copy of node positions per tick, so render never reads the ref
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const sim = useRef<Simulation<N, E> | null>(null);
  const nodesRef = useRef<Map<string, N>>(new Map());
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string | null; x: number; y: number; moved: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/brain/graph");
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in to see the knowledge web" : "Could not load the knowledge web");
      setGraph((await res.json()) as KnowledgeGraph);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Which nodes and edges are on screen.
  const visible = useMemo(() => {
    if (!graph) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };
    const keep = (n: GraphNode) => (n.kind === "document" ? showDocs : n.kind === "client" ? showClients : true);
    const nodes = graph.nodes.filter(keep);
    const ids = new Set(nodes.map((n) => n.id));
    return { nodes, edges: graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target)) };
  }, [graph, showDocs, showClients]);

  // Run the force layout. Existing nodes keep their position, so new knowledge "grows" into the web.
  useEffect(() => {
    const prev = nodesRef.current;
    const nodes: N[] = visible.nodes.map((n) => {
      const old = prev.get(n.id);
      return { ...n, x: old?.x ?? W / 2 + (Math.random() - 0.5) * 200, y: old?.y ?? H / 2 + (Math.random() - 0.5) * 200, vx: old?.vx, vy: old?.vy };
    });
    nodesRef.current = new Map(nodes.map((n) => [n.id, n]));
    const edges: E[] = visible.edges.map((e) => ({ ...e }));
    sim.current?.stop();
    const s = forceSimulation<N, E>(nodes)
      .force(
        "link",
        forceLink<N, E>(edges)
          .id((d) => d.id)
          .distance((e) => (e.kind === "works-with" ? 220 : e.kind === "knows" ? 110 + (1 - e.weight) * 90 : e.kind === "about" ? 70 : 60))
          .strength((e) => (e.kind === "works-with" ? 0.02 : 0.08 + e.weight * 0.3)),
      )
      .force("charge", forceManyBody<N>().strength((n) => (n.kind === "document" ? -60 : n.kind === "person" ? -900 : -320)))
      .force("collide", forceCollide<N>().radius((n) => radius(n) + (n.kind === "document" ? 4 : 16)))
      .force("center", forceCenter(W / 2, H / 2))
      .force("x", forceX<N>(W / 2).strength(0.015))
      .force("y", forceY<N>(H / 2).strength(0.03))
      .alpha(prev.size ? 0.4 : 1)
      .on("tick", () => {
        // Keep everything inside the canvas, with room for labels.
        for (const n of nodes) {
          n.x = Math.max(40, Math.min(W - 40, n.x ?? W / 2));
          n.y = Math.max(24, Math.min(H - 30, n.y ?? H / 2));
        }
        setLayout(nodes.map((n) => ({ ...n })));
      });
    sim.current = s;
    return () => {
      s.stop();
    };
  }, [visible]);

  // Neighbours of the focused node, for the Obsidian-style highlight.
  const focus = hover ?? (sel ? sel.id : null);
  const neighbours = useMemo(() => {
    if (!focus) return null;
    const set = new Set([focus]);
    for (const e of visible.edges) {
      if (e.source === focus) set.add(e.target);
      if (e.target === focus) set.add(e.source);
    }
    return set;
  }, [focus, visible.edges]);

  // Search: "who knows about meal vouchers" focuses the best matching topic.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^who knows (about )?/, "");
    if (q.length < 2 || !graph) return [];
    return graph.nodes.filter((n) => (n.kind === "concept" || n.kind === "person") && n.label.toLowerCase().includes(q)).slice(0, 6);
  }, [query, graph]);

  // Pan and zoom
  const toGraph = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * W;
    const sy = ((clientY - r.top) / r.height) * H;
    return { x: (sx - view.x) / view.k, y: (sy - view.y) / view.k };
  };
  const onWheel = (e: React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const sy = ((e.clientY - r.top) / r.height) * H;
    const k = Math.min(3, Math.max(0.4, view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    setView({ k, x: sx - ((sx - view.x) / view.k) * k, y: sy - ((sy - view.y) / view.k) * k });
  };
  const onDown = (e: React.PointerEvent, id: string | null) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { id, x: e.clientX, y: e.clientY, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 3) d.moved = true;
    if (d.id) {
      const n = nodesRef.current.get(d.id);
      if (!n) return;
      const p = toGraph(e.clientX, e.clientY);
      n.fx = p.x;
      n.fy = p.y;
      sim.current?.alphaTarget(0.2).restart();
    } else {
      const r = svgRef.current!.getBoundingClientRect();
      setView((v) => ({ ...v, x: v.x + ((e.clientX - d.x) / r.width) * W, y: v.y + ((e.clientY - d.y) / r.height) * H }));
      d.x = e.clientX;
      d.y = e.clientY;
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.id) {
      const n = nodesRef.current.get(d.id);
      if (n) {
        n.fx = null;
        n.fy = null;
      }
      sim.current?.alphaTarget(0);
      if (!d.moved) {
        const node = nodesRef.current.get(d.id);
        if (node) setSel({ kind: node.kind, id: node.id });
      }
    } else if (!d.moved) setSel(null);
  };

  const nodes = layout;
  const byId = new Map(layout.map((n) => [n.id, n]));
  const pos = (x: string | N) => byId.get(idOf(x));
  const dim = (id: string) => (neighbours ? !neighbours.has(id) : false);

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-20">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">Who knows what</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">The knowledge web</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            People, topics and clients, linked by what people actually wrote, said in meetings and confirmed. Nobody maintains it. Click a
            person for their knowledge CV, or a topic to see who to contact. All people and data are fictional.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Who knows about… (e.g. meal voucher)"
            aria-label="Search people and topics"
            maxLength={80}
            className="w-full rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white text-sm shadow-lg">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-neutral-50"
                    onClick={() => {
                      setSel({ kind: m.kind, id: m.id });
                      setQuery("");
                    }}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[m.kind] }} />
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <Legend color={KIND_COLOR.person} label="Person" />
        <Legend color={KIND_COLOR.concept} label="Topic" />
        <Legend color={KIND_COLOR.client} label="Client" />
        <Legend color={KIND_COLOR.document} label="Document" />
        <span className="mx-2 h-4 w-px bg-neutral-300" />
        <Toggle on={showClients} onClick={() => setShowClients((v) => !v)} label="Clients" />
        <Toggle on={showDocs} onClick={() => setShowDocs((v) => !v)} label="Documents" />
        <span className="ml-auto text-neutral-500">Scroll to zoom · drag to move · updates live from the mascot</span>
      </div>

      {error && <p className="mb-3 rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#c0392b]">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl bg-[#fbfaf7] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-[min(72vh,720px)] w-full touch-none select-none"
            onWheel={onWheel}
            onPointerDown={(e) => onDown(e, null)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            role="img"
            aria-label="Knowledge web of people, topics, documents and clients"
          >
            <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
              {visible.edges.map((e, i) => {
                const a = pos(e.source);
                const b = pos(e.target);
                if (a?.x == null || b?.x == null) return null;
                const on = neighbours && neighbours.has(e.source) && neighbours.has(e.target) && (e.source === focus || e.target === focus);
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={on ? (e.kind === "knows" ? "#1463ff" : "#525252") : "#d4d4d4"}
                    strokeWidth={(e.kind === "knows" ? 0.6 + e.weight * 3 : e.kind === "works-with" ? 0.5 + e.weight : 0.7) / Math.sqrt(view.k)}
                    strokeDasharray={e.kind === "works-with" ? "3 4" : undefined}
                    opacity={neighbours ? (on ? 0.95 : 0.12) : e.kind === "works-with" ? 0.35 : 0.6}
                  >
                    <title>{e.label}</title>
                  </line>
                );
              })}
              {nodes.map((n) => {
                if (n.x == null || n.y == null) return null;
                const r = radius(n);
                const left = n.kind === "person" && n.meta.left === true;
                const picked = sel?.id === n.id;
                const showLabel = n.kind === "person" || n.kind === "client" || (n.kind === "concept" && (n.weight >= 5 || view.k > 1.4 || !!neighbours?.has(n.id))) || picked;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    opacity={dim(n.id) ? 0.18 : 1}
                    className="cursor-pointer transition-opacity duration-200"
                    onPointerDown={(e) => onDown(e, n.id)}
                    onPointerEnter={() => setHover(n.id)}
                    onPointerLeave={() => setHover(null)}
                  >
                    {n.kind === "client" ? (
                      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2} fill={KIND_COLOR.client} />
                    ) : (
                      <circle
                        r={r}
                        fill={left ? "#fbfaf7" : KIND_COLOR[n.kind]}
                        stroke={left ? "#a3a3a3" : picked ? "#f59e0b" : "#fbfaf7"}
                        strokeWidth={left ? 1.5 : picked ? 3 : 1.5}
                        strokeDasharray={left ? "2 2" : undefined}
                      />
                    )}
                    {n.kind === "document" && n.meta.live === true && <circle r={r + 3} fill="none" stroke="#0f8a4f" strokeWidth={1.2} />}
                    {showLabel && (
                      <text
                        y={r + 12}
                        textAnchor="middle"
                        fontSize={(n.kind === "person" ? 12 : 10.5) / Math.sqrt(view.k)}
                        fontWeight={n.kind === "person" ? 600 : 400}
                        fill={left ? "#a3a3a3" : n.kind === "concept" ? "#1e3a8a" : "#262626"}
                        paintOrder="stroke"
                        stroke="#fbfaf7"
                        strokeWidth={3}
                      >
                        {short(n.label, n.kind === "concept" ? 30 : 24)}
                      </text>
                    )}
                    <title>{n.label}</title>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <aside className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] lg:max-h-[min(72vh,720px)] lg:overflow-y-auto">
          {graph && <Panel graph={graph} sel={sel} onSelect={setSel} />}
        </aside>
      </div>
    </main>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-neutral-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`rounded-full px-3 py-1 ${on ? "bg-[#161616] text-white" : "bg-white text-neutral-600 shadow-sm"}`}>
      {label}
    </button>
  );
}

function Panel({ graph, sel, onSelect }: { graph: KnowledgeGraph; sel: Sel; onSelect: (s: Sel) => void }) {
  const node = sel && graph.nodes.find((n) => n.id === sel.id);
  const name = (personId: string) => graph.cvs[personId]?.name ?? personId;

  if (!node) {
    const people = Object.values(graph.cvs).filter((c) => !c.left).sort((a, b) => b.entries.length - a.entries.length);
    return (
      <div>
        <h2 className="font-serif text-2xl">Knowledge CVs</h2>
        <p className="mt-1 text-xs text-neutral-500">Built from work that already happened. Pick someone.</p>
        <ul className="mt-3 space-y-2">
          {people.map((cv) => (
            <li key={cv.id}>
              <button onClick={() => onSelect({ kind: "person", id: `person:${cv.id}` })} className="w-full rounded-xl bg-neutral-50 px-3 py-2 text-left hover:bg-neutral-100">
                <div className="text-sm font-medium">{cv.name}</div>
                <div className="text-xs text-neutral-500">
                  {cv.team} · {cv.knownFor.length ? `known for ${cv.knownFor.slice(0, 2).join(", ").toLowerCase()}` : `${cv.entries.length} topics`}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (node.kind === "person") {
    const cv = graph.cvs[node.id.slice("person:".length)];
    if (!cv) return null;
    return <Cv cv={cv} graph={graph} name={name} onSelect={onSelect} />;
  }

  if (node.kind === "concept") {
    const key = node.id.slice("concept:".length);
    const who = graph.edges
      .filter((e) => e.kind === "knows" && e.target === node.id)
      .map((e) => ({ id: e.source.slice("person:".length), weight: e.weight, label: e.label }))
      .map((w) => ({ ...w, cv: graph.cvs[w.id] }))
      .filter((w) => w.cv)
      .sort((a, b) => Number(a.cv.left) - Number(b.cv.left) || b.weight - a.weight);
    const docs = graph.edges.filter((e) => e.kind === "states" && e.target === node.id).sort((a, b) => b.weight - a.weight);
    const first = who.find((w) => !w.cv.left);
    return (
      <div>
        <p className="text-xs uppercase tracking-widest text-[#1463ff]">Topic</p>
        <h2 className="mt-1 font-serif text-2xl leading-tight">{node.label}</h2>
        {first && (
          <p className="mt-3 rounded-xl bg-[#eef3ff] px-3 py-2 text-sm">
            Contact <b>{first.cv.name}</b> first. {first.label}.
          </p>
        )}
        <h3 className="mt-4 text-sm font-medium">Who knows this</h3>
        <ul className="mt-2 space-y-2">
          {who.map((w) => (
            <li key={w.id}>
              <button onClick={() => onSelect({ kind: "person", id: `person:${w.id}` })} className="w-full text-left">
                <div className="flex items-baseline justify-between text-sm">
                  <span className={w.cv.left ? "text-neutral-400 line-through" : "font-medium"}>{w.cv.name}</span>
                  <span className="text-xs text-neutral-500">{w.cv.left ? "left" : pct(w.weight)}</span>
                </div>
                <Strength value={w.cv.left ? 0 : w.weight} />
                <div className="mt-0.5 text-xs text-neutral-500">{w.label}</div>
              </button>
            </li>
          ))}
        </ul>
        <h3 className="mt-4 text-sm font-medium">Where it is written</h3>
        <ul className="mt-2 space-y-1 text-xs text-neutral-600">
          {docs.map((d) => (
            <li key={d.source} className="flex justify-between gap-2">
              <span className="truncate">{d.source.slice("doc:".length)}</span>
              <span className="shrink-0">{d.label.replace(/^States it \((.*)\)$/, "$1")}</span>
            </li>
          ))}
        </ul>
        <a href={`/loop?fact=${encodeURIComponent(key)}`} className="mt-4 inline-block text-sm font-medium text-[#1463ff] hover:underline">
          See how its score moved →
        </a>
      </div>
    );
  }

  const linked = graph.edges.filter((e) => e.source === node.id || e.target === node.id);
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-neutral-500">{node.kind === "client" ? "Client" : `Document · ${String(node.meta.channel)}`}</p>
      <h2 className="mt-1 font-serif text-2xl leading-tight">{node.label}</h2>
      {node.kind === "document" && <p className="mt-1 text-xs text-neutral-500">Last updated {String(node.meta.date)}</p>}
      <ul className="mt-3 space-y-1 text-sm">
        {linked.map((e, i) => {
          const other = e.source === node.id ? e.target : e.source;
          const n = graph.nodes.find((x) => x.id === other);
          return n ? (
            <li key={i}>
              <button onClick={() => onSelect({ kind: n.kind, id: n.id })} className="text-left hover:underline">
                {n.label}
              </button>{" "}
              <span className="text-xs text-neutral-500">· {e.label}</span>
            </li>
          ) : null;
        })}
      </ul>
    </div>
  );
}

function Cv({ cv, graph, name, onSelect }: { cv: PersonCv; graph: KnowledgeGraph; name: (id: string) => string; onSelect: (s: Sel) => void }) {
  const client = (id: string) => graph.nodes.find((n) => n.id === `client:${id}`)?.label ?? id;
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-neutral-500">Knowledge CV</p>
      <h2 className={`mt-1 font-serif text-2xl ${cv.left ? "text-neutral-400" : ""}`}>{cv.name}</h2>
      <p className="text-xs text-neutral-500">
        {cv.team} · {cv.role}
        {cv.left ? " · has left" : ""}
      </p>
      <p className="mt-3 text-sm">{cv.summary}</p>

      <h3 className="mt-4 text-sm font-medium">What they know</h3>
      <ul className="mt-2 space-y-3">
        {cv.entries.map((e) => (
          <li key={e.factKey}>
            <button onClick={() => onSelect({ kind: "concept", id: `concept:${e.factKey}` })} className="w-full text-left">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{e.label}</span>
                <span className="shrink-0 text-xs text-neutral-500">{pct(e.strength)}</span>
              </div>
              <Strength value={e.strength} />
              <div className="mt-1 text-xs text-neutral-500">
                {[e.total ? `right ${e.right} of ${e.total}` : null, e.confirmations ? `confirmed ${e.confirmations}×` : null].filter(Boolean).join(" · ")}
              </div>
              {e.lastSeen && (
                <div className="mt-1 border-l-2 border-neutral-200 pl-2 text-xs italic text-neutral-600">
                  “{short(e.lastSeen.quote, 140)}” <span className="not-italic text-neutral-400">· {e.lastSeen.channel}, {e.lastSeen.date}</span>
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>

      {cv.clients.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-medium">Clients</h3>
          <p className="mt-1 text-xs text-neutral-600">{cv.clients.map(client).join(", ")}</p>
        </>
      )}
      {cv.colleagues.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-medium">Knows the same as</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {cv.colleagues.slice(0, 6).map((c) => (
              <button key={c.id} onClick={() => onSelect({ kind: "person", id: `person:${c.id}` })} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs hover:bg-neutral-200">
                {name(c.id)} · {c.shared}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Strength({ value }: { value: number }) {
  return (
    <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-neutral-100">
      <span className="block h-full rounded-full bg-[#1463ff] transition-all duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </span>
  );
}

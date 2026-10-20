"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import type { Doc } from "@/lib/documents";
import { DOMAINS, type DomainId, type GraphEdge, type GraphNode, type KnowledgeGraph, type PersonCv } from "@/trust-engine";
import { Viewer, type ClaimScores } from "./documents";

// The Brain: one living web of people, topics, documents and clients.
// Two lenses on the same nodes: People (who knows what) and Sources (what is written where).
// Topics sit in domain regions and are coloured by how far you can trust them today.
// Nothing here is maintained by hand: every node and edge comes from work people already did.

type N = GraphNode & SimulationNodeDatum;
type E = Omit<GraphEdge, "source" | "target"> & SimulationLinkDatum<N> & { source: string | N; target: string | N };
type Sel = { kind: GraphNode["kind"]; id: string } | null;
type Lens = "people" | "sources";
type TopicStatus = { status: "trusted" | "conflict" | "stale" | "orphan" | "empty"; answer: string | null; score: number | null };
type BrainGraph = KnowledgeGraph & { topics: Record<string, TopicStatus>; reference: string };

const W = 1100;
const H = 720;
const POLL_MS = 8_000; // pick up what the mascot learned without a reload

// Domain regions on a ring around the centre.
const DOMAIN_POS: Record<DomainId, { x: number; y: number }> = Object.fromEntries(
  DOMAINS.map((d, i) => {
    const a = -Math.PI / 2 + (i / DOMAINS.length) * Math.PI * 2;
    return [d.id, { x: W / 2 + Math.cos(a) * 290, y: H / 2 + Math.sin(a) * 230 }];
  }),
) as Record<DomainId, { x: number; y: number }>;

const STATUS: Record<TopicStatus["status"], { color: string; label: string }> = {
  trusted: { color: "#0f8a4f", label: "Trusted" },
  conflict: { color: "#c98a00", label: "Sources disagree" },
  stale: { color: "#8a8a8a", label: "Out of date" },
  orphan: { color: "#c0392b", label: "Nobody backs it" },
  empty: { color: "#c4c4c4", label: "No answer yet" },
};
const CHANNEL_COLOR: Record<string, string> = { official: "#1463ff", sharepoint: "#0b7a75", teams: "#5b5fc7", email: "#0078d4", meeting: "#c98a00" };
const CHANNEL_LABEL: Record<string, string> = { official: "Official", sharepoint: "SharePoint", teams: "Teams", email: "Email", meeting: "Meeting" };

const radius = (n: GraphNode) =>
  n.kind === "person" ? 9 + Math.min(10, n.weight * 2.2) : n.kind === "concept" ? 6 + Math.min(9, n.weight * 0.8) : n.kind === "client" ? 7 : 4.5;
const idOf = (x: string | N) => (typeof x === "string" ? x : x.id);
const short = (s: string, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const keyOf = (id: string) => id.slice(id.indexOf(":") + 1);

export default function BrainWeb({ docs, scores }: { docs: Doc[]; scores: ClaimScores }) {
  const [graph, setGraph] = useState<BrainGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lens, setLens] = useState<Lens>("people");
  const [hover, setHover] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [openDoc, setOpenDoc] = useState<Doc | null>(null);
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
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in to see the brain" : "Could not load the brain");
      setGraph((await res.json()) as BrainGraph);
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

  const docByFile = useMemo(() => new Map(docs.map((d) => [d.path, d])), [docs]);
  const statusOf = useCallback((n: GraphNode) => graph?.topics[keyOf(n.id)] ?? null, [graph]);

  // The lens decides which kinds are on screen; the nodes themselves never change.
  const visible = useMemo(() => {
    if (!graph) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };
    const keep = (n: GraphNode) => (lens === "people" ? n.kind !== "document" : n.kind === "concept" || n.kind === "document");
    const nodes = graph.nodes.filter(keep);
    const ids = new Set(nodes.map((n) => n.id));
    return { nodes, edges: graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target)) };
  }, [graph, lens]);

  // Force layout. Topics are pulled into their domain region; people float between what they know.
  // Existing nodes keep their position, so new knowledge "grows" into the web.
  useEffect(() => {
    const prev = nodesRef.current;
    const home = (n: GraphNode) => DOMAIN_POS[(n.meta.domain as DomainId) ?? "pay"] ?? { x: W / 2, y: H / 2 };
    const nodes: N[] = visible.nodes.map((n) => {
      const old = prev.get(n.id);
      const h = n.kind === "concept" ? home(n) : { x: W / 2, y: H / 2 };
      return { ...n, x: old?.x ?? h.x + (Math.random() - 0.5) * 120, y: old?.y ?? h.y + (Math.random() - 0.5) * 120, vx: old?.vx, vy: old?.vy };
    });
    nodesRef.current = new Map(nodes.map((n) => [n.id, n]));
    const edges: E[] = visible.edges.map((e) => ({ ...e }));
    sim.current?.stop();
    const s = forceSimulation<N, E>(nodes)
      .force(
        "link",
        forceLink<N, E>(edges)
          .id((d) => d.id)
          .distance((e) => (e.kind === "works-with" ? 220 : e.kind === "knows" ? 100 + (1 - e.weight) * 80 : e.kind === "about" ? 70 : 45))
          .strength((e) => (e.kind === "works-with" ? 0.01 : e.kind === "states" ? 0.5 : 0.03 + e.weight * 0.08)),
      )
      .force("charge", forceManyBody<N>().strength((n) => (n.kind === "document" ? -50 : n.kind === "person" ? -500 : -120)))
      .force("collide", forceCollide<N>().radius((n) => radius(n) + (n.kind === "document" ? 3 : 14)))
      .force("x", forceX<N>((n) => (n.kind === "concept" ? home(n).x : W / 2)).strength((n) => (n.kind === "concept" ? 0.45 : 0.02)))
      .force("y", forceY<N>((n) => (n.kind === "concept" ? home(n).y : H / 2)).strength((n) => (n.kind === "concept" ? 0.45 : 0.03)))
      .alpha(prev.size ? 0.4 : 1)
      .on("tick", () => {
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

  // Domain regions: where their topics actually ended up.
  const regions = useMemo(
    () =>
      DOMAINS.map((d) => {
        const own = layout.filter((n) => n.kind === "concept" && n.meta.domain === d.id && n.x != null);
        if (!own.length) return null;
        const x = own.reduce((s, n) => s + n.x!, 0) / own.length;
        const y = own.reduce((s, n) => s + n.y!, 0) / own.length;
        const r = Math.min(150, Math.max(70, ...own.map((n) => Math.hypot(n.x! - x, n.y! - y) + 40)));
        const counts = own.reduce<Record<string, number>>((m, n) => {
          const st = statusOf(n)?.status ?? "empty";
          m[st] = (m[st] ?? 0) + 1;
          return m;
        }, {});
        return { ...d, x, y, r, topics: own.length, counts };
      }).filter((r): r is NonNullable<typeof r> => !!r),
    [layout, statusOf],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^who knows (about )?/, "");
    if (q.length < 2 || !graph) return [];
    return graph.nodes.filter((n) => n.kind !== "document" && n.label.toLowerCase().includes(q)).slice(0, 6);
  }, [query, graph]);

  // Pan and zoom
  const toGraph = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * W;
    const sy = ((clientY - r.top) / r.height) * H;
    return { x: (sx - view.x) / view.k, y: (sy - view.y) / view.k };
  };
  const zoomTo = (x: number, y: number, k: number) => setView({ k, x: W / 2 - x * k, y: H / 2 - y * k });
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
  const select = (n: GraphNode) => {
    setSel({ kind: n.kind, id: n.id });
    const doc = n.kind === "document" && typeof n.meta.file === "string" ? docByFile.get(n.meta.file) : undefined;
    if (doc) setOpenDoc(doc);
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
      if (!d.moved && n) select(n);
    } else if (!d.moved) setSel(null);
  };

  const byId = new Map(layout.map((n) => [n.id, n]));
  const pos = (x: string | N) => byId.get(idOf(x));
  const dim = (id: string) => (neighbours ? !neighbours.has(id) : false);
  const nodeColor = (n: GraphNode) =>
    n.kind === "concept"
      ? STATUS[statusOf(n)?.status ?? "empty"].color
      : n.kind === "document"
        ? (CHANNEL_COLOR[String(n.meta.channel)] ?? "#a3a3a3")
        : n.kind === "client"
          ? "#9a6400"
          : "#161616";
  const totals = graph ? Object.values(graph.topics).reduce<Record<string, number>>((m, t) => ((m[t.status] = (m[t.status] ?? 0) + 1), m), {}) : {};

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-20">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">The brain{graph ? ` · scored for ${graph.reference}` : ""}</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">What we know, and who knows it</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Every topic is coloured by how far you can trust it today. People sit next to what they have been right about. It is built only from
            work people already did, and it updates live. All people and data are fictional.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Who knows about… (e.g. meal voucher)"
            aria-label="Search people, topics and clients"
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
                      select(m);
                      const p = pos(m.id);
                      if (p?.x != null && p.y != null) zoomTo(p.x, p.y, 1.6);
                      setQuery("");
                    }}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: nodeColor(m) }} />
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex rounded-full bg-white p-0.5 shadow-sm" role="tablist" aria-label="Lens">
          {(["people", "sources"] as const).map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={lens === l}
              onClick={() => {
                setLens(l);
                setSel(null);
              }}
              className={`rounded-full px-3 py-1 ${lens === l ? "bg-[#161616] text-white" : "text-neutral-600"}`}
            >
              {l === "people" ? "People: who knows what" : "Sources: what is written where"}
            </button>
          ))}
        </div>
        <span className="mx-1 h-4 w-px bg-neutral-300" />
        {(["trusted", "conflict", "stale", "orphan"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-neutral-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[s].color }} />
            {STATUS[s].label} {totals[s] ? `(${totals[s]})` : ""}
          </span>
        ))}
        <span className="mx-1 h-4 w-px bg-neutral-300" />
        {lens === "people" ? (
          <>
            <Legend color="#161616" label="Person" />
            <Legend color="#9a6400" label="Client" square />
          </>
        ) : (
          Object.entries(CHANNEL_LABEL).map(([k, v]) => <Legend key={k} color={CHANNEL_COLOR[k]} label={v} small />)
        )}
        <button onClick={() => setView({ x: 0, y: 0, k: 1 })} className="ml-auto rounded-full bg-white px-3 py-1 text-neutral-600 shadow-sm">
          Reset view
        </button>
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
            aria-label="The brain: people, topics, documents and clients"
          >
            <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
              {regions.map((r) => (
                <g key={r.id}>
                  <circle cx={r.x} cy={r.y} r={r.r} fill="#f1efe9" opacity={0.55} />
                  <text
                    x={r.x}
                    y={r.y - r.r + 16}
                    textAnchor="middle"
                    fontSize={13 / Math.sqrt(view.k)}
                    fontWeight={600}
                    fill="#737373"
                    className="cursor-pointer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => zoomTo(r.x, r.y, 1.8)}
                  >
                    {r.label}
                    <tspan fontWeight={400} fill="#a3a3a3">
                      {"  "}
                      {r.topics} topic{r.topics > 1 ? "s" : ""}
                      {r.counts.conflict ? ` · ${r.counts.conflict} disputed` : ""}
                    </tspan>
                  </text>
                </g>
              ))}
              {visible.edges.map((e, i) => {
                const a = pos(e.source);
                const b = pos(e.target);
                if (a?.x == null || b?.x == null) return null;
                const on = !!neighbours && neighbours.has(e.source) && neighbours.has(e.target) && (e.source === focus || e.target === focus);
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={on ? (e.kind === "knows" ? "#1463ff" : "#525252") : "#d4d4d4"}
                    strokeWidth={(e.kind === "knows" ? 0.6 + e.weight * 3 : e.kind === "works-with" ? 0.5 + e.weight : 0.8) / Math.sqrt(view.k)}
                    strokeDasharray={e.kind === "works-with" ? "3 4" : undefined}
                    opacity={neighbours ? (on ? 0.95 : 0.1) : e.kind === "works-with" ? 0.3 : 0.55}
                  >
                    <title>{e.label}</title>
                  </line>
                );
              })}
              {layout.map((n) => {
                if (n.x == null || n.y == null) return null;
                const r = radius(n);
                const left = n.kind === "person" && n.meta.left === true;
                const picked = sel?.id === n.id;
                const st = n.kind === "concept" ? statusOf(n) : null;
                const showLabel =
                  n.kind === "person" ||
                  n.kind === "client" ||
                  picked ||
                  !!neighbours?.has(n.id) ||
                  (n.kind === "concept" && (n.weight >= 5 || view.k > 1.4 || st?.status === "conflict")) ||
                  (n.kind === "document" && view.k > 1.8);
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
                      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2} fill="#9a6400" />
                    ) : n.kind === "document" ? (
                      <rect x={-r} y={-r * 1.25} width={r * 2} height={r * 2.5} rx={1} fill={nodeColor(n)} opacity={0.85} />
                    ) : (
                      <circle
                        r={r}
                        fill={left ? "#fbfaf7" : nodeColor(n)}
                        stroke={left ? "#a3a3a3" : picked ? "#161616" : "#fbfaf7"}
                        strokeWidth={left ? 1.5 : picked ? 3 : 1.5}
                        strokeDasharray={left ? "2 2" : undefined}
                      />
                    )}
                    {st?.status === "conflict" && <circle r={r + 4} fill="none" stroke={STATUS.conflict.color} strokeWidth={1.5} className="animate-pulse" />}
                    {n.kind === "document" && n.meta.live === true && <circle r={r + 4} fill="none" stroke="#0f8a4f" strokeWidth={1.2} />}
                    {showLabel && (
                      <text
                        y={r + 12}
                        textAnchor="middle"
                        fontSize={(n.kind === "person" ? 12 : 10.5) / Math.sqrt(view.k)}
                        fontWeight={n.kind === "person" ? 600 : 400}
                        fill={left ? "#a3a3a3" : n.kind === "concept" ? "#262626" : "#404040"}
                        paintOrder="stroke"
                        stroke="#fbfaf7"
                        strokeWidth={3}
                      >
                        {short(n.label, n.kind === "concept" ? 30 : 24)}
                        {st?.answer && (view.k > 1.2 || picked || neighbours?.has(n.id)) ? ` · ${st.answer}` : ""}
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
          {graph && (
            <Panel
              graph={graph}
              sel={sel}
              lens={lens}
              onSelect={(id) => {
                const n = graph.nodes.find((x) => x.id === id);
                if (n) select(n);
              }}
              docByFile={docByFile}
              onOpenDoc={setOpenDoc}
            />
          )}
        </aside>
      </div>

      {openDoc && <Viewer doc={openDoc} scores={scores} onClose={() => setOpenDoc(null)} />}
    </main>
  );
}

function Legend({ color, label, square, small }: { color: string; label: string; square?: boolean; small?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-neutral-600">
      <span className={`${small ? "h-2.5 w-2" : "h-2.5 w-2.5"} ${square || small ? "rounded-sm" : "rounded-full"}`} style={{ background: color }} />
      {label}
    </span>
  );
}

type PanelProps = {
  graph: BrainGraph;
  sel: Sel;
  lens: Lens;
  onSelect: (id: string) => void;
  docByFile: Map<string, Doc>;
  onOpenDoc: (d: Doc) => void;
};

function Panel({ graph, sel, lens, onSelect, docByFile, onOpenDoc }: PanelProps) {
  const node = sel && graph.nodes.find((n) => n.id === sel.id);

  if (!node) return <Overview graph={graph} lens={lens} onSelect={onSelect} />;
  if (node.kind === "person") {
    const cv = graph.cvs[keyOf(node.id)];
    return cv ? <Cv cv={cv} graph={graph} onSelect={onSelect} /> : null;
  }
  if (node.kind === "concept") return <Topic node={node} graph={graph} onSelect={onSelect} docByFile={docByFile} onOpenDoc={onOpenDoc} />;

  const linked = graph.edges.filter((e) => e.source === node.id || e.target === node.id);
  const doc = node.kind === "document" && typeof node.meta.file === "string" ? docByFile.get(node.meta.file) : undefined;
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-neutral-500">
        {node.kind === "client" ? "Client" : `Document · ${CHANNEL_LABEL[String(node.meta.channel)] ?? node.meta.channel}`}
      </p>
      <h2 className="mt-1 font-serif text-2xl leading-tight">{node.label}</h2>
      {node.kind === "document" && (
        <p className="mt-1 text-xs text-neutral-500">
          Last updated {String(node.meta.date)}
          {node.meta.live === true ? " · learned live from everyday work" : ""}
        </p>
      )}
      {doc && (
        <button onClick={() => onOpenDoc(doc)} className="mt-3 rounded-full bg-[#161616] px-3 py-1.5 text-xs font-medium text-white">
          Open document
        </button>
      )}
      <ul className="mt-3 space-y-1 text-sm">
        {linked.map((e, i) => {
          const other = e.source === node.id ? e.target : e.source;
          const n = graph.nodes.find((x) => x.id === other);
          return n ? (
            <li key={i}>
              <button onClick={() => onSelect(n.id)} className="text-left hover:underline">
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

function Overview({ graph, lens, onSelect }: { graph: BrainGraph; lens: Lens; onSelect: (id: string) => void }) {
  // What needs a human: disputed and unbacked topics first. Everything else maintains itself.
  const attention = graph.nodes
    .filter((n) => n.kind === "concept")
    .map((n) => ({ n, t: graph.topics[keyOf(n.id)] }))
    .filter((x) => x.t && (x.t.status === "conflict" || x.t.status === "orphan" || x.t.status === "stale"));
  const total = graph.nodes.filter((n) => n.kind === "concept").length;
  const people = Object.values(graph.cvs)
    .filter((c) => !c.left)
    .sort((a, b) => b.knownFor.length - a.knownFor.length || b.entries.length - a.entries.length);
  return (
    <div>
      <h2 className="font-serif text-2xl">Brain health</h2>
      <p className="mt-1 text-sm text-neutral-600">
        <b>{total - attention.length}</b> of {total} topics maintain themselves. <b>{attention.length}</b> need a human.
      </p>
      {attention.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {attention.map(({ n, t }) => (
            <li key={n.id}>
              <button onClick={() => onSelect(n.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-neutral-50">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS[t.status].color }} />
                <span className="flex-1">{n.label}</span>
                <span className="text-xs text-neutral-500">{STATUS[t.status].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {lens === "people" && (
        <>
          <h3 className="mt-5 text-sm font-medium">Knowledge CVs</h3>
          <ul className="mt-2 space-y-2">
            {people.map((cv) => (
              <li key={cv.id}>
                <button onClick={() => onSelect(`person:${cv.id}`)} className="w-full rounded-xl bg-neutral-50 px-3 py-2 text-left hover:bg-neutral-100">
                  <div className="text-sm font-medium">{cv.name}</div>
                  <div className="text-xs text-neutral-500">
                    {cv.team} · {cv.knownFor.length ? `known for ${cv.knownFor.slice(0, 2).join(", ").toLowerCase()}` : `${cv.entries.length} topics`}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {lens === "sources" && <p className="mt-5 text-xs text-neutral-500">Click a document to open it with the exact quote highlighted.</p>}
    </div>
  );
}

function Topic({ node, graph, onSelect, docByFile, onOpenDoc }: { node: GraphNode; graph: BrainGraph; onSelect: (id: string) => void; docByFile: Map<string, Doc>; onOpenDoc: (d: Doc) => void }) {
  const t = graph.topics[keyOf(node.id)];
  const who = graph.edges
    .filter((e) => e.kind === "knows" && e.target === node.id)
    .map((e) => ({ id: keyOf(e.source), weight: e.weight, label: e.label, cv: graph.cvs[keyOf(e.source)] }))
    .filter((w) => w.cv)
    .sort((a, b) => Number(a.cv.left) - Number(b.cv.left) || b.weight - a.weight);
  const docs = graph.edges
    .filter((e) => e.kind === "states" && e.target === node.id)
    .map((e) => ({ e, n: graph.nodes.find((x) => x.id === e.source) }))
    .sort((a, b) => b.e.weight - a.e.weight);
  const first = who.find((w) => !w.cv.left);
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-neutral-500">Topic</p>
      <h2 className="mt-1 font-serif text-2xl leading-tight">{node.label}</h2>
      {t && (
        <div className="mt-3 flex items-end gap-3">
          <span className="font-serif text-4xl leading-none">{t.answer ?? "–"}</span>
          <span className="pb-0.5 text-sm font-medium" style={{ color: STATUS[t.status].color }}>
            {t.score != null ? `${pct(t.score)} · ` : ""}
            {STATUS[t.status].label}
          </span>
        </div>
      )}
      <p className="mt-1 text-xs text-neutral-500">Scored for {graph.reference}</p>
      {first && (
        <p className="mt-3 rounded-xl bg-[#eef3ff] px-3 py-2 text-sm">
          Contact <b>{first.cv.name}</b> first. {first.label}.
        </p>
      )}
      <h3 className="mt-4 text-sm font-medium">Who knows this</h3>
      <ul className="mt-2 space-y-2">
        {who.map((w) => (
          <li key={w.id}>
            <button onClick={() => onSelect(`person:${w.id}`)} className="w-full text-left">
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
        {docs.map(({ e, n }) => {
          const doc = n && typeof n.meta.file === "string" ? docByFile.get(n.meta.file) : undefined;
          return (
            <li key={e.source} className="flex items-center justify-between gap-2">
              <button onClick={() => (doc ? onOpenDoc(doc) : onSelect(e.source))} className="flex min-w-0 items-center gap-1.5 text-left hover:underline">
                <span className="h-2 w-1.5 shrink-0 rounded-sm" style={{ background: CHANNEL_COLOR[String(n?.meta.channel)] ?? "#a3a3a3" }} />
                <span className="truncate">{keyOf(e.source)}</span>
              </button>
              <span className="shrink-0">{e.label.replace(/^States it \((.*)\)$/, "$1")}</span>
            </li>
          );
        })}
      </ul>
      <a href={`/loop?fact=${encodeURIComponent(keyOf(node.id))}`} className="mt-4 inline-block text-sm font-medium text-[#1463ff] hover:underline">
        See how its score moved →
      </a>
    </div>
  );
}

function Cv({ cv, graph, onSelect }: { cv: PersonCv; graph: BrainGraph; onSelect: (id: string) => void }) {
  const client = (id: string) => graph.nodes.find((n) => n.id === `client:${id}`)?.label ?? id;
  const name = (id: string) => graph.cvs[id]?.name ?? id;
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
        {cv.entries.map((e) => {
          const t = graph.topics[e.factKey];
          return (
            <li key={e.factKey}>
              <button onClick={() => onSelect(`concept:${e.factKey}`)} className="w-full text-left">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    {t && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS[t.status].color }} title={STATUS[t.status].label} />}
                    {e.label}
                  </span>
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
          );
        })}
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
              <button key={c.id} onClick={() => onSelect(`person:${c.id}`)} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs hover:bg-neutral-200">
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

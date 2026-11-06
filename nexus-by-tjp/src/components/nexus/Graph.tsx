import { useId, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoLearning } from "./DemoLearningProvider";
import { edges as sampleEdges, nodes as sampleNodes, edgeTone, type GEdge, type GNode, type KState, type EdgeState } from "@/lib/nexus-data";

const nodeFill: Record<KState, string> = {
  Seen: "var(--muted-foreground)", Recovered: "var(--accent-foreground)",
  Understood: "var(--derived)", Applied: "var(--primary)", Verified: "var(--success)",
  Connected: "var(--success)", Uncertain: "var(--verify)",
};

export function Graph({ selected, onSelect, compact = false, graphNodes, graphEdges: dataEdges }: { selected?: GEdge | null; onSelect?: (e: GEdge) => void; compact?: boolean; graphNodes?: GNode[] | undefined; graphEdges?: GEdge[] | undefined }) {
  const { connectionSaved } = useDemoLearning();
  const isSample = !graphNodes && !dataEdges;
  const nodes = graphNodes ?? sampleNodes;
  const baseEdges = dataEdges ?? sampleEdges;
  const graphEdges = isSample
    ? baseEdges.map((edge) => edge.from === "ef" && edge.to === "pn" ? { ...edge, state: connectionSaved ? "Student Verified" as const : "Needs Review" as const, evidence: connectionSaved ? "Passed authored demo causal-chain and voltage check · session only" : "Awaiting this session’s understanding check", verified: connectionSaved ? "This demo session" : "N/A" } : edge)
    : baseEdges;
  const id = useId().replace(/:/g, "");
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState<EdgeState | "All">("All");
  const [active, setActive] = useState<string | null>(null);
  const [localSelected, setLocalSelected] = useState<GEdge | null>(null);
  const current = selected ?? localSelected;
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const visibleEdges = graphEdges.filter((edge) => filter === "All" || edge.state === filter);
  function choose(edge: GEdge) { setLocalSelected(edge); onSelect?.(edge); }
  return <div className="graph-canvas min-w-0">
    {!compact && <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
      <select aria-label="Filter graph connections" value={filter} onChange={(event) => setFilter(event.target.value as EdgeState | "All")} className="max-w-full rounded border bg-card px-2 py-1 font-mono text-xs">
        <option>All</option>{Object.keys(edgeTone).map((state) => <option key={state}>{state}</option>)}
      </select>
      <div className="flex items-center gap-1"><Button variant="ghost" size="icon" title="Zoom out" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(.75, value - .25))}><Minus /></Button><span className="w-10 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span><Button variant="ghost" size="icon" title="Zoom in" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(2, value + .25))}><Plus /></Button><Button variant="ghost" size="icon" title="Reset graph" aria-label="Reset graph" onClick={() => { setZoom(1); setFilter("All"); setActive(null); }}><RotateCcw /></Button></div>
    </div>}
    <div className="overflow-auto bg-graph">
      <svg viewBox="0 0 840 580" role="group" aria-label="Engineering knowledge graph" className={compact ? "h-auto w-full min-w-0" : "h-auto w-full min-w-[520px]"}>
        <defs>{Object.entries(edgeTone).map(([key, color]) => <marker key={key} id={`${id}-${key.replace(/\s/g, "")}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill={color} /></marker>)}</defs>
        <g transform={`translate(${420 * (1 - zoom)},${290 * (1 - zoom)}) scale(${zoom})`}>
          {visibleEdges.map((edge, index) => {
            const a = byId[edge.from], b = byId[edge.to];
            if (!a || !b) return null;
            const ax = a.x * 1.16 + 40, bx = b.x * 1.16 + 40;
            const dx = bx - ax, dy = b.y - a.y, length = Math.hypot(dx, dy);
            const x2 = bx - dx / length * 18, y2 = b.y - dy / length * 18;
            const muted = active && active !== edge.from && active !== edge.to;
            return <g key={index} role="button" tabIndex={0} aria-label={`${a.label} to ${b.label}: ${edge.state}`} className="cursor-pointer" opacity={muted ? .2 : 1} onClick={() => choose(edge)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(edge); } }}>
              <title>{`${a.label} → ${b.label}: ${edge.state}`}</title>
              <line x1={ax} y1={a.y} x2={bx} y2={b.y} stroke="transparent" strokeWidth="18" />
              <line x1={ax} y1={a.y} x2={x2} y2={y2} stroke={edgeTone[edge.state]} strokeWidth={current === edge ? 3 : 1.8} strokeDasharray={edge.state === "AI Suggested" || edge.state === "Needs Review" ? "6 5" : undefined} markerEnd={`url(#${id}-${edge.state.replace(/\s/g, "")})`} />
              {!compact && <text x={(ax + bx) / 2} y={(a.y + b.y) / 2 - 8} textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10" paintOrder="stroke" stroke="var(--card)" strokeWidth="4">{edge.rel}</text>}
            </g>;
          })}
          {nodes.map((node) => {
            const x = node.x * 1.16 + 40;
            const related = !active || active === node.id || visibleEdges.some((edge) => (edge.from === active && edge.to === node.id) || (edge.to === active && edge.from === node.id));
            return <g key={node.id} role="button" tabIndex={0} aria-label={`Concept ${node.label}`} className="graph-node cursor-pointer" opacity={related ? 1 : .3} onClick={() => { setActive(active === node.id ? null : node.id); const edge = visibleEdges.find((item) => item.from === node.id || item.to === node.id); if (edge) choose(edge); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(node.id); const edge = visibleEdges.find((item) => item.from === node.id || item.to === node.id); if (edge) choose(edge); } }}>
              <rect x={x - 104} y={node.y - 23} width="208" height="59" rx="4" fill="var(--card)" stroke={active === node.id ? "var(--primary)" : "var(--border)"} />
              <circle cx={x - 88} cy={node.y - 5} r="4" fill={nodeFill[isSample && node.id === "pn" && connectionSaved ? "Connected" : node.state]} />
              <text x={x - 76} y={node.y - 1} className="fill-foreground" fontSize="12" fontWeight="600">{node.label}</text>
              <text x={x - 88} y={node.y + 19} className="fill-muted-foreground font-mono" fontSize="10">{node.course} · {isSample && node.id === "pn" && connectionSaved ? "Connected" : node.state}</text>
            </g>;
          })}
        </g>
      </svg>
    </div>
    {!compact && <div className="flex flex-wrap justify-between gap-2 border-t px-3 py-2 font-mono text-[10px] text-muted-foreground"><span>{nodes.length} concepts · {visibleEdges.length} connections</span><span>{active ? byId[active]?.label : "Cross-course network"}</span></div>}
  </div>;
}

export function GraphLegend() {
  return <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] text-muted-foreground">{Object.entries(edgeTone).map(([key, color]) => <span key={key} className="flex items-center gap-1.5"><svg width="16" height="4" aria-hidden><line x1="0" y1="2" x2="16" y2="2" stroke={color} strokeWidth="2" strokeDasharray={key === "AI Suggested" || key === "Needs Review" ? "4 3" : undefined} /></svg>{key}</span>)}</div>;
}
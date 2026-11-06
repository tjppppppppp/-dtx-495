import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopBar, Panel, Pill } from "@/components/nexus/Shell";
import { Graph, GraphLegend } from "@/components/nexus/Graph";
import { MathTex } from "@/components/nexus/Math";
import { edges, nodes, edgeTone, stateTone, type GEdge, type GNode, type KState, type EdgeState } from "@/lib/nexus-data";
import { listConcepts, listConnections } from "@/lib/graph.functions";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Knowledge Map · Nexus" },
      { name: "description", content: "A verified graph of how your concepts connect, with evidence behind every link." },
      { property: "og:title", content: "Knowledge Map · Nexus" },
      { property: "og:description", content: "Every connection in your education, with provenance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

const states: KState[] = ["Seen", "Recovered", "Understood", "Applied", "Verified", "Connected", "Uncertain"];

const STATE_MAP: Record<string, KState> = {
  seen: "Seen", recovered: "Recovered", understood: "Understood", applied: "Applied",
  verified: "Verified", connected: "Connected", uncertain: "Uncertain", misconception: "Uncertain",
};

const PROVENANCE_MAP: Record<string, EdgeState> = {
  "student-verified": "Student Verified",
  "source-verified": "Source Verified",
  "ai-suggested": "AI Suggested",
  "needs-review": "Needs Review",
};

function MapPage() {
  const fetchConcepts = useServerFn(listConcepts);
  const fetchConnections = useServerFn(listConnections);
  const { data: concepts = [] } = useQuery({ queryKey: ["concepts"], queryFn: () => fetchConcepts() });
  const { data: connections = [] } = useQuery({ queryKey: ["connections"], queryFn: () => fetchConnections() });

  const real = useMemo(() => {
    if (concepts.length === 0) return null;
    // Circular layout inside the 840×580 viewBox (x is scaled by 1.16 + 40 offset in Graph).
    const cx = 310, cy = 290, r = 200;
    const gNodes: GNode[] = concepts.map((c, i) => {
      const angle = (2 * Math.PI * i) / concepts.length - Math.PI / 2;
      return {
        id: c.id,
        label: c.name.length > 26 ? `${c.name.slice(0, 24)}…` : c.name,
        course: "Library",
        x: (cx + r * Math.cos(angle) - 40) / 1.16,
        y: cy + r * Math.sin(angle),
        state: STATE_MAP[c.state] ?? "Seen",
      };
    });
    const ids = new Set(concepts.map((c) => c.id));
    const gEdges: GEdge[] = connections
      .filter((c) => ids.has(c.from_concept_id) && ids.has(c.to_concept_id))
      .map((c) => ({
        from: c.from_concept_id,
        to: c.to_concept_id,
        rel: c.relation,
        state: PROVENANCE_MAP[c.provenance] ?? "Needs Review",
        why: c.rationale ?? "Saved from a verified learning session.",
        sources: [],
        discovered: c.session_id ? "Learning session" : "Manual",
        evidence: c.provenance === "student-verified" ? "Passed the session understanding check" : "Not yet verified by the student",
        verified: new Date(c.created_at).toLocaleDateString(),
      }));
    return { gNodes, gEdges };
  }, [concepts, connections]);

  const [sel, setSel] = useState<GEdge | null>(null);
  const activeNodes = real?.gNodes ?? nodes;
  const activeEdges = real?.gEdges ?? edges;
  const current = sel ?? activeEdges[0] ?? null;
  const name = (id: string) => activeNodes.find((n) => n.id === id);

  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="mx-auto max-w-[1600px] px-4 pt-5"><p className="eyebrow">Nexus / Cross-course network</p><h1 className="mt-1 text-2xl font-semibold">Knowledge map</h1></div>
      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_310px]">
        <Panel
          title="Verified knowledge graph"
          action={real ? <GraphLegend /> : <Pill className="bg-muted text-muted-foreground">Sample graph · save a verified connection to see yours</Pill>}
        >
          <Graph selected={current} onSelect={setSel} graphNodes={real?.gNodes} graphEdges={real?.gEdges} />
          <div className="mt-4 flex flex-wrap gap-2">
            {states.map((s) => <Pill key={s} className={stateTone[s]}>{s}</Pill>)}
          </div>
        </Panel>
        <Panel title="Connection provenance">
          {current ? (
            <div className="space-y-5 text-sm">
              <div>
                <div className="font-mono text-xs text-muted-foreground">{name(current.from)?.course}</div>
                <div className="text-lg font-medium">{name(current.from)?.label}</div>
                <div className="my-1 font-mono text-xs" style={{ color: edgeTone[current.state] }}>↓ {current.rel}</div>
                <div className="font-mono text-xs text-muted-foreground">{name(current.to)?.course}</div>
                <div className="text-lg font-medium">{name(current.to)?.label}</div>
              </div>
              <span className="inline-block rounded px-2 py-0.5 font-mono text-[11px] uppercase" style={{ color: edgeTone[current.state], border: `1px solid ${edgeTone[current.state]}` }}>{current.state}</span>
              <Field k="Why Nexus believes they connect" v={current.why} />
              {current.math && <MathTex tex={current.math} block />}
              {current.sources.length > 0 && (
                <div>
                  <div className="eyebrow mb-1">Supporting material</div>
                  <ul className="space-y-1">{current.sources.map((s) => <li key={s} className="rounded border bg-background px-2 py-1 font-mono text-xs">{s}</li>)}</ul>
                </div>
              )}
              <Field k="Discovered in" v={current.discovered} />
              <Field k="Student evidence" v={current.evidence} />
              <Field k="Last verified" v={current.verified} />
            </div>
          ) : <p className="text-sm text-muted-foreground">Click any connection in the graph.</p>}
        </Panel>
      </main>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return <div><div className="eyebrow mb-1">{k}</div><p>{v}</p></div>;
}

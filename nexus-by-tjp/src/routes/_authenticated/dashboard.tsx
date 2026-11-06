import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopBar, Panel, Pill } from "@/components/nexus/Shell";
import { Graph, GraphLegend } from "@/components/nexus/Graph";
import { Button } from "@/components/ui/button";
import { SourceUpload } from "@/components/nexus/SourceUpload";
import { VaultLibrary } from "@/components/nexus/VaultLibrary";
import { CourseManager, useCourses } from "@/components/nexus/CourseManager";
import { listSources } from "@/lib/sources.functions";
import { listSessions } from "@/lib/sessions.functions";
import { listGaps, listConcepts, listConnections } from "@/lib/graph.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Library & learning history · Nexus" },
      { name: "description", content: "Your courses, sources, open gaps, and verified knowledge connections." },
      { property: "og:title", content: "Library & learning history · Nexus" },
      { property: "og:description", content: "Your courses, sources, open gaps, and verified knowledge connections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const GAP_LABEL: Record<string, string> = {
  retrieval: "Retrieval",
  foundation: "Foundation",
  misconception: "Misconception",
  connection: "Connection",
};

function Dashboard() {
  const fetchSources = useServerFn(listSources);
  const fetchSessions = useServerFn(listSessions);
  const fetchGaps = useServerFn(listGaps);
  const fetchConcepts = useServerFn(listConcepts);
  const fetchConnections = useServerFn(listConnections);
  const { data: courses = [] } = useCourses();
  const { data: sources = [] } = useQuery({ queryKey: ["sources", "all"], queryFn: () => fetchSources({ data: undefined }) });
  const { data: sessionRows = [] } = useQuery({ queryKey: ["sessions"], queryFn: () => fetchSessions() });
  const { data: gapRows = [] } = useQuery({ queryKey: ["gaps", "open"], queryFn: () => fetchGaps({ data: { status: "open" } }) });
  const { data: concepts = [] } = useQuery({ queryKey: ["concepts"], queryFn: () => fetchConcepts() });
  const { data: connections = [] } = useQuery({ queryKey: ["connections"], queryFn: () => fetchConnections() });

  const openGaps = gapRows.length;
  const courseName = (id: string | null) => courses.find((c) => c.id === id)?.code ?? "N/A";
  const conceptName = (id: string) => concepts.find((c) => c.id === id)?.name ?? "N/A";

  // Knowledge debt: group open gaps by type; flag a pattern when one type repeats.
  const debtByType = gapRows.reduce<Record<string, number>>((acc, g) => {
    acc[g.gap_type] = (acc[g.gap_type] ?? 0) + 1;
    return acc;
  }, {});
  const pattern = Object.entries(debtByType).find(([, n]) => n >= 2);

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-[1600px] px-4 py-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Nexus / Where what you know connects to what you're learning</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Library & history</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              {courses.length} course{courses.length === 1 ? "" : "s"} · {sources.length} source{sources.length === 1 ? "" : "s"} · {openGaps} open gap{openGaps === 1 ? "" : "s"}
            </p>
          </div>
          <Button asChild size="sm"><Link to="/session">+ New problem</Link></Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Continue learning" className="lg:col-span-2">
            {sessionRows.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                No learning sessions yet. <Link to="/session" className="text-primary underline-offset-2 hover:underline">Start your first session</Link> with a problem you're stuck on.
              </p>
            ) : (
              <ul className="divide-y">
                {sessionRows.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <Link to="/session" search={{ id: s.id }} className="flex flex-wrap items-center gap-2 py-3 hover:opacity-80">
                      <span className="w-16 font-mono text-xs text-muted-foreground">{courseName(s.course_id)}</span>
                      <span className="min-w-[160px] flex-1 truncate text-sm font-medium">{s.topic ?? s.problem_text}</span>
                      {s.diagnosis && typeof s.diagnosis === "object" && "gapType" in s.diagnosis && (
                        <Pill className="bg-muted text-muted-foreground">{GAP_LABEL[String((s.diagnosis as Record<string, unknown>)["gapType"])] ?? "N/A"} Gap</Pill>
                      )}
                      <Pill className={s.status === "verified" ? "bg-success/15 text-success" : "bg-verify/15 text-verify"}>{s.status}</Pill>
                      <span className="ml-auto text-right text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Open knowledge gaps">
            {gapRows.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No open gaps. Gaps appear here when a session diagnoses one.</p>
            ) : (
              <ul className="space-y-2">
                {gapRows.slice(0, 6).map((g) => (
                  <li key={g.id} className="rounded-md border bg-background p-3 text-sm">
                    <div className="font-medium">{GAP_LABEL[g.gap_type] ?? g.gap_type} Gap</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {g.confidence ? `Confidence: ${g.confidence} · ` : ""}{new Date(g.created_at).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent connections" className="lg:col-span-2">
            {connections.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No saved connections yet. Verify a session and save the connection to see it here.</p>
            ) : (
              <ul className="divide-y">
                {[...connections].reverse().slice(0, 5).map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                    <span className="font-medium">{conceptName(c.from_concept_id)}</span>
                    <span className="text-xs text-verify">↔ {c.relation}</span>
                    <span className="font-medium">{conceptName(c.to_concept_id)}</span>
                    <Pill className={c.provenance === "student-verified" ? "bg-success/15 text-success" : "bg-ai/15 text-ai"}>
                      {c.provenance === "student-verified" ? "Student Verified" : c.provenance === "ai-suggested" ? "AI Suggested" : "Needs Review"}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Knowledge graph" className="lg:col-span-2" action={<Link to="/map" className="text-xs text-primary hover:underline">Open full map →</Link>}>
            <Graph />
            <div className="mt-3"><GraphLegend /></div>
          </Panel>

          <Panel title="Knowledge debt">
            {gapRows.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No open gaps. Verified sessions close them automatically.</p>
            ) : (
              <>
                <ul className="space-y-2 text-xs">
                  {gapRows.slice(0, 5).map((g) => (
                    <li key={g.id} className="rounded-md border bg-background p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{GAP_LABEL[g.gap_type] ?? g.gap_type} Gap</span>
                        <Pill className="bg-verify/15 text-verify">Open</Pill>
                      </div>
                      <p className="mt-1 line-clamp-2 text-muted-foreground">{g.confidence ? `Confidence: ${g.confidence} · ` : ""}Diagnosed {new Date(g.created_at).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
                {pattern && (
                  <p className="mt-3 rounded-md border border-verify/40 bg-verify/10 p-2 text-xs">
                    Pattern: {pattern[1]} open {pattern[0]} gaps: a repeated struggle in this area. Worth a focused review session.
                  </p>
                )}
              </>
            )}
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel title="Source library"><VaultLibrary /><div className="mt-3 border-t pt-3"><SourceUpload /></div></Panel>
            <Panel title="Current courses"><CourseManager /></Panel>
            <Panel title="Recent sources">
              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {sources.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-mono">{s.filename}</span>
                      <Pill className={s.status === "indexed" ? "bg-source/15 text-source" : "bg-destructive/15 text-destructive"}>{s.status}</Pill>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, ExternalLink, Film, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TopBar, Panel, Pill } from "@/components/nexus/Shell";
import { MathTex } from "@/components/nexus/Math";
import { NoteMarkdown } from "@/components/nexus/NoteMarkdown";
import { VisualRenderer } from "@/components/nexus/VisualRenderer";
import { CourseManager, useCourses } from "@/components/nexus/CourseManager";
import { SourceUpload } from "@/components/nexus/SourceUpload";
import { VaultLibrary } from "@/components/nexus/VaultLibrary";
import { NoteContext } from "@/components/nexus/NoteContext";
import { useVault } from "@/components/nexus/VaultProvider";
import { retrieveNotes } from "@/lib/vault";
import { needsFoundation, foundationPrerequisites, connectionMarkdown } from "@/lib/learning-routing";
import {
  createSession,
  getSession,
  runDiagnosis,
  generatePackage,
  verifySession,
} from "@/lib/sessions.functions";
import { upsertConcept, saveConnection } from "@/lib/graph.functions";
import type {
  Diagnosis,
  LearningPackage,
  Verification,
  GapType,
  Provenance,
  RetrievedItem,
} from "@/lib/nexus-ai.server";

export const Route = createFileRoute("/_authenticated/session")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  head: () => ({
    meta: [
      { title: "Learning Session · Nexus" },
      { name: "description", content: "Diagnose, connect, practice and verify: a guided engineering learning session." },
      { property: "og:title", content: "Learning Session · Nexus" },
      { property: "og:description", content: "A guided workflow that finds the prerequisite you're missing and verifies you've got it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Session,
});

const GAP_LABEL: Record<string, string> = {
  retrieval: "Retrieval",
  foundation: "Foundation",
  misconception: "Misconception",
  connection: "Connection",
};

const PROVENANCE_LABEL: Record<Provenance, string> = {
  "source-verified": "Source Verified",
  "derived-from-source": "Derived from Source",
  "student-verified": "Student Verified",
  "ai-suggested": "AI Suggested",
  "needs-review": "Needs Review",
};

const PROVENANCE_TONE: Record<Provenance, string> = {
  "source-verified": "bg-source/15 text-source",
  "derived-from-source": "bg-source/15 text-source",
  "student-verified": "bg-success/15 text-success",
  "ai-suggested": "bg-ai/15 text-ai",
  "needs-review": "bg-verify/15 text-verify",
};

function ProvenanceBadge({ p }: { p: Provenance }) {
  return <Pill className={PROVENANCE_TONE[p]}>{PROVENANCE_LABEL[p]}</Pill>;
}

function ResourceScout({ topic, problem, gapType }: { topic: string; problem: string; gapType: GapType }) {
  const [open, setOpen] = useState(false);
  const subject = topic || problem.slice(0, 60);
  const cards = [
    {
      title: "Best for intuition",
      query: `${subject} intuitive explanation ${gapType === "connection" ? "how concepts connect" : "visual"}`,
      reason: `Targets the ${(GAP_LABEL[gapType] ?? gapType).toLowerCase()} gap with a conceptual, visual treatment of ${subject}.`,
    },
    {
      title: "Best for mathematical depth",
      query: `${subject} derivation worked example undergraduate`,
      reason: `Complements the intuition with the formal derivation and a worked example for ${subject}.`,
    },
  ];
  return (
    <div>
      <Button size="sm" variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Film />{open ? "Hide outside resources" : "Still stuck? Outside resources"}
      </Button>
      {open && (
        <section className="mt-3 border-t pt-3">
          <h3 className="eyebrow">Resource Scout · Suggested searches</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Live video search and ranking are not connected yet. These open YouTube searches tuned to your gap; durations, segments, and accuracy are not verified by Nexus.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <article key={c.title} className="border bg-background p-3">
                <h4 className="text-sm font-medium">{c.title}</h4>
                <p className="mt-2 text-xs text-muted-foreground">{c.reason}</p>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(c.query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline"
                >
                  Search YouTube <ExternalLink size={12} />
                </a>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Selection criteria: exact gap, level match, credible derivation, concise coverage, and a complementary teaching approach, not popularity.
          </p>
        </section>
      )}
    </div>
  );
}

type Stage = "problem" | "diagnose" | "confirm" | "package" | "done";

function Session() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createSession);
  const getFn = useServerFn(getSession);
  const diagnoseFn = useServerFn(runDiagnosis);
  const packageFn = useServerFn(generatePackage);
  const verifyFn = useServerFn(verifySession);
  const upsertConceptFn = useServerFn(upsertConcept);
  const saveConnectionFn = useServerFn(saveConnection);
  const { data: courses = [] } = useCourses();

  const [stage, setStage] = useState<Stage>("problem");
  const [busy, setBusy] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [problem, setProblem] = useState("");
  const [statement, setStatement] = useState("");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [confirmedGap, setConfirmedGap] = useState<GapType | null>(null);
  const [retrieved, setRetrieved] = useState<RetrievedItem[]>([]);
  const [pkg, setPkg] = useState<LearningPackage | null>(null);
  const [answer, setAnswer] = useState("");
  const [verdict, setVerdict] = useState<Verification | null>(null);
  const [connectionSaved, setConnectionSaved] = useState(false);
  const [view, setView] = useState<"learn" | "practice">("learn");
  const [notePath, setNotePath] = useState("");
  const [noteConsent, setNoteConsent] = useState(false);
  const { library } = useVault();
  useEffect(() => { setNoteConsent(false); setNotePath(""); }, [library]);
  const currentNote = library?.notes.find((note) => note.path === notePath);
  // Computed only when a request is sent - never during render, so typing
  // stays fast even with a large vault attached.
  function computeLocalEvidence(): RetrievedItem[] {
    if (!noteConsent || !library) return [];
    return [
      ...(currentNote ? [{ filename: currentNote.title, notePath: currentNote.path, excerpt: currentNote.body.slice(0, 1200), relevance: 1 }] : []),
      ...retrieveNotes(library.notes.filter((note) => note.path !== notePath), `${topic} ${problem}`, "", 3).map((hit) => ({ filename: hit.note.title, notePath: hit.note.path, excerpt: hit.excerpt.slice(0, 1200), relevance: hit.score })),
    ];
  }


  const course = courses.find((c) => c.id === courseId) ?? null;

  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    setBusy(label);
    try {
      return await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function startSession() {
    const row = await run("Creating session…", () =>
      createFn({ data: { problemText: problem, topic: topic || undefined, courseId } }),
    );
    if (!row) return;
    setSessionId(row.id);
    setDiagnosis(null);
    setRetrieved([]);
    setView("learn");
    setPkg(null);
    setVerdict(null);
    setConnectionSaved(false);
    setStage("diagnose");
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
  }

  async function diagnose() {
    if (!sessionId) return;
    const result = await run(needsFoundation(statement) ? "Starting from the beginning…" : "Finding a useful starting point…", () =>
      diagnoseFn({ data: { sessionId, studentStatement: statement, localEvidence: computeLocalEvidence() } }),
    );
    if (!result) return;
    setDiagnosis(result.diagnosis);
    setRetrieved(result.retrieved);
    setStage("confirm");
    await buildPackage(result.diagnosis.gapType);
    queryClient.invalidateQueries({ queryKey: ["gaps"] });
  }

  async function buildPackage(confirmed: GapType, adaptation?: string) {
    if (!sessionId) return;
    setConfirmedGap(confirmed);
    const result = await run("Building your learning package…", () =>
      packageFn({ data: { sessionId, confirmedGapType: confirmed, localEvidence: computeLocalEvidence(), adaptation } }),
    );
    if (!result) return;
    setPkg(result.pkg);
    setView("learn");
    setVerdict(null);
    setAnswer("");
    setRetrieved(result.retrieved);
    setStage("package");
  }

  async function verify() {
    if (!sessionId) return;
    const result = await run("Checking your understanding…", () =>
      verifyFn({ data: { sessionId, answer } }),
    );
    if (!result) return;
    setVerdict(result);
    setStage("done");
    setView("practice");
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    queryClient.invalidateQueries({ queryKey: ["gaps"] });
  }

  async function saveVerifiedConnection() {
    if (!sessionId || !diagnosis || !pkg) return;
    const result = await run("Saving connection…", async () => {
      const prereqName = pkg.prerequisiteConcept || diagnosis.prerequisiteConcepts[0] || "Prerequisite concept";
      const targetName = topic || problem.slice(0, 60);
      const from = await upsertConceptFn({ data: { name: prereqName, state: "verified", courseId } });
      const to = await upsertConceptFn({ data: { name: targetName, state: "connected", courseId } });
      await saveConnectionFn({
        data: {
          fromConceptId: from.id,
          toConceptId: to.id,
          relation: "prerequisite for",
          provenance: "student-verified",
          rationale: pkg.whyItConnects,
          sessionId,
        },
      });
    });
    if (result === null) return;
    setConnectionSaved(true);
    queryClient.invalidateQueries({ queryKey: ["concepts"] });
    queryClient.invalidateQueries({ queryKey: ["connections"] });
    toast.success("Verified connection saved to your knowledge graph");
  }

  async function loadExisting(loadId: string) {
    const row = await run("Loading session…", () => getFn({ data: { id: loadId } }));
    if (!row) return;
    setPkg(null);
    setDiagnosis(null);
    setVerdict(null);
    setRetrieved([]);
    setConnectionSaved(false);
    setView("learn");
    setSessionId(row.id);
    setCourseId(row.course_id);
    setTopic(row.topic ?? "");
    setProblem(row.problem_text);
    if (row.diagnosis) setDiagnosis(row.diagnosis as unknown as Diagnosis);
    if (row.package) {
      setPkg(row.package as unknown as LearningPackage);
      setStage("package");
    } else if (row.diagnosis) {
      setStage("diagnose");
    } else {
      setStage("diagnose");
    }
  }

  useEffect(() => {
    if (id) void loadExisting(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function downloadConnection() {
    if (!pkg) return;
    const text = connectionMarkdown({ problem, prerequisite: pkg.prerequisiteConcept, explanation: pkg.explanation, rationale: pkg.whyItConnects, sources: retrieved.map((item) => item.notePath ?? item.filename), verified: verdict?.verdict === "verified" });
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nexus-learning-connection.md";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown downloaded. Move it into your Obsidian vault");
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-[1600px] px-4 py-5">
        <div className="mb-4">
          <p className="eyebrow">Nexus / Where what you know connects to what you're learning</p>
          <h1 className="mt-1 text-2xl font-semibold">What are you working on?</h1>
        </div>

        {/* Current problem view - prominent once a session exists */}
        {sessionId && (
          <div className="mb-4 rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-sm font-semibold text-primary">{course?.code ?? "General"}</span>
              {course && <span className="text-sm text-muted-foreground">{course.name}</span>}
              {topic && <Pill className="bg-muted text-muted-foreground">{topic}</Pill>}
            </div>
            <p className="mt-2 text-sm">“{problem}”</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px]">
          {/* Center: workflow */}
          <div className="order-1 flex min-w-0 flex-col gap-4">
            {stage === "problem" ? <Panel title="Current task">
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="problem">Problem or question</Label>
                  <Textarea
                    id="problem"
                    rows={3}
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="I'm working on PN junction equilibrium and I don't understand where the built-in voltage equation comes from."
                  />
                </div>
                <details className="border-t pt-3"><summary className="cursor-pointer text-xs text-muted-foreground">Course & topic (optional)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">                <div className="grid gap-1.5">
                  <Label htmlFor="course">Course</Label>
                  <select
                    id="course"
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={courseId ?? ""}
                    onChange={(e) => setCourseId(e.target.value || null)}
                  >
                    <option value="">General knowledge library</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="topic">Topic</Label>
                  <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="PN junction equilibrium" />
                </div>
</div></details>
                <details className="border-t pt-3"><summary className="cursor-pointer text-xs text-muted-foreground">Use an Obsidian note</summary><div className="mt-3"><NoteContext problem={problem} consent={noteConsent} onConsent={setNoteConsent} onContext={(path) => { setNotePath(path); setNoteConsent(false); }} /></div></details>
                <div>
                  <Button size="sm" disabled={!problem.trim() || busy !== null} onClick={startSession}>
                    {busy === "Creating session…" ? <LoaderCircle className="animate-spin" /> : null}
                    Start learning
                  </Button>
                </div>
              </div>
            </Panel> : <div><Button size="sm" variant="outline" disabled={busy !== null} onClick={() => { void navigate({ to: "/session", search: {} }); setStage("problem"); setSessionId(null); setProblem(""); setTopic(""); setStatement(""); setNoteConsent(false); setPkg(null); setDiagnosis(null); setVerdict(null); setRetrieved([]); }}>New task</Button></div>}

            {(stage === "diagnose" || stage === "confirm") && (
              <Panel title="Find a starting point">
                <Label htmlFor="understanding">What makes this difficult? (A sentence is enough.)</Label>
                <Textarea id="understanding" className="mt-2" rows={3} value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="I don't even know, or tell me what already makes sense…" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={!statement.trim() || busy !== null} onClick={diagnose}>Help me understand</Button>
                  <Button size="sm" variant="outline" disabled={busy !== null} onClick={async () => {
                    setStatement("I don't know");
                    if (!sessionId) return;
                    const result = await run("Starting from the beginning…", () => diagnoseFn({ data: { sessionId, studentStatement: "I don't know", localEvidence: computeLocalEvidence() } }));
                    if (!result) return;
                    setDiagnosis(result.diagnosis); setRetrieved(result.retrieved); setStage("confirm");
                    await buildPackage("foundation");
                  }}>Start from the beginning</Button>
                </div>
                {(needsFoundation(statement) || diagnosis?.gapType === "foundation") && <div className="mt-4 border-l-2 border-source pl-3" role="status">
                  <p className="text-sm font-medium">No problem. Let's build this from the beginning.</p>
                  {foundationPrerequisites(`${topic} ${problem}`).length > 0 && <><p className="mt-2 text-xs">To understand PN-junction equilibrium, we'll first build three ideas:</p><ol className="mt-2 list-decimal pl-5 text-sm">{foundationPrerequisites(`${topic} ${problem}`).map((concept) => <li key={concept}>{concept}</li>)}</ol><p className="mt-2 text-xs">Then we'll connect them to equilibrium and the built-in voltage equation.</p></>}
                </div>}
              </Panel>
            )}
            {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{busy}</p>}

            {pkg && (
              <>
                <div className="flex flex-wrap gap-2 border-b pb-3" role="tablist" aria-label="Learning views">
                  <Button role="tab" aria-selected={view === "learn"} variant={view === "learn" ? "secondary" : "ghost"} size="sm" onClick={() => setView("learn")}>Understand & reconnect</Button>
                  <Button role="tab" aria-selected={view === "practice"} variant={view === "practice" ? "secondary" : "ghost"} size="sm" onClick={() => setView("practice")}>Apply & check</Button>
                </div>
                {view === "learn" && <>
                <details><summary className="cursor-pointer text-xs text-muted-foreground">Teaching plan & connection</summary><div className="mt-3">
                {/* Explanation Planner - how Nexus decided to teach this */}
                <Panel title="3 · Explanation Planner">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Detected</p>
                      <p className="mt-1 text-sm font-medium">{GAP_LABEL[confirmedGap ?? diagnosis?.gapType ?? "connection"]} Gap</p>
                      {pkg.priorSource && (
                        <p className="mt-2 text-xs text-source">Prior knowledge · {pkg.priorSource}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Missing</p>
                      <ul className="mt-1 list-inside list-disc text-sm">
                        {(pkg.missing ?? []).map((m) => <li key={m}>{m}</li>)}
                      </ul>
                    </div>
                  </div>
                  {(pkg.alreadyUnderstood?.length ?? 0) > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Already understood: {(pkg.alreadyUnderstood ?? []).join(", ")}
                    </p>
                  )}
                  <ol className="mt-3 space-y-2 border-y py-3 text-sm">
                    {(pkg.teachingPlan ?? []).map((step, i) => (
                      <li key={step}><span className="mr-2 font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>{step}</li>
                    ))}
                  </ol>

                  {/* Knowledge connection visual: prior → current */}
                  <div className="mt-3 flex flex-col items-center gap-1 rounded-md border bg-background p-4">
                    <div className="text-center">
                      <p className="font-mono text-xs text-muted-foreground">{pkg.priorSource ?? "Prior course"}</p>
                      <p className="text-sm font-medium">{pkg.prerequisiteConcept}</p>
                    </div>
                    <div className="my-1 flex flex-col items-center text-verify">
                      <span className="text-xs">↓ {pkg.whyItConnects.slice(0, 80)}{pkg.whyItConnects.length > 80 ? "…" : ""}</span>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-xs text-muted-foreground">{course?.code ?? "Current course"}</p>
                      <p className="text-sm font-medium">{topic || problem.slice(0, 60)}</p>
                    </div>
                  </div>
                </Panel>

                </div></details>
                <Panel title="Understand the prerequisite">
                  <div className="note-markdown text-sm"><NoteMarkdown text={pkg.explanation} /></div>
                  <div className="mt-3 rounded-md border bg-background p-3">
                    <p className="text-xs font-medium">Why it connects</p>
                    <p className="mt-1 text-sm text-muted-foreground">{pkg.whyItConnects}</p>
                  </div>
                </Panel>

                {/* Visual Explainer */}
                <Panel title={`5 · Visual: ${pkg.visual?.title ?? "Concept visual"}`}>
                  <p className="mb-2 text-xs text-muted-foreground">{pkg.visual?.kind} · {pkg.visual?.description}</p>
                  <VisualRenderer
                    visual={pkg.visual ?? { kind: "causal-diagram", title: "Concept visual", description: "", steps: [] }}
                    topic={topic}
                    problem={problem}
                  />
                </Panel>

                {pkg.workedExample && <Panel title="Worked example"><NoteMarkdown text={pkg.workedExample} /></Panel>}
                <details><summary className="cursor-pointer text-xs text-muted-foreground">Equations & assumptions</summary><div className="mt-3 space-y-4">
                {/* Equation cards with provenance */}
                {(pkg.equations?.length ?? 0) > 0 && (
                  <Panel title="6 · Important equations">
                    <div className="space-y-3">
                      {(pkg.equations ?? []).map((eq, i) => (
                        <div key={i} className="rounded-md border bg-background p-3">
                          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground">{eq.label}</p>
                            <ProvenanceBadge p={eq.provenance} />
                          </div>
                          <MathTex tex={eq.latex} block />
                          <p className="mt-1 text-xs text-muted-foreground">{eq.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}

                {(pkg.assumptions?.length ?? 0) > 0 && (
                  <Panel title="Assumptions">
                    <ul className="list-inside list-disc text-sm text-muted-foreground">
                      {(pkg.assumptions ?? []).map((a) => <li key={a}>{a}</li>)}
                    </ul>
                  </Panel>
                )}

                </div></details>
                <ResourceScout topic={topic} problem={problem} gapType={confirmedGap ?? diagnosis?.gapType ?? "foundation"} />
                <div><Button size="sm" onClick={() => setView("practice")}>Try a small check →</Button></div>
                </>}
                {view === "practice" && <>
                <Panel title="Apply it">
                  <div className="space-y-3">
                    {([
                      ["Concept check", pkg.practice.conceptCheck],
                      ["Guided application", pkg.practice.guided],
                      ["Independent application", pkg.practice.independent],
                      ["Transfer problem", pkg.practice.transfer],
                    ] as const).map(([label, text]) => (
                      label === "Concept check" ? <div key={label}><p className="text-xs font-medium">{label}</p><NoteMarkdown text={text} /></div> : <details key={label} className="border-t pt-2"><summary className="cursor-pointer text-xs font-medium">{label}</summary><div className="mt-2"><NoteMarkdown text={text} /></div></details>
                    ))}
                  </div>
                  <div className="mt-3 border-t pt-3">
                    <ResourceScout topic={topic} problem={problem} gapType={confirmedGap ?? diagnosis?.gapType ?? "connection"} />
                  </div>
                </Panel>

                <Panel title="8 · Understanding verification">
                  <div className="mb-2"><NoteMarkdown text={pkg.understandingCheck} /></div>
                  <Textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Explain your reasoning in your own words…" />
                  <div className="mt-2">
                    <Button size="sm" disabled={!answer.trim() || busy !== null} onClick={verify}>
                      {busy === "Checking your understanding…" ? <LoaderCircle className="animate-spin" /> : null}
                      Submit for verification
                    </Button>
                  </div>

                  {verdict && (
                    <div className={`mt-3 rounded-md border p-3 ${verdict.verdict === "verified" ? "border-success/40 bg-success/10" : "border-verify/40 bg-verify/10"}`}>
                      <Pill className={verdict.verdict === "verified" ? "bg-success/15 text-success" : "bg-verify/15 text-verify"}>
                        {verdict.verdict === "verified" ? "Ready to Continue" : "Gap Still Open"}
                      </Pill>
                      <p className="mt-2 text-sm">{verdict.feedback}</p>
                      <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <div><dt className="font-medium text-foreground">Correctness</dt><dd>{verdict.correctness}</dd></div>
                        <div><dt className="font-medium text-foreground">Reasoning</dt><dd>{verdict.reasoning}</dd></div>
                        <div><dt className="font-medium text-foreground">Independence</dt><dd>{verdict.independence}</dd></div>
                        <div><dt className="font-medium text-foreground">Application</dt><dd>{verdict.application}</dd></div>
                      </dl>
                      {verdict.verdict === "gap-remains" && <Button className="mt-3" variant="outline" size="sm" disabled={busy !== null} onClick={() => buildPackage(confirmedGap ?? diagnosis?.gapType ?? "foundation", `Student answer: ${answer}\nFeedback: ${verdict.feedback}\nReasoning: ${verdict.reasoning}`)}>Teach the part I'm missing</Button>}
                      {verdict.verdict === "verified" && !connectionSaved && (
                        <div className="mt-3 border-t pt-3">
                          <p className="mb-2 text-xs font-medium">9 · Save connection</p>
                          <p className="mb-2 text-xs text-muted-foreground">
                            Saves the concept relationship, supporting sources, and your verification result and updates your knowledge graph.
                          </p>
                          <Button size="sm" disabled={busy !== null} onClick={saveVerifiedConnection}>
                            Save verified connection
                          </Button>
                        </div>
                      )}
                      {connectionSaved && (
                        <p className="mt-3 text-xs text-success">Saved. See it on the <Link to="/map" className="underline">knowledge map</Link>.</p>
                      )}
                    </div>
                  )}
                </Panel>
                <div className="border-t pt-3"><Button size="sm" variant="outline" onClick={downloadConnection}><Download />Download connection for Obsidian</Button><p className="mt-2 text-xs text-muted-foreground">Downloads a Markdown note with source links. Move it into your vault; Nexus does not write to or sync with Obsidian.</p></div>
                </>}
              </>
            )}
          </div>

          {/* Right: evidence + provenance */}
          <aside className="order-3 flex flex-col gap-4">
            {stage === "problem" && <div className="border-b pb-4"><p className="eyebrow">Your existing workflow</p><p className="mt-2 text-sm">Current problem → relevant notes → understanding → back to your work.</p></div>}
            <details open={stage === "problem"} className="border-b pb-3"><summary className="cursor-pointer text-xs font-medium">Files & course library</summary><div className="mt-3 space-y-4"><SourceUpload courseId={courseId} /><VaultLibrary /><CourseManager compact /></div></details>
            {stage !== "problem" && <Panel title="Relevant notes & evidence">
              {retrieved.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No relevant material found in your sources. Nexus will say so rather than invent citations.
                </p>
              ) : (
                <ul className="space-y-2">
                  {retrieved.map((r) => (
                    <li key={r.filename + r.excerpt.slice(0, 24)} className="rounded-md border bg-background p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono font-medium">{r.notePath ?? r.filename}</span>
                        <Pill className="bg-source/15 text-source">Source excerpt</Pill>
                      </div>
                      <p className="mt-1 line-clamp-4 text-muted-foreground">{r.excerpt}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>}
            <details><summary className="cursor-pointer text-xs text-muted-foreground">Evidence labels</summary><div className="mt-3"><Panel title="Provenance states">
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><ProvenanceBadge p="source-verified" />: from your material</li>
                <li className="pt-1"><ProvenanceBadge p="student-verified" />: you demonstrated it</li>
                <li className="pt-1"><ProvenanceBadge p="ai-suggested" />: not yet verified</li>
                <li className="pt-1"><ProvenanceBadge p="needs-review" />: incomplete evidence</li>
              </ul>
            </Panel></div></details>
          </aside>
        </div>
      </main>
    </div>
  );
}

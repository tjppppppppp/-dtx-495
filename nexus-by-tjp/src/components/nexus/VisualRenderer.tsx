import { JunctionVisual } from "./JunctionVisual";
import { NoteMarkdown } from "./NoteMarkdown";

export type VisualSpec = {
  kind: string;
  title: string;
  description: string;
  steps: string[];
};

// Semiconductor physical processes get the staged PN-junction vector diagram.
export function isSemiconductorProcess(topic: string, problem: string): boolean {
  return /pn[- ]?junction|diode|depletion|built[- ]?in (voltage|potential)|semiconductor|doping|doped|p[- ]?type|n[- ]?type|carrier diffusion/i.test(
    `${topic} ${problem}`,
  );
}

/** Causal chain / workflow: a real vertical flow diagram with connector arrows. */
function FlowDiagram({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-1" aria-label="Causal flow diagram">
      {steps.map((step, i) => (
        <li key={i}>
          <div className="flex items-start gap-3 border-2 border-border bg-background px-3 py-2">
            <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
            <div className="note-markdown min-w-0 text-sm"><NoteMarkdown text={step} /></div>
          </div>
          {i < steps.length - 1 && (
            <div className="flex justify-center" aria-hidden="true">
              <svg width="18" height="26" viewBox="0 0 18 26">
                <line x1="9" y1="0" x2="9" y2="18" stroke="var(--primary)" strokeWidth="2.5" />
                <path d="M3 13L9 21L15 13Z" fill="var(--primary)" />
              </svg>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Concept map: center topic with satellite concepts, rendered as SVG. */
function ConceptMapSvg({ center, nodes }: { center: string; nodes: string[] }) {
  const items = nodes.slice(0, 6);
  const cx = 320;
  const cy = 160;
  const rx = 225;
  const ry = 105;
  const truncate = (s: string) => (s.length > 30 ? `${s.slice(0, 29)}…` : s);
  return (
    <svg viewBox="0 0 640 320" role="img" aria-label={`Concept map linking ${center} to ${items.length} related ideas`} className="mt-1 w-full">
      {items.map((node, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / items.length;
        const x = cx + rx * Math.cos(angle);
        const y = cy + ry * Math.sin(angle);
        const label = truncate(node);
        const w = Math.max(64, label.length * 6.6 + 18);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1.5" />
            <rect x={x - w / 2} y={y - 14} width={w} height="28" fill="var(--card)" stroke="var(--source)" strokeWidth="1.6" />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="11.5" fill="var(--foreground)">{label}</text>
          </g>
        );
      })}
      <rect x={cx - 110} y={cy - 20} width="220" height="40" fill="var(--primary)" stroke="var(--border)" strokeWidth="2" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--primary-foreground)">{truncate(center)}</text>
    </svg>
  );
}

/** Derivation: vertically stacked, numbered steps. */
function DerivationLayout({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-1 space-y-2" aria-label="Staged derivation">
      {steps.map((step, i) => (
        <li key={i} className="border-2 border-border bg-background">
          <p className="border-b border-border bg-muted px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Step {i + 1}
          </p>
          <div className="note-markdown px-3 py-2 text-sm"><NoteMarkdown text={step} /></div>
        </li>
      ))}
    </ol>
  );
}

/** Comparison table: "term: detail" steps become real table rows. */
function ComparisonTable({ steps }: { steps: string[] }) {
  const rows = steps.map((step) => {
    const idx = step.indexOf(":");
    return idx > 0 ? [step.slice(0, idx).trim(), step.slice(idx + 1).trim()] : [step, ""];
  });
  return (
    <table className="mt-1 w-full border-2 border-border text-sm">
      <tbody>
        {rows.map(([term, detail], i) => (
          <tr key={i} className="border-b border-border last:border-b-0">
            <th scope="row" className="border-r border-border bg-muted px-3 py-2 text-left align-top font-medium">{term}</th>
            <td className="px-3 py-2 align-top text-muted-foreground">{detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Routes the Visual Explainer's structured spec to a deterministic renderer.
 * The spec stays internal data - the student always sees a rendered artifact.
 */
export function VisualRenderer({ visual, topic, problem }: { visual: VisualSpec; topic: string; problem: string }) {
  if (isSemiconductorProcess(topic, problem)) return <JunctionVisual />;
  const steps = (visual.steps ?? []).filter((s) => s.trim().length > 0);
  if (steps.length === 0) return <JunctionVisual />;
  switch (visual.kind) {
    case "concept-map":
      return <ConceptMapSvg center={visual.title || topic} nodes={steps} />;
    case "derivation":
      return <DerivationLayout steps={steps} />;
    case "comparison-table":
      return <ComparisonTable steps={steps} />;
    default:
      // causal-diagram, schematic, plot, and unknown kinds render as flow diagrams.
      return <FlowDiagram steps={steps} />;
  }
}

import { useState, useId } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathTex } from "./Math";

// Deterministic staged PN-junction diagram. Every stage is a real rendered
// SVG artifact - regions, carriers, fixed ions, and directional arrows
// never a textual description of what to draw.
const stages = [
  {
    title: "Initial carrier imbalance",
    text: "The p side holds many mobile holes; the n side holds many mobile electrons. Each carrier type is crowded on its own side of the junction.",
  },
  {
    title: "Diffusion begins",
    text: "Carriers move down their concentration gradients: electrons diffuse from n to p, holes diffuse from p to n.",
  },
  {
    title: "Depletion region forms",
    text: "Crossing carriers recombine near the junction, uncovering fixed ions: negative acceptors on the p edge, positive donors on the n edge. No mobile carriers remain in this band.",
  },
  {
    title: "Internal field appears",
    text: "The uncovered fixed charges establish an electric field pointing from the n side to the p side.",
  },
  {
    title: "Drift opposes diffusion",
    text: "The field drives electrons back toward n and holes back toward p. Each carrier’s drift opposes its own diffusion.",
  },
  {
    title: "Equilibrium",
    text: "Drift and diffusion continue, but their conventional current contributions cancel exactly. Net current is zero; diffusion does not stop.",
  },
];

// Carrier positions (deterministic, away from the depletion band).
const HOLES: Array<[number, number]> = [
  [70, 80], [110, 120], [88, 168], [150, 90], [182, 142], [138, 192], [212, 104], [238, 168],
];
const ELECTRONS: Array<[number, number]> = [
  [570, 80], [530, 122], [552, 168], [490, 90], [458, 142], [502, 192], [428, 104], [402, 168],
];
// Carriers near the junction that recombine once the depletion region forms.
const NEAR_HOLES: Array<[number, number]> = [[286, 96], [290, 152]];
const NEAR_ELECTRONS: Array<[number, number]> = [[354, 96], [350, 152]];
const ION_ROWS = [70, 105, 140, 175];

function Hole({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="7" fill="none" stroke="var(--source)" strokeWidth="1.6" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="var(--source)">+</text>
    </g>
  );
}

function Electron({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="6" fill="var(--derived)" />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fill="var(--background)">−</text>
    </g>
  );
}

export function JunctionVisual() {
  const [stage, setStage] = useState(0);
  const id = useId().replace(/:/g, "");
  const current = stages[stage];
  const arrow = `url(#${id})`;

  return (
    <section className="mt-3 border-2 border-border bg-background" aria-label="PN junction teaching visual">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border px-3 py-2">
        <h3 className="eyebrow">Visual Explainer · Causal/vector diagram</h3>
        <span className="font-mono text-[10px] text-muted-foreground">Authored demo · schematic, not to scale</span>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border p-2" role="tablist" aria-label="Visual stages">
        {stages.map((item, i) => (
          <Button
            key={item.title}
            size="sm"
            variant={stage === i ? "default" : "ghost"}
            onClick={() => setStage(i)}
            aria-pressed={stage === i}
            className="text-xs"
          >
            {i + 1} · {item.title}
          </Button>
        ))}
      </div>

      <svg
        viewBox="0 0 640 320"
        role="img"
        aria-label={`${current?.title}: p-type region left, n-type region right, depletion region and field arrows as stages advance`}
        className="w-full"
      >
        <defs>
          <marker id={id} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0 0L7 3.5L0 7Z" fill="context-stroke" />
          </marker>
        </defs>

        {/* Regions */}
        <rect x="40" y="48" width="260" height="170" fill="var(--source)" opacity="0.08" stroke="var(--border)" strokeWidth="1.5" />
        <rect x="340" y="48" width="260" height="170" fill="var(--derived)" opacity="0.08" stroke="var(--border)" strokeWidth="1.5" />
        <text x="52" y="36" fill="var(--source)" fontSize="13" fontWeight="600">p-type · acceptors</text>
        <text x="588" y="36" textAnchor="end" fill="var(--derived)" fontSize="13" fontWeight="600">n-type · donors</text>
        <line x1="320" y1="48" x2="320" y2="218" stroke="var(--border)" strokeDasharray="4 4" />

        {/* Depletion region with fixed ions (stage 3+) */}
        {stage >= 2 && (
          <g>
            <rect x="272" y="48" width="96" height="170" fill="var(--muted)" stroke="var(--border)" strokeDasharray="3 3" />
            {ION_ROWS.map((y) => (
              <g key={y}>
                <rect x="278" y={y - 9} width="18" height="18" fill="none" stroke="var(--source)" strokeWidth="1.4" />
                <text x="287" y={y + 5} textAnchor="middle" fontSize="14" fill="var(--source)">−</text>
                <rect x="344" y={y - 9} width="18" height="18" fill="none" stroke="var(--derived)" strokeWidth="1.4" />
                <text x="353" y={y + 5} textAnchor="middle" fontSize="13" fill="var(--derived)">+</text>
              </g>
            ))}
            <text x="320" y="236" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">Depletion region · fixed ions, no mobile carriers</text>
          </g>
        )}

        {/* Mobile carriers */}
        {HOLES.map(([x, y]) => <Hole key={`h${x}`} x={x} y={y} />)}
        {ELECTRONS.map(([x, y]) => <Electron key={`e${x}`} x={x} y={y} />)}
        {stage < 2 && NEAR_HOLES.map(([x, y]) => <Hole key={`nh${x}`} x={x} y={y} />)}
        {stage < 2 && NEAR_ELECTRONS.map(([x, y]) => <Electron key={`ne${x}`} x={x} y={y} />)}

        {/* Diffusion arrows (stage 2+) - solid, cross the junction */}
        {stage >= 1 && (
          <g>
            <line x1="470" y1="70" x2="368" y2="70" stroke="var(--derived)" strokeWidth="2.5" markerEnd={arrow} />
            <text x="419" y="60" textAnchor="middle" fontSize="11.5" fill="var(--derived)" stroke="var(--background)" strokeWidth="3" paintOrder="stroke">electron diffusion (n → p)</text>
            <line x1="170" y1="196" x2="272" y2="196" stroke="var(--source)" strokeWidth="2.5" markerEnd={arrow} />
            <text x="221" y="212" textAnchor="middle" fontSize="11.5" fill="var(--source)" stroke="var(--background)" strokeWidth="3" paintOrder="stroke">hole diffusion (p → n)</text>
          </g>
        )}

        {/* Drift arrows (stage 5+) - dashed, oppose diffusion */}
        {stage >= 4 && (
          <g>
            <line x1="368" y1="96" x2="470" y2="96" stroke="var(--ai)" strokeWidth="2.5" strokeDasharray="6 4" markerEnd={arrow} />
            <text x="419" y="112" textAnchor="middle" fontSize="11.5" fill="var(--ai)" stroke="var(--background)" strokeWidth="3" paintOrder="stroke">electron drift (toward n)</text>
            <line x1="272" y1="170" x2="170" y2="170" stroke="var(--ai)" strokeWidth="2.5" strokeDasharray="6 4" markerEnd={arrow} />
            <text x="221" y="162" textAnchor="middle" fontSize="11.5" fill="var(--ai)" stroke="var(--background)" strokeWidth="3" paintOrder="stroke">hole drift (toward p)</text>
          </g>
        )}

        {/* Internal electric field (stage 4+) */}
        {stage >= 3 && (
          <g>
            <line x1="520" y1="256" x2="140" y2="256" stroke="var(--primary)" strokeWidth="3" markerEnd={arrow} />
            <text x="330" y="248" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--primary)">Electric field E: n → p</text>
          </g>
        )}

        {/* Equilibrium indicator (stage 6) */}
        {stage >= 5 && (
          <g>
            <rect x="212" y="282" width="216" height="26" fill="none" stroke="var(--verify)" strokeWidth="2" />
            <text x="320" y="299" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--verify)">NET CURRENT = 0</text>
          </g>
        )}

        <text x="320" y="316" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
          Solid arrows: diffusion · dashed arrows: drift · arrows show carrier motion, not conventional current
        </text>
      </svg>

      <div className="border-t-2 border-border p-3" aria-live="polite">
        <p className="text-sm font-medium">{stage + 1} · {current?.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{current?.text}</p>
        {stage === 5 && (
          <div className="mt-3 border border-border bg-card p-3">
            <MathTex tex={String.raw`J_n = q\mu_n nE + qD_n\frac{dn}{dx} = 0 \qquad J_p = q\mu_p pE - qD_p\frac{dp}{dx} = 0`} block />
            <p className="mt-1 text-xs text-muted-foreground">Drift and diffusion currents cancel for both carrier types; the built-in potential sustains the balance.</p>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <Button size="icon" variant="outline" aria-label="Previous visual stage" title="Previous stage" disabled={stage === 0} onClick={() => setStage(stage - 1)}>
            <ArrowLeft />
          </Button>
          <span className="font-mono text-xs text-muted-foreground">{stage + 1} / {stages.length}</span>
          <Button size="icon" variant="outline" aria-label="Next visual stage" title="Next stage" disabled={stage === stages.length - 1} onClick={() => setStage(stage + 1)}>
            <ArrowRight />
          </Button>
        </div>
      </div>
    </section>
  );
}

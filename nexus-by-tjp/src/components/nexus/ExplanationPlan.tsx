import { useState } from "react";
import { ExternalLink, Film, GitBranch, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathTex } from "./Math";
import { JunctionVisual } from "./JunctionVisual";

export function ExplanationPlan({ gap }: { gap: string }) {
  const [resources, setResources] = useState(false);
  const [format, setFormat] = useState("visual");
  return <>
    <div className="flex flex-wrap justify-between gap-2 border-b pb-3"><span className="eyebrow">Explanation Planner</span><span className="font-mono text-[10px] text-ai">Sample plan · not live AI</span></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Diagnostic input</p><p className="mt-1 text-sm font-medium">{gap} gap · diffusion → equilibrium</p><p className="mt-2 text-xs text-success">Prior knowledge · Electric fields / PHYS 212 · demo verified</p></div><div><p className="text-xs text-muted-foreground">Missing relationship</p><p className="mt-1 text-sm">The depletion field creates drift that balances diffusion, rather than stopping it.</p></div></div>
    <ol className="mt-3 space-y-2 border-y py-3 text-sm">{["Recover the causal chain", "Inspect carrier motion and field direction", "Connect equilibrium current to built-in voltage", "Apply it to a silicon junction", "Explain independently and check the result"].map((item,i) => <li key={item}><span className="mr-2 font-mono text-xs text-primary">0{i+1}</span>{item}</li>)}</ol>
    <p className="mt-3 text-xs text-muted-foreground">A spatial diagram targets this sample gap. Videos are optional; no learning-format history has been measured.</p>
    <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant={format === "visual" ? "default" : "outline"} onClick={() => setFormat("visual")}><GitBranch />Spatial diagram</Button><Button size="sm" variant={format === "equation" ? "default" : "outline"} onClick={() => setFormat("equation")}><Sigma />Equation path</Button></div>
    {format === "visual" ? <JunctionVisual /> : <div className="mt-3 border bg-background p-3"><p className="eyebrow">Equation visualization · authored demo</p><MathTex tex={String.raw`J_n=0\ \Longrightarrow\ E=-\frac{kT}{q}\frac{d\ln n}{dx}\ \Longrightarrow\ \Delta\phi=\frac{kT}{q}\ln\!\frac{n_n}{n_p}`} block /><p className="text-xs text-muted-foreground">Use the Einstein relation, integrate from p to n, then substitute equilibrium carrier concentrations. Non-degenerate doping and constant temperature.</p></div>}
    <Button className="mt-3" size="sm" variant="outline" onClick={() => setResources(!resources)} aria-expanded={resources}><Film />{resources ? "Hide outside resources" : "Still stuck? Outside resources"}</Button>
    {resources && <section className="mt-3 border-t pt-3"><h3 className="eyebrow">Resource Scout · Suggested searches</h3><p className="mt-2 text-xs text-muted-foreground">No live search or video ranking has run. These open YouTube searches; durations, segments, and technical accuracy are not verified.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{[
      { title: "Physical intuition", query: "PN junction depletion region diffusion drift equilibrium Neso Academy", reason: "Focus on how diffusion uncovers ions and builds the electric field. This bridges your sample electric-field prerequisite to equilibrium." },
      { title: "Mathematical derivation", query: "PN junction built in potential derivation equilibrium carrier concentrations undergraduate", reason: "Look for a derivation using carrier concentration ratios and the Einstein relation, complementing the spatial explanation." },
    ].map(item => <article key={item.title} className="border bg-background p-3"><h4 className="text-sm font-medium">{item.title}</h4><p className="mt-2 text-xs text-muted-foreground">{item.reason}</p><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.query)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline">Search YouTube <ExternalLink size={12} /></a></article>)}</div><p className="mt-3 text-xs text-muted-foreground">Selection criteria: exact gap, undergraduate level, credible derivation, concise coverage, and a different teaching approach, not popularity.</p></section>}
  </>;
}
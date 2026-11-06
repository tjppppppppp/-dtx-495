import { useState } from "react";
import { Search, Network, BookOpen, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVault } from "./VaultProvider";
import { NoteMarkdown } from "./NoteMarkdown";
import { retrieveNotes } from "@/lib/vault";

export function VaultRetrieval({ problem, course, scope, setScope }: { problem: string; course: string; scope: string; setScope: (scope: string) => void }) {
  const { library } = useVault();
  const [selectedPath, setSelectedPath] = useState("");
  const [mode, setMode] = useState("Evidence");
  if (!library) return null;
  const scoped = scope === "All indexed courses" ? library.notes : library.notes.filter((note) => note.course === scope);
  const hits = retrieveNotes(scoped, problem, course);
  const selected = hits.find((hit) => hit.note.path === selectedPath) ?? hits[0];
  return <section className="border bg-card min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2"><h2 className="eyebrow flex items-center gap-2"><Search className="size-3.5" />Vault retrieval</h2><select aria-label="Retrieval course scope" value={scope} onChange={(event) => setScope(event.target.value)} className="max-w-full rounded border bg-card px-2 py-1 text-xs"><option>All indexed courses</option>{[...new Set(library.notes.map((note) => note.course))].map((name) => <option key={name}>{name}</option>)}</select></div>
    <div className="border-b px-3 py-2 text-[10px] text-muted-foreground">{hits.length} relevant notes / {scoped.length} indexed · local keyword ranking · excerpts only</div>
    {!hits.length ? <p className="p-3 text-sm text-muted-foreground">No relevant vault material found. Refine the current problem or add notes within the allowed scope.</p> : <div className="grid sm:grid-cols-[200px_minmax(0,1fr)]">
      <div className="divide-y border-b sm:border-b-0 sm:border-r">{hits.map((hit) => <Button key={hit.note.path} variant="ghost" className={`h-auto w-full flex-col items-start gap-1 whitespace-normal rounded-none px-3 py-3 text-left ${selected?.note.path === hit.note.path ? "bg-accent" : ""}`} onClick={() => { setSelectedPath(hit.note.path); setMode("Evidence"); }}><span className="text-xs font-semibold">{hit.note.title}</span><span className="break-all font-mono text-[10px] text-muted-foreground">{hit.note.path}</span><span className="text-[10px] text-source">{hit.note.course} · Source excerpt</span></Button>)}</div>
      {selected && <div className="min-w-0 p-3 space-y-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Retrieved material views">{[{ name: "Evidence", icon: BookOpen }, { name: "Connections", icon: Network }, { name: "Practice", icon: Pencil }].map(({ name, icon: Icon }) => <Button key={name} size="sm" variant={mode === name ? "secondary" : "ghost"} role="tab" aria-selected={mode === name} onClick={() => setMode(name)}><Icon />{name}</Button>)}</div>
        <div className="break-all font-mono text-[10px] text-primary">Source: {selected.note.path} / {selected.heading}</div>
        {mode === "Evidence" && <><NoteMarkdown text={selected.excerpt} /><div className="flex flex-wrap gap-1">{selected.note.tags.map((tag) => <span key={tag} className="bg-muted px-1.5 py-0.5 font-mono text-[10px]">#{tag}</span>)}</div><p className="text-[10px] text-muted-foreground">Verbatim excerpt · not independently verified</p></>}
        {mode === "Connections" && <><p className="eyebrow">Explicit note links · not inferred</p>{selected.linked.length ? selected.linked.map((note) => <div key={note.path} className="border-l-2 border-derived pl-2"><p className="text-sm font-medium">{selected.note.title} → {note.title}</p><p className="break-all font-mono text-[10px] text-muted-foreground">Connected through: {note.path}</p></div>) : <p className="text-xs text-muted-foreground">No outgoing links resolve within this indexed scope.</p>}<p className="eyebrow">Backlinks</p><p className="break-all text-xs">{selected.note.backlinks.join(" · ") || "None in this scope"}</p></>}
        {mode === "Practice" && <><p className="eyebrow">Source-linked prompts · template, not AI-generated</p><ol className="list-decimal pl-4 space-y-3 text-sm"><li>Explain “{selected.heading}” in your own words, then compare with the cited excerpt.</li><li>How does “{selected.note.title}” help address: {problem}?</li>{selected.linked[0] && <li>Describe the relationship between “{selected.note.title}” and “{selected.linked[0].title}”. What evidence supports it?</li>}</ol></>}
      </div>}
    </div>}
  </section>;
}
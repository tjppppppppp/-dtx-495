import { useDeferredValue, useMemo, useState } from "react";
import { useVault } from "./VaultProvider";
import { VaultLibrary } from "./VaultLibrary";
import { NoteMarkdown } from "./NoteMarkdown";
import { retrieveNotes } from "@/lib/vault";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function NoteContext({ problem, onContext, consent, onConsent }: { problem: string; onContext: (path: string, title: string, excerpt: string) => void; consent: boolean; onConsent: (value: boolean) => void }) {
  const { library } = useVault();
  const [path, setPath] = useState("");
  const selected = library?.notes.find((note) => note.path === path);
  // Defer retrieval so typing stays responsive; results update when idle.
  const deferredProblem = useDeferredValue(problem);
  const hits = useMemo(
    () => (library ? retrieveNotes(library.notes, deferredProblem, "", 4) : []),
    [library, deferredProblem],
  );
  return <div className="space-y-3">
    <VaultLibrary />
    {library && <>
      <Label htmlFor="current-note">Current Obsidian note</Label>
      <select id="current-note" className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm" value={path} onChange={(event) => {
        const next = event.target.value;
        setPath(next);
        const note = library.notes.find((item) => item.path === next);
        onContext(next, note?.title ?? "", note?.body.slice(0, 1200) ?? "");
      }}>
        <option value="">Choose an indexed note (optional)</option>
        {library.notes.map((note) => <option key={note.path} value={note.path}>{note.path}</option>)}
      </select>
      {selected && <div className="max-h-48 overflow-auto border-l-2 border-source pl-3"><NoteMarkdown text={selected.body.slice(0, 1200)} /></div>}
      {hits.length > 0 && <div className="space-y-1 text-xs"><p className="font-medium">Relevant notes · {hits.length}</p>{hits.map((hit) => <p key={hit.note.path} className="break-all font-mono text-muted-foreground">{hit.note.path}</p>)}</div>}
      <div className="flex items-start gap-2">
        <Checkbox id="ai-note-consent" checked={consent} onCheckedChange={(value) => onConsent(value === true)} />
        <Label htmlFor="ai-note-consent" className="block text-xs leading-relaxed">Use the current note excerpt and up to three relevant excerpts with AI for this task. These excerpts leave this browser; generated explanations are saved to your account. The rest of your vault stays local.</Label>
      </div>
    </>}
  </div>;
}
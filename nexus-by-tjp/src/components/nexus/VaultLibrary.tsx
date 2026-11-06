import { useRef, useState } from "react";
import { FolderOpen, FileText, Trash2, ShieldCheck, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVault } from "./VaultProvider";
import { NoteMarkdown } from "./NoteMarkdown";
import { defaultExclusions, inScope, indexNotes, normalizePath, parseNote, type VaultNote } from "@/lib/vault";

type Candidate = { file: File; path: string };
export function VaultLibrary() {
  const { library, setLibrary } = useVault();
  const picker = useRef<HTMLInputElement>(null);
  const notesPicker = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("Selected folder");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allowed, setAllowed] = useState("");
  const [excluded, setExcluded] = useState(defaultExclusions);
  const [checked, setChecked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<VaultNote | null>(null);
  const [inspected, setInspected] = useState<VaultNote | null>(null);
  const allowlist = allowed.split(",").map((entry) => entry.trim());
  const exclusions = excluded.split(",").map((entry) => entry.trim()).filter(Boolean);
  const scoped = candidates.filter((candidate) => inScope(candidate.path, allowlist, exclusions));
  const chosen = scoped.filter((candidate) => checked.includes(candidate.path));
  function stage(files: FileList | null) {
    if (!files?.length) return;
    const staged = Array.from(files).map((file) => ({ file, path: normalizePath(file.webkitRelativePath || file.name) }));
    setCandidates(staged);
    const root = staged[0]?.path.split("/")[0] ?? "";
    const initial = mode === "Selected notes" ? "" : root;
    setAllowed(initial);
    setChecked(staged.filter((candidate) => inScope(candidate.path, [initial], defaultExclusions.split(",").map((entry) => entry.trim()))).map((candidate) => candidate.path));
    setExcluded(defaultExclusions);
    setMessage(""); setPreview(null);
  }
  async function inspect(candidate: Candidate) {
    try { setPreview(parseNote(candidate.path, await candidate.file.text(), candidate.file.lastModified)); }
    catch { setMessage(`Cannot preview ${candidate.path}: invalid Markdown metadata.`); }
  }
  async function buildIndex() {
    setBusy(true); setMessage("");
    const notes: VaultNote[] = [];
    const errors: string[] = [];
    for (const candidate of chosen) {
      try { notes.push(parseNote(candidate.path, await candidate.file.text(), candidate.file.lastModified)); }
      catch { errors.push(candidate.path); }
    }
    if (notes.length) {
      setLibrary({ name: mode === "Selected notes" ? "Selected notes" : candidates[0]?.path.split("/")[0] ?? "Obsidian vault", notes: indexNotes(notes) });
      setInspected(null); setCandidates([]); setChecked([]); setPreview(null);
      setMessage(`${notes.length} notes indexed${errors.length ? `; ${errors.length} unreadable notes skipped` : ""}.`);
      if (!errors.length) setOpen(false);
    } else setMessage("No notes indexed. Check the selection and Markdown metadata.");
    setBusy(false);
  }
  return <div className="space-y-2 min-w-0">
    <Button variant="outline" size="sm" className="h-auto min-h-8 w-full justify-start whitespace-normal text-left py-2" onClick={() => { setMessage(""); setOpen(true); }}><FolderOpen /><span>Connect Obsidian vault</span></Button>
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><ShieldCheck className="size-3 shrink-0" />Local · this tab only · no sync</div>
    {library && <div className="border-t pt-2">
      <div className="flex items-center justify-between gap-2"><span className="min-w-0 break-all text-xs font-medium">{library.name}</span><Button variant="ghost" size="icon" aria-label="Remove vault source" title="Remove vault source" onClick={() => { setLibrary(null); setInspected(null); setMessage("Vault source removed."); }}><Trash2 /></Button></div>
      <p role="status" className="mb-2 text-xs text-source"><Check className="mr-1 inline size-3" />{library.notes.length} notes indexed</p>
      <div className="max-h-48 overflow-auto divide-y">{library.notes.map((note) => <Button key={note.path} variant="ghost" size="sm" className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => setInspected(note)}><FileText className="shrink-0" /><span className="break-all font-mono text-[10px]">{note.path}</span></Button>)}</div>
    </div>}
    {message && !open && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
    <Dialog open={open} onOpenChange={(value) => { if (!busy) { setOpen(value); if (!value) { setCandidates([]); setChecked([]); setPreview(null); } } }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Connect Obsidian vault</DialogTitle><DialogDescription>Import stays local. Review before indexing; refresh clears the library. Using excerpts with AI requires separate consent for each task. This is a one-time import, not live Obsidian sync.{library ? " Indexing a new selection replaces the current library." : ""}</DialogDescription></DialogHeader>
        <label className="space-y-1 text-xs"><span className="eyebrow">Import scope</span><select aria-label="Import scope" value={mode} onChange={(event) => { setMode(event.target.value); setCandidates([]); setChecked([]); setPreview(null); }} className="block w-full rounded border bg-card px-3 py-2"><option>Selected folder</option><option>Entire vault</option><option>Selected notes</option></select></label>
        <input ref={(node) => { picker.current = node; node?.setAttribute("webkitdirectory", ""); }} type="file" multiple className="hidden" aria-label="Choose vault folder" onChange={(event) => { stage(event.target.files); event.target.value = ""; }} />
        <input ref={notesPicker} type="file" accept=".md" multiple className="hidden" aria-label="Choose Markdown notes" onChange={(event) => { stage(event.target.files); event.target.value = ""; }} />
        <Button variant="outline" className="justify-start" disabled={busy} onClick={() => (mode === "Selected notes" ? notesPicker : picker).current?.click()}><FolderOpen />{mode === "Selected notes" ? "Choose Markdown notes" : mode === "Entire vault" ? "Choose vault folder" : "Choose selected folder"}</Button>
        {candidates.length > 0 && <>
          <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs"><span className="eyebrow">Allowed folders · comma separated</span><input aria-label="Allowed folders" value={allowed} onChange={(event) => { setAllowed(event.target.value); setPreview(null); }} placeholder="All selected folders" className="w-full rounded border bg-card p-2" /></label><label className="space-y-1 text-xs"><span className="eyebrow">Excluded folders · comma separated</span><input aria-label="Excluded folders" value={excluded} onChange={(event) => { setExcluded(event.target.value); setPreview(null); }} className="w-full rounded border bg-card p-2" /></label></div>
          <div className="flex flex-wrap justify-between gap-2 text-xs"><span>{chosen.length} selected · {scoped.length} eligible Markdown notes · {candidates.length - scoped.length} excluded/non-Markdown</span><span className="text-verify">Review personal content before indexing</span></div>
          <div className="max-h-64 overflow-auto border bg-card divide-y">{scoped.map((candidate) => <div key={candidate.path} className="flex items-center gap-2 px-3 py-2"><Checkbox aria-label={`Include ${candidate.path}`} checked={checked.includes(candidate.path)} onCheckedChange={(value) => setChecked((previous) => value === true ? [...previous, candidate.path] : previous.filter((path) => path !== candidate.path))} /><span className="min-w-0 flex-1 break-all font-mono text-xs">{candidate.path}</span><Button variant="ghost" size="sm" disabled={busy} onClick={() => inspect(candidate)}>Preview</Button></div>)}{!scoped.length && <p className="p-3 text-xs text-muted-foreground">No Markdown notes match this scope.</p>}</div>
          {preview && <div className="border-l-2 border-primary pl-3"><div className="mb-2 break-all font-mono text-xs text-primary">{preview.path}</div><div className="max-h-48 overflow-auto"><NoteMarkdown text={preview.body} /></div></div>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={() => { setCandidates([]); setChecked([]); setPreview(null); }}>Discard selection</Button><Button disabled={busy || !chosen.length} onClick={buildIndex}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />}{busy ? "Indexing…" : `Index ${chosen.length} selected notes`}</Button></div>
        </>}
        {message && <p role="status" className="text-xs text-verify">{message}</p>}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(inspected)} onOpenChange={(value) => { if (!value) setInspected(null); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{inspected?.title}</DialogTitle><DialogDescription className="break-all">{inspected?.path}</DialogDescription></DialogHeader>{inspected && <><div className="flex flex-wrap gap-2 font-mono text-xs text-muted-foreground"><span>{inspected.course}</span><span>{new Date(inspected.modified).toLocaleDateString()}</span>{inspected.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><div className="border-y py-3"><NoteMarkdown text={inspected.body} /></div><dl className="space-y-2 text-xs"><dt className="eyebrow">Outgoing links</dt><dd className="break-words">{inspected.links.join(" · ") || "None"}</dd><dt className="eyebrow">Backlinks · indexed scope only</dt><dd className="break-all">{inspected.backlinks.join(" · ") || "None"}</dd><dt className="eyebrow">Original metadata</dt><dd><pre className="whitespace-pre-wrap break-all font-mono">{JSON.stringify(inspected.metadata, null, 2)}</pre></dd></dl></>}</DialogContent></Dialog>
  </div>;
}
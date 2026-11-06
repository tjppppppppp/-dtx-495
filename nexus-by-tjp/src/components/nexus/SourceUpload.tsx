import { useRef, useState } from "react";
import { Check, FileText, Image, Plus, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { sourceAccept, sourceType } from "@/lib/source-files";
import { extractText, isImageFile } from "@/lib/extract-text";
import { createSource, listSources, removeSource } from "@/lib/sources.functions";

type PendingItem = { key: string; name: string; type: string; state: "uploading" | "processing" | "failed"; detail?: string };

const STATUS_LABEL: Record<string, string> = {
  uploading: "Uploading",
  processing: "Processing",
  indexed: "Indexed",
  failed: "Failed",
};

export function SourceUpload({ courseId }: { courseId?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const fetchSources = useServerFn(listSources);
  const createSourceFn = useServerFn(createSource);
  const removeSourceFn = useServerFn(removeSource);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [error, setError] = useState("");

  const { data: saved = [] } = useQuery({
    queryKey: ["sources", courseId ?? "all"],
    queryFn: () => fetchSources({ data: courseId ? { courseId } : undefined }),
  });

  const remove = useMutation({
    mutationFn: (args: { id: string; storagePath?: string | null }) => removeSourceFn({ data: args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Source removed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove source"),
  });

  function setPendingItem(key: string, patch: Partial<PendingItem>) {
    setPending((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  async function uploadOne(file: File, type: string, key: string) {
    // 1. Upload the raw file to private storage.
    setPendingItem(key, { state: "uploading" });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("You must be signed in to upload.");
    const storagePath = `${userData.user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("sources").upload(storagePath, file);
    if (upErr) throw new Error(upErr.message);

    // 2. Extract readable content.
    setPendingItem(key, { state: "processing" });
    let text: string | null = null;
    let note: string | undefined;
    if (isImageFile(file.name, file.type)) {
      note = "Stored as a visual source (no text extraction).";
    } else {
      const result = await extractText(file);
      if (result.ok) {
        text = result.text;
        note = result.note;
      } else if (result.reason !== "image") {
        note = result.reason;
      }
    }

    // 3. Save metadata + extracted text; status reflects what actually happened.
    const row = await createSourceFn({
      data: {
        filename: file.name,
        fileType: type.toLowerCase(),
        courseId: courseId ?? null,
        kind: "upload",
        storagePath,
        extractedText: text,
        metadata: { size: file.size, mime: file.type, ...(note ? { note } : {}) },
      },
    });
    if (row.status === "failed" && note) {
      setPendingItem(key, { state: "failed", detail: note });
      return;
    }
    setPending((prev) => prev.filter((p) => p.key !== key));
    queryClient.invalidateQueries({ queryKey: ["sources"] });
    toast.success(`Source added: ${file.name}`);
  }

  function select(files: FileList | null) {
    if (!files) return;
    setError("");
    const rejected: string[] = [];
    const accepted: { file: File; type: string; key: string }[] = [];
    Array.from(files).forEach((file, index) => {
      const type = sourceType(file);
      if (!type) {
        rejected.push(file.name);
        return;
      }
      accepted.push({ file, type, key: `${Date.now()}-${index}` });
    });
    if (rejected.length) setError(`Unsupported file: ${rejected.join(", ")}. Choose PDF, DOCX, image, Markdown, or text.`);
    setPending((prev) => [...prev, ...accepted.map((a) => ({ key: a.key, name: a.file.name, type: a.type, state: "uploading" as const }))]);
    for (const a of accepted) {
      uploadOne(a.file, a.type, a.key).catch((err) => {
        setPendingItem(a.key, { state: "failed", detail: err instanceof Error ? err.message : "Upload failed." });
      });
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        aria-label="Upload source files"
        accept={sourceAccept}
        multiple
        className="hidden"
        onChange={(event) => {
          select(event.target.files);
          event.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => input.current?.click()}>
        <Plus />Add a file
      </Button>
      <p className="text-[10px] text-muted-foreground">PDF, DOCX, Markdown, text, or images. Text is extracted and indexed for retrieval.</p>
      {error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}

      <div aria-live="polite" className="space-y-2">
        {pending.map((p) => (
          <div key={p.key} className="border-l-2 border-source pl-2 text-xs">
            <div className="flex items-start gap-1.5">
              {p.type === "Image" ? <Image className="size-3.5 shrink-0" /> : <FileText className="size-3.5 shrink-0" />}
              <span className="break-all font-mono">{p.name}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-muted-foreground">
              {p.type} ·{" "}
              {p.state === "failed" ? (
                <>
                  <TriangleAlert className="size-3 text-destructive" />
                  <span className="text-destructive">Failed{p.detail ? `: ${p.detail}` : ""}</span>
                </>
              ) : (
                <>
                  <LoaderCircle className="size-3 animate-spin" />
                  {STATUS_LABEL[p.state]}…
                </>
              )}
            </div>
            {p.state === "failed" && (
              <button type="button" className="mt-0.5 text-[10px] text-muted-foreground underline" onClick={() => setPending((prev) => prev.filter((x) => x.key !== p.key))}>
                Dismiss
              </button>
            )}
          </div>
        ))}

        {saved.map((s) => (
          <div key={s.id} className="group border-l-2 border-source pl-2 text-xs">
            <div className="flex items-start gap-1.5">
              {s.file_type === "image" ? <Image className="size-3.5 shrink-0" /> : <FileText className="size-3.5 shrink-0" />}
              <span className="break-all font-mono">{s.filename}</span>
              <button
                type="button"
                aria-label={`Remove ${s.filename}`}
                className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                onClick={() => remove.mutate({ id: s.id, storagePath: s.storage_path })}
              >
                <X className="size-3" />
              </button>
            </div>
            <div className="mt-1 flex items-center gap-1 text-muted-foreground">
              {s.kind === "obsidian" ? "Obsidian note" : s.file_type} ·{" "}
              {s.status === "indexed" ? (
                <>
                  <Check className="size-3 text-source" />
                  <span className="text-source">Indexed</span>
                </>
              ) : (
                <span className="text-destructive">{STATUS_LABEL[s.status] ?? s.status}</span>
              )}
            </div>
            {typeof (s.metadata as Record<string, unknown>)?.["note"] === "string" && (
              <p className="mt-1 text-[10px] text-muted-foreground">{String((s.metadata as Record<string, unknown>)["note"])}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

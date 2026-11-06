import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SourceStatus = "uploading" | "processing" | "indexed" | "failed";

export const listSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId?: string } | undefined) => input)
  .handler(async ({ data: input, context }) => {
    let q = context.supabase
      .from("sources")
      .select("id, course_id, kind, filename, file_type, storage_path, note_path, status, metadata, created_at")
      .order("created_at", { ascending: false });
    if (input?.courseId) q = q.eq("course_id", input.courseId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data;
  });

export const createSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      filename: string;
      fileType: string;
      courseId?: string | null;
      kind?: "upload" | "obsidian";
      storagePath?: string | null;
      notePath?: string | null;
      extractedText?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      if (!input.filename?.trim()) throw new Error("Filename is required.");
      return input;
    },
  )
  .handler(async ({ data: input, context }) => {
    const hasText = !!input.extractedText && input.extractedText.trim().length > 0;
    const { data, error } = await context.supabase
      .from("sources")
      .insert({
        user_id: context.userId,
        course_id: input.courseId ?? null,
        kind: input.kind ?? "upload",
        filename: input.filename.trim(),
        file_type: input.fileType,
        storage_path: input.storagePath ?? null,
        note_path: input.notePath ?? null,
        status: hasText || input.fileType === "image" ? "indexed" : "failed",
        extracted_text: input.extractedText ?? null,
        metadata: (input.metadata ?? {}) as never,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateSourceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: SourceStatus; extractedText?: string }) => input)
  .handler(async ({ data: input, context }) => {
    const { error } = await context.supabase
      .from("sources")
      .update({
        status: input.status,
        ...(input.extractedText !== undefined ? { extracted_text: input.extractedText } : {}),
      })
      .eq("id", input.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; storagePath?: string | null }) => input)
  .handler(async ({ data: input, context }) => {
    if (input.storagePath) {
      await context.supabase.storage.from("sources").remove([input.storagePath]);
    }
    const { error } = await context.supabase
      .from("sources")
      .delete()
      .eq("id", input.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Retrieval: keyword-scored excerpts over the user's indexed sources.
export const retrieveSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; courseId?: string | null; limit?: number }) => {
    if (!input.query?.trim()) throw new Error("Query is required.");
    return input;
  })
  .handler(async ({ data: input, context }) => {
    const { retrieveSourcesForUser } = await import("@/lib/retrieval.server");
    return retrieveSourcesForUser(context.supabase, context.userId, input.query, input.courseId, input.limit ?? 6);
  });

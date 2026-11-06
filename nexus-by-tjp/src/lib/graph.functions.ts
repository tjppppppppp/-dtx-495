import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listConcepts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("concepts")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("connections")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const listGaps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: "open" | "resolved" } | undefined) => input)
  .handler(async ({ data: input, context }) => {
    let q = context.supabase
      .from("gaps")
      .select("*")
      .order("created_at", { ascending: false });
    if (input?.status) q = q.eq("status", input.status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertConcept = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; kind?: string; state?: string; courseId?: string | null }) => {
    if (!input.name?.trim()) throw new Error("Concept name is required.");
    return input;
  })
  .handler(async ({ data: input, context }) => {
    const { data, error } = await context.supabase
      .from("concepts")
      .upsert(
        {
          user_id: context.userId,
          name: input.name.trim(),
          kind: input.kind ?? "concept",
          state: input.state ?? "seen",
          course_id: input.courseId ?? null,
        },
        { onConflict: "user_id,name" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateConceptState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; state: string }) => input)
  .handler(async ({ data: input, context }) => {
    const { error } = await context.supabase
      .from("concepts")
      .update({ state: input.state })
      .eq("id", input.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      fromConceptId: string;
      toConceptId: string;
      relation: string;
      provenance: string;
      rationale?: string;
      sessionId?: string | null;
    }) => input,
  )
  .handler(async ({ data: input, context }) => {
    const { data, error } = await context.supabase
      .from("connections")
      .insert({
        user_id: context.userId,
        from_concept_id: input.fromConceptId,
        to_concept_id: input.toConceptId,
        relation: input.relation,
        provenance: input.provenance,
        rationale: input.rationale ?? null,
        session_id: input.sessionId ?? null,
        last_verified_at: input.provenance === "student-verified" ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

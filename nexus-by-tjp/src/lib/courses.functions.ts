import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

export const createCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; code: string; semester?: string | undefined; instructor?: string | undefined }) => {
    if (!input.name?.trim() || !input.code?.trim()) throw new Error("Course name and code are required.");
    return input;
  })
  .handler(async ({ data: input, context }) => {
    const { data, error } = await context.supabase
      .from("courses")
      .insert({
        user_id: context.userId,
        name: input.name.trim(),
        code: input.code.trim(),
        semester: input.semester?.trim() || null,
        instructor: input.instructor?.trim() || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: input, context }) => {
    const { error } = await context.supabase
      .from("courses")
      .delete()
      .eq("id", input.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

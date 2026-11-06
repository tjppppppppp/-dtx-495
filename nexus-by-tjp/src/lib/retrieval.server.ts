// Server-only retrieval over a user's indexed sources.
// Keyword-scored excerpts; only relevant passages are returned for AI context.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface RetrievedSource {
  id: string;
  filename: string;
  notePath: string | null;
  courseId: string | null;
  kind: string;
  excerpt: string;
  relevance: number;
  matchedTerms: string[];
}

export async function retrieveSourcesForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: string,
  courseId?: string | null,
  limit = 6,
): Promise<RetrievedSource[]> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, course_id, kind, filename, note_path, extracted_text")
    .eq("user_id", userId)
    .eq("status", "indexed")
    .not("extracted_text", "is", null);
  if (error) throw new Error(error.message);

  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  return (data ?? [])
    .map((s) => {
      const text = (s.extracted_text ?? "").toLowerCase();
      const matched = terms.filter((t) => text.includes(t));
      if (matched.length < Math.min(2, terms.length)) return null;
      const idx = text.indexOf(matched[0]!);
      const raw = s.extracted_text ?? "";
      const start = Math.max(0, idx - 160);
      const excerpt = raw.slice(start, start + 480).trim();
      const courseBonus = courseId && s.course_id === courseId ? 2 : 0;
      return {
        id: s.id,
        filename: s.filename,
        notePath: s.note_path,
        courseId: s.course_id,
        kind: s.kind,
        excerpt,
        relevance: matched.length + courseBonus,
        matchedTerms: matched,
      };
    })
    .filter((h): h is RetrievedSource => h !== null)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

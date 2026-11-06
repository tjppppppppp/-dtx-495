import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Diagnosis, LearningPackage, Verification, GapType } from "@/lib/nexus-ai.server";
import { needsFoundation, foundationPrerequisites } from "@/lib/learning-routing";
import { z } from "zod";

const localEvidence = z.array(z.object({ filename: z.string().max(500), notePath: z.string().max(500).optional(), excerpt: z.string().max(1200), relevance: z.number() })).max(4).optional();

// Server-only helpers (AI calls, retrieval) are dynamically imported inside
// handlers so no server code enters the client bundle.
async function retrieveForSession(
  context: { supabase: never; userId: string },
  session: { topic: string | null; problem_text: string; course_id: string | null },
) {
  const { retrieveSourcesForUser } = await import("@/lib/retrieval.server");
  return retrieveSourcesForUser(
    context.supabase,
    context.userId,
    `${session.topic ?? ""} ${session.problem_text}`,
    session.course_id,
    6,
  );
}

export const listSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sessions")
      .select("id, course_id, topic, problem_text, status, diagnosis, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: input, context }) => {
    const { data, error } = await context.supabase
      .from("sessions")
      .select("*")
      .eq("id", input.id)
      .eq("user_id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { problemText: string; topic?: string | undefined; courseId?: string | null | undefined }) => {
    if (!input.problemText?.trim()) throw new Error("Describe the problem you're stuck on.");
    return input;
  })
  .handler(async ({ data: input, context }) => {
    const { data, error } = await context.supabase
      .from("sessions")
      .insert({
        user_id: context.userId,
        course_id: input.courseId ?? null,
        topic: input.topic?.trim() || null,
        problem_text: input.problemText.trim(),
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

// Orchestrator step 1: retrieve relevant material, then run the Diagnostic Agent.
export const runDiagnosis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sessionId: z.string().uuid(), studentStatement: z.string().trim().min(1).max(6000), localEvidence }).parse(input))
  .handler(async ({ data: input, context }) => {
    const { data: session, error } = await context.supabase
      .from("sessions")
      .select("*")
      .eq("id", input.sessionId)
      .eq("user_id", context.userId)
      .single();
    if (error || !session) throw new Error("Session not found.");

    // Retrieval Agent: search the student's indexed sources.
    const retrieved = [...(input.localEvidence ?? []), ...await retrieveForSession(context as never, session)].slice(0, 6);

    const { data: concepts } = await context.supabase
      .from("concepts")
      .select("name")
      .eq("user_id", context.userId)
      .in("state", ["understood", "applied", "verified", "connected"]);

    const courseCode = session.course_id
      ? (await context.supabase.from("courses").select("code").eq("id", session.course_id).single()).data?.code
      : undefined;

    const { diagnoseGap } = await import("@/lib/nexus-ai.server");
    const diagnosis: Diagnosis = needsFoundation(input.studentStatement) ? {
      gapType: "foundation", confidence: "high", reasoning: "No problem. Let's build this from the beginning.", targetedQuestions: [], prerequisiteConcepts: foundationPrerequisites(session.problem_text),
    } : await diagnoseGap({
      problem: session.problem_text,
      topic: session.topic ?? undefined,
      courseCode,
      studentStatement: input.studentStatement,
      retrieved,
      knownConcepts: (concepts ?? []).map((c) => c.name),
    });
    diagnosis.studentStatement = input.studentStatement;

    const { error: upErr } = await context.supabase
      .from("sessions")
      .update({ diagnosis: diagnosis as never, status: "diagnosed", updated_at: new Date().toISOString() })
      .eq("id", session.id);
    if (upErr) throw new Error(upErr.message);

    await context.supabase.from("gaps").insert({
      user_id: context.userId,
      session_id: session.id,
      gap_type: diagnosis.gapType,
      confidence: diagnosis.confidence,
      status: "open",
    });

    return { diagnosis, retrieved };
  });

// Orchestrator step 2: planner builds the connected learning package.
export const generatePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sessionId: z.string().uuid(), confirmedGapType: z.enum(["retrieval", "foundation", "misconception", "connection"]), localEvidence, adaptation: z.string().max(6000).optional() }).parse(input))
  .handler(async ({ data: input, context }) => {
    const { data: session, error } = await context.supabase
      .from("sessions")
      .select("*")
      .eq("id", input.sessionId)
      .eq("user_id", context.userId)
      .single();
    if (error || !session) throw new Error("Session not found.");

    const retrieved = [...(input.localEvidence ?? []), ...await retrieveForSession(context as never, session)].slice(0, 6);

    const { data: concepts } = await context.supabase
      .from("concepts")
      .select("name")
      .eq("user_id", context.userId)
      .in("state", ["understood", "applied", "verified", "connected"]);

    const courseCode = session.course_id
      ? (await context.supabase.from("courses").select("code").eq("id", session.course_id).single()).data?.code
      : undefined;

    const { buildLearningPackage } = await import("@/lib/nexus-ai.server");
    const pkg: LearningPackage = await buildLearningPackage({
      problem: session.problem_text,
      topic: session.topic ?? undefined,
      courseCode,
      gapType: input.confirmedGapType,
      studentStatement: (session.diagnosis as unknown as Diagnosis | null)?.studentStatement,
      adaptation: input.adaptation,
      retrieved,
      knownConcepts: (concepts ?? []).map((c) => c.name),
    });

    const { error: upErr } = await context.supabase
      .from("sessions")
      .update({ package: pkg as never, status: "packaged", updated_at: new Date().toISOString() })
      .eq("id", session.id);
    if (upErr) throw new Error(upErr.message);

    return { pkg, retrieved };
  });

// Orchestrator step 3: Verification Agent evaluates the understanding check.
export const verifySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; answer: string }) => {
    if (!input.answer?.trim()) throw new Error("Write your answer first.");
    return input;
  })
  .handler(async ({ data: input, context }) => {
    const { data: session, error } = await context.supabase
      .from("sessions")
      .select("*")
      .eq("id", input.sessionId)
      .eq("user_id", context.userId)
      .single();
    if (error || !session) throw new Error("Session not found.");
    const pkg = session.package as unknown as LearningPackage | null;
    if (!pkg) throw new Error("Generate the learning package first.");

    const { verifyUnderstanding } = await import("@/lib/nexus-ai.server");
    const verdict: Verification = await verifyUnderstanding({
      concept: session.topic ?? session.problem_text,
      checkPrompt: pkg.understandingCheck,
      studentAnswer: input.answer,
    });

    await context.supabase.from("practice_attempts").insert({
      user_id: context.userId,
      session_id: session.id,
      prompt: pkg.understandingCheck,
      answer: input.answer,
      verdict: verdict.verdict,
      feedback: verdict.feedback,
    });

    const newStatus = verdict.verdict === "verified" ? "verified" : "packaged";
    await context.supabase
      .from("sessions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", session.id);

    if (verdict.verdict === "verified") {
      await context.supabase
        .from("gaps")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("session_id", session.id)
        .eq("user_id", context.userId);
    }

    return verdict;
  });

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus: Your engineering knowledge, connected" },
      { name: "description", content: "Nexus diagnoses engineering knowledge gaps and builds a verified graph of how your courses connect." },
      { property: "og:title", content: "Nexus: Your engineering knowledge, connected" },
      { property: "og:description", content: "Diagnose knowledge gaps and grow a verified knowledge graph across semesters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user) {
        navigate({ to: "/session", replace: true });
      } else {
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="font-mono text-sm font-semibold tracking-normal">NEXUS</span>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
        <p className="eyebrow">For engineering students</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight">
          Nexus: where what you know connects to what you're learning
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          A nexus is a connection point. Keep your notes where they are. Nexus links a stuck problem to the knowledge you already have, in any course, especially in your Obsidian library.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            ["Diagnose the real gap", "Retrieval, foundation, misconception, or connection. Nexus asks before it concludes."],
            ["Your sources, cited", "Uploads and Obsidian notes are indexed and retrieved with provenance, never dumped into a prompt."],
            ["A graph that persists", "Verified connections between concepts survive semesters and sign-outs."],
          ].map(([title, body]) => (
            <div key={title} className="technical-panel border p-4">
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

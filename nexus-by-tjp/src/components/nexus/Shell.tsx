import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Trust } from "@/lib/nexus-data";
import { trustTone } from "@/lib/nexus-data";
import { DisplayModeToggle } from "./DisplayMode";
import { Button } from "@/components/ui/button";

function useSessionUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}

function AccountMenu() {
  const user = useSessionUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user) {
    return (
      <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Sign in
      </Link>
    );
  }

  const label = (user.user_metadata?.["display_name"] as string | undefined) ?? user.email ?? "Account";
  const initials = label.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-xs text-chrome-muted md:inline" title={label}>{label}</span>
      <div className="flex h-8 w-8 items-center justify-center border-2 border-chrome-foreground bg-primary font-mono text-xs font-semibold text-primary-foreground">{initials}</div>
      <Button variant="ghost" size="sm"
        type="button"
        onClick={handleSignOut}
        className="rounded-md px-2 py-1.5 text-xs text-chrome-muted hover:bg-chrome-foreground/10 hover:text-chrome-foreground"
      >
        Sign out
      </Button>
    </div>
  );
}

export function TopBar() {
  const links = [
    { to: "/session", label: "Learn" },
    { to: "/dashboard", label: "Library & history" },
    { to: "/map", label: "Knowledge map" },
  ] as const;
  return (
    <header className="workspace-header sticky top-0 z-20 border-b-2 border-border bg-chrome text-chrome-foreground">
      <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <circle cx="4" cy="11" r="3" className="fill-primary" />
            <circle cx="18" cy="4" r="3" className="fill-derived" />
            <circle cx="18" cy="18" r="3" className="fill-chrome-foreground" />
            <path d="M4 11 L18 4 M4 11 L18 18 M18 4 L18 18" className="stroke-chrome-foreground/40" strokeWidth="1.2" />
          </svg>
          <span className="font-mono text-xl font-bold tracking-normal">NEXUS</span>
        </Link>
        <nav className="flex flex-wrap gap-1" aria-label="Main navigation">
          {links.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: true }}
              className="border-2 border-transparent px-3 py-1.5 font-mono text-xs font-medium text-chrome-muted hover:border-chrome-muted hover:text-chrome-foreground"
              activeProps={{ className: "border-chrome-foreground bg-primary text-primary-foreground font-semibold" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-chrome-muted">
          <DisplayModeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`technical-panel min-w-0 border p-4 ${className}`}>
      {title && (
        <div className="panel-heading flex flex-wrap items-center justify-between gap-2">
          <h2 className="eyebrow">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function TrustTag({ t }: { t: Trust }) {
  return <span className={`inline-flex items-center border border-current px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-normal ${trustTone[t]}`}>{t}</span>;
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center border border-current px-2 py-0.5 font-mono text-xs font-medium ${className}`}>{children}</span>;
}

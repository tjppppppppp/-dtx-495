import { useEffect, useState } from "react";
import { Moon, Sun, Sunset } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type DisplayMode = "light" | "dark" | "night";
const modes = [
  { value: "light", label: "Light mode", Icon: Sun },
  { value: "dark", label: "Dark mode", Icon: Moon },
  { value: "night", label: "Night light mode", Icon: Sunset },
] as const;

export function DisplayModeToggle() {
  const [mode, setMode] = useState<DisplayMode>("light");
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("nexus-display-mode"); } catch { /* Storage may be unavailable. */ }
    if (saved === "light" || saved === "dark" || saved === "night") {
      setMode(saved);
      document.documentElement.dataset['displayMode'] = saved;
      document.documentElement.classList.toggle("dark", saved !== "light");
    }
  }, []);

  function changeMode(value: string) {
    if (value !== "light" && value !== "dark" && value !== "night") return;
    setMode(value);
    document.documentElement.dataset['displayMode'] = value;
    document.documentElement.classList.toggle("dark", value !== "light");
    try { localStorage.setItem("nexus-display-mode", value); } catch { /* Keep the current choice in memory. */ }
  }

  return (
    <ToggleGroup type="single" value={mode} onValueChange={changeMode} size="sm"
      aria-label="Display mode" className="gap-0 rounded-none border-2 border-chrome-muted p-0.5">
      {modes.map(({ value, label, Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={label} title={label}
          className="rounded-none text-chrome-muted hover:bg-chrome-foreground/10 hover:text-chrome-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <Icon aria-hidden="true" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
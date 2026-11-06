import { createContext, useContext, useState, type ReactNode } from "react";
import type { VaultNote } from "@/lib/vault";

type Library = { name: string; notes: VaultNote[] };
const VaultContext = createContext<{ library: Library | null; setLibrary: (library: Library | null) => void } | null>(null);
export function VaultProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<Library | null>(null);
  return <VaultContext.Provider value={{ library, setLibrary }}>{children}</VaultContext.Provider>;
}
export function useVault() {
  const value = useContext(VaultContext);
  if (!value) throw new Error("VaultProvider is required");
  return value;
}
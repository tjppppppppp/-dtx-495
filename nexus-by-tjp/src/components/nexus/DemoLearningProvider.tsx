import { createContext, useContext, useState, type ReactNode } from "react";

const DemoLearningContext = createContext({ connectionSaved: false, saveConnection: () => {} });
export function DemoLearningProvider({ children }: { children: ReactNode }) {
  const [connectionSaved, setConnectionSaved] = useState(false);
  return <DemoLearningContext.Provider value={{ connectionSaved, saveConnection: () => setConnectionSaved(true) }}>{children}</DemoLearningContext.Provider>;
}
export function useDemoLearning() { return useContext(DemoLearningContext); }
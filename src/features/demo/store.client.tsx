"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEMO_STORAGE_KEY,
  demoStateSchema,
  reduceDemoState,
  seedDemoState,
  type DemoAction,
  type DemoState,
} from "./state";

type DemoStore = {
  state: DemoState | null;
  dispatch: (action: DemoAction) => void;
  reset: () => void;
  storageNotice: string;
};
const Context = createContext<DemoStore | null>(null);
export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [storageNotice, setStorageNotice] = useState("");
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(DEMO_STORAGE_KEY);
        if (!raw) {
          setState(seedDemoState());
          return;
        }
        if (raw.length > 500_000) throw new Error("SIZE");
        const parsed = demoStateSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) throw new Error("FORMAT");
        setState(parsed.data);
      } catch {
        setState(seedDemoState());
        setStorageNotice("The saved demo could not be loaded. A fresh sample workspace is ready.");
      }
    }
    read();
    function sync(e: StorageEvent) {
      if (e.key === DEMO_STORAGE_KEY || e.key === null) read();
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!state) return;
    try {
      const raw = JSON.stringify(state);
      if (localStorage.getItem(DEMO_STORAGE_KEY) !== raw)
        localStorage.setItem(DEMO_STORAGE_KEY, raw);
    } catch {
      setStorageNotice(
        "Browser storage is unavailable. Demo changes will last for this visit only.",
      );
    }
  }, [state]);
  const dispatch = useCallback(
    (action: DemoAction) => setState((s) => (s ? reduceDemoState(s, action) : s)),
    [],
  );
  const reset = useCallback(() => {
    setState(seedDemoState());
    setStorageNotice("");
  }, []);
  return (
    <Context.Provider value={{ state, dispatch, reset, storageNotice }}>
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const store = useContext(Context);
  if (!store) throw new Error("Demo context is required");
  return store;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  dispatch: (action: DemoAction) => boolean;
  reset: () => void;
  storageNotice: string;
};
const Context = createContext<DemoStore | null>(null);
export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const current = useRef<DemoState | null>(null);
  const [loadNotice, setLoadNotice] = useState(""),
    [writeNotice, setWriteNotice] = useState("");
  const replace = useCallback((next: DemoState) => {
    current.current = next;
    setState(next);
  }, []);
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(DEMO_STORAGE_KEY);
        if (!raw) {
          replace(seedDemoState());
          setLoadNotice("");
          return;
        }
        if (raw.length > 2_000_000) throw new Error("SIZE");
        const parsed = demoStateSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) throw new Error("FORMAT");
        replace(parsed.data);
        setLoadNotice("");
      } catch {
        replace(seedDemoState());
        setLoadNotice("The saved demo could not be loaded. A fresh sample workspace is ready.");
      }
    }
    read();
    function sync(e: StorageEvent) {
      if (e.key === DEMO_STORAGE_KEY || e.key === null) read();
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [replace]);
  useEffect(() => {
    if (!state) return;
    try {
      const raw = JSON.stringify(state);
      if (localStorage.getItem(DEMO_STORAGE_KEY) !== raw) {
        localStorage.setItem(DEMO_STORAGE_KEY, raw);
        setWriteNotice("");
      }
    } catch {
      setWriteNotice("Browser storage is unavailable. Demo changes will last for this visit only.");
    }
  }, [state]);
  const dispatch = useCallback(
    (action: DemoAction) => {
      const before = current.current;
      if (!before) return false;
      const next = reduceDemoState(before, action);
      if (next === before) return false;
      replace(next);
      return true;
    },
    [replace],
  );
  const reset = useCallback(() => {
    replace(seedDemoState());
    setLoadNotice("");
    setWriteNotice("");
  }, [replace]);
  const storageNotice = [loadNotice, writeNotice].filter(Boolean).join(" ");
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

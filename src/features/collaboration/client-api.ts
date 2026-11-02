"use client";
import { useRef, useState } from "react";
export function useCollaboration() {
  const keys = useRef(new Map<string, string>()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run<T = Record<string, unknown>>(action: string, input: unknown): Promise<T> {
    const signature = action + ":" + JSON.stringify(input),
      key = keys.current.get(signature) ?? crypto.randomUUID();
    keys.current.set(signature, key);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/collaboration/" + action, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": key },
          body: JSON.stringify(input),
        }),
        data = await response.json();
      if (!response.ok)
        throw new Error(data.error?.message ?? "The action could not be confirmed.");
      keys.current.delete(signature);
      return data as T;
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Connection interrupted. Retry the unchanged action to safely confirm it."
          : e instanceof Error
            ? e.message
            : "The action did not complete.",
      );
      throw e;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error, setError };
}

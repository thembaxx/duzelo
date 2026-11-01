"use client";
import { useRef, useState } from "react";
export function useAgreementMutation() {
  const keys = useRef(new Map<string, string>()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run<T extends Record<string, unknown>>(
    action: string,
    input: unknown,
    worker?: boolean,
  ): Promise<T> {
    const signature = action + ":" + String(worker) + ":" + JSON.stringify(input);
    let key = keys.current.get(signature);
    if (!key) {
      key = crypto.randomUUID();
      keys.current.set(signature, key);
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/agreements/" +
          action +
          (worker === undefined ? "" : "?mode=" + (worker ? "worker" : "client")),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": key },
          body: JSON.stringify(input),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The action did not complete.");
      keys.current.delete(signature);
      return result as T;
    } catch (error) {
      const message =
        error instanceof TypeError || error instanceof SyntaxError
          ? "The response could not be confirmed. Retry the same action or reload the saved agreement."
          : error instanceof Error
            ? error.message
            : "The action did not complete.";
      setError(message);
      throw error;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error, setError };
}

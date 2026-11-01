"use client";
import { useRef, useState, useSyncExternalStore } from "react";
const subscribe = () => () => {};
export const useJobsReady = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
export class JobRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function useJobMutation() {
  const keys = useRef(new Map<string, string>());
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run<T extends Record<string, unknown>>(action: string, data: unknown): Promise<T> {
    const multipart = data instanceof FormData;
    const signature =
      action +
      ":" +
      JSON.stringify(
        multipart
          ? [...data.entries()].map(([k, v]) => [
              k,
              v instanceof File
                ? { name: v.name, size: v.size, type: v.type, modified: v.lastModified }
                : v,
            ])
          : data,
      );
    let key = keys.current.get(signature);
    if (!key) {
      key = crypto.randomUUID();
      keys.current.set(signature, key);
      if (keys.current.size > 20) keys.current.delete(keys.current.keys().next().value!);
    }
    setBusy(true);
    setError("");
    try {
      let response: Response;
      try {
        response = await fetch("/api/v1/jobs/" + action, {
          method: "POST",
          headers: {
            "Idempotency-Key": key,
            ...(multipart ? {} : { "Content-Type": "application/json" }),
          },
          body: multipart ? data : JSON.stringify(data),
        });
      } catch {
        throw new JobRequestError(
          "Connection interrupted. Retry the same action or reload your saved request to check its status.",
          0,
        );
      }
      let body;
      try {
        body = await response.json();
      } catch {
        throw new JobRequestError(
          "The response could not be read. Reload the saved request before trying again.",
          0,
        );
      }
      if (!response.ok)
        throw new JobRequestError(
          body.error?.message ?? "This action could not complete.",
          response.status,
        );
      keys.current.delete(signature);
      return body as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : "This action could not complete.");
      throw e;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error, setError };
}
export async function loadOwnerJob(id: string) {
  const response = await fetch("/api/v1/jobs/" + id, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message ?? "The saved request could not be loaded.");
  return body as import("./types").OwnerJob;
}

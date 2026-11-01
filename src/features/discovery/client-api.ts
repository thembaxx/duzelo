"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export const useDiscoveryReady = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
export async function discoveryRequest<T>(
  action: string,
  input: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/v1/discovery/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(
      "Connection unavailable. Reconnect and retry; the displayed results may be out of date.",
    );
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Search could not complete. Try again.");
  return body as T;
}

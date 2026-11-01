"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function useWorkerReady() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
export async function workerRequest(action: string, data: unknown) {
  const multipart = data instanceof FormData;
  const response = await fetch("/api/v1/workers/" + action, {
    method: "POST",
    headers: {
      ...(!multipart ? { "Content-Type": "application/json" } : {}),
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: multipart ? data : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error?.message ?? "This action could not complete. Please try again.");
  return result as {
    message?: string;
    revision?: number;
    redirect?: string;
    url?: string;
    assetId?: string;
  };
}

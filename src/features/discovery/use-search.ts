"use client";
import { useEffect, useRef, useState } from "react";
import { discoveryRequest } from "./client-api";
import type { SearchInput } from "./schema";
import type { SearchResult } from "./types";
export function useDiscoverySearch(initial: SearchResult, initialFilters: SearchInput) {
  const [filters, setFilters] = useState(initialFilters),
    [result, setResult] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [previous, setPrevious] = useState<(string | null)[]>([]);
  const controller = useRef<AbortController | null>(null),
    last = useRef(initialFilters),
    sequence = useRef(0);
  useEffect(() => () => controller.current?.abort(), []);
  async function search(input: SearchInput, history: (string | null)[] = []) {
    controller.current?.abort();
    const current = new AbortController(),
      request = ++sequence.current;
    controller.current = current;
    setBusy(true);
    setError("");
    try {
      const next = await discoveryRequest<SearchResult>("search", input, current.signal);
      if (request !== sequence.current) return;
      setResult(next);
      last.current = input;
      setPrevious(history);
      setSelected((value) => (next.workers.some((w) => w.slug === value) ? value : null));
      const params = new URLSearchParams();
      if (input.categoryId) params.set("category", input.categoryId);
      if (input.available) params.set("available", "true");
      if (input.tradeReviewed) params.set("trade", "true");
      params.set("radius", String(input.radiusKm));
      params.set("sort", input.sort);
      if (input.location?.kind === "town") params.set("town", input.location.id);
      window.history.replaceState(null, "", "/explore" + (params.size ? "?" + params : ""));
    } catch (error) {
      if (current.signal.aborted) return;
      setError(error instanceof Error ? error.message : "Search could not complete.");
    } finally {
      if (request === sequence.current) setBusy(false);
    }
  }
  return {
    filters,
    setFilters,
    result,
    busy,
    error,
    selected,
    setSelected,
    previous,
    apply: () => search({ ...filters, cursor: null }),
    next: () =>
      search({ ...last.current, cursor: result.nextCursor }, [...previous, last.current.cursor]),
    back: () => search({ ...last.current, cursor: previous.at(-1) ?? null }, previous.slice(0, -1)),
  };
}

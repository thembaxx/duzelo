"use client";
import { useEffect, useRef, useState } from "react";
import { Evidence } from "@/features/collaboration/evidence.client";
import { jobTime } from "@/features/jobs/format";
import type { WorkflowView } from "./types";
export function WorkHistory({
  initial,
  next,
  bookingId,
  grantId,
}: {
  initial: WorkflowView["entries"];
  next: string | null;
  bookingId: string;
  grantId?: string;
}) {
  const [entries, setEntries] = useState(initial),
    [cursor, setCursor] = useState(next),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function earlier() {
    if (!cursor) return;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const url = grantId
        ? "/api/v1/collaboration/audit?id=" + grantId
        : "/api/v1/collaboration/workflow?id=" + bookingId;
      const response = await fetch(url + "&entryCursor=" + encodeURIComponent(cursor), {
          cache: "no-store",
          signal: controller.current.signal,
        }),
        data = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) setEntries([]);
        throw new Error(data.error?.message ?? "History unavailable.");
      }
      const view: WorkflowView = grantId ? data.workflow : data;
      setEntries((current) => {
        const seen = new Map([...view.entries, ...current].map((e) => [e.id, e]));
        return [...seen.values()];
      });
      setCursor(view.nextEntries);
    } catch (e) {
      if (!controller.current.signal.aborted)
        setError(e instanceof Error ? e.message : "History unavailable.");
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="job-panel">
      <h3>Progress and support history</h3>
      {cursor && (
        <button
          type="button"
          className="button button-outline"
          disabled={busy}
          onClick={() => void earlier()}
        >
          Load earlier work history
        </button>
      )}
      {!entries.length && <p>No updates are available.</p>}
      <ol className="job-record-list">
        {entries.map((e) => (
          <li key={e.id}>
            <strong>
              {e.kind.replaceAll("_", " ")} · {jobTime(e.at)}
            </strong>
            <p className="job-text">{e.body}</p>
            <Evidence assets={e.assets} grantId={grantId} />
          </li>
        ))}
      </ol>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

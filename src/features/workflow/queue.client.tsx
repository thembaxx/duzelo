"use client";
import { useState } from "react";
import type { AuditQueuePage } from "./types";
export function AuditQueue({
  initial,
  select,
}: {
  initial: AuditQueuePage;
  select: (kind: string, id: string) => void;
}) {
  const [items, setItems] = useState(initial.items),
    [cursor, setCursor] = useState(initial.nextCursor),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function earlier() {
    if (!cursor) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
          "/api/v1/collaboration/queue?cursor=" + encodeURIComponent(cursor),
          { cache: "no-store" },
        ),
        data = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) setItems([]);
        throw new Error(data.error?.message ?? "Queue unavailable.");
      }
      const page = data as AuditQueuePage;
      setItems((old) => [
        ...new Map([...old, ...page.items].map((r) => [r.kind + ":" + r.id, r])).values(),
      ]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="job-panel">
      <h2>Cases and safety reports</h2>
      <p>
        Queue references contain no private conversation text. Every evidence opening requires a
        reason and a current MFA session.
      </p>
      <ul className="job-record-list">
        {items.map((r) => (
          <li key={r.kind + ":" + r.id}>
            <button type="button" className="text-link" onClick={() => select(r.kind, r.id)}>
              {r.kind} #{r.id.slice(0, 8)} · {r.status.replaceAll("_", " ")}
            </button>
          </li>
        ))}
      </ul>
      {!items.length && <p>No queued items.</p>}
      {cursor && (
        <button
          type="button"
          className="button button-outline"
          disabled={busy}
          onClick={() => void earlier()}
        >
          Load earlier cases
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

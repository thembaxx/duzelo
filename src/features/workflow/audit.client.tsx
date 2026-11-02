"use client";
import { useEffect, useState } from "react";
import { useCollaboration } from "@/features/collaboration/client-api";
import { Evidence } from "@/features/collaboration/evidence.client";
import { WorkflowPanel } from "./panel";
import type { AuditView } from "./types";
export function AuditWorkspace({
  queue,
}: {
  queue: { id: string; kind: string; status: string; at: string }[];
}) {
  const api = useCollaboration(),
    [kind, setKind] = useState("dispute"),
    [id, setId] = useState(""),
    [reason, setReason] = useState(""),
    [view, setView] = useState<AuditView | null>(null),
    [note, setNote] = useState(""),
    [status, setStatus] = useState("investigating");
  useEffect(() => {
    if (!view) return;
    const clear = () => setView(null),
      timer = setTimeout(clear, Math.max(0, view.expiresAt - Date.now()));
    window.addEventListener("pagehide", clear);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", clear);
    };
  }, [view]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setView(null);
    try {
      const r = await api.run("audit", { kind, id, reason });
      const response = await fetch("/api/v1/collaboration/audit?id=" + r.grantId, {
          cache: "no-store",
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Audit access ended.");
      setView(data as AuditView);
    } catch (e) {
      if (e instanceof Error) api.setError(e.message);
    }
  }
  async function triage(e: React.FormEvent) {
    e.preventDefault();
    const d = view?.workflow?.dispute;
    if (!d) return;
    try {
      await api.run("triage", {
        disputeId: d.id,
        expectedVersion: d.version,
        status,
        note,
        reason,
        consent: true,
      });
      setView(null);
      setNote("");
    } catch {}
  }
  return (
    <>
      <section className="job-panel">
        <h2>Cases and safety reports</h2>
        <p>
          Queue references contain no private conversation text. Every evidence opening requires a
          reason and a current MFA session.
        </p>
        <ul className="job-record-list">
          {queue.map((r, i) => (
            <li key={r.id + ":" + i}>
              <button
                className="text-link"
                onClick={() => {
                  setKind(r.kind);
                  setId(r.id);
                  setView(null);
                }}
              >
                {r.kind} #{r.id.slice(0, 8)} · {r.status.replaceAll("_", " ")}
              </button>
            </li>
          ))}
        </ul>
        {!queue.length && <p>No queued items.</p>}
      </section>
      <form className="job-panel" onSubmit={(e) => void submit(e)}>
        <h2>Open an evidence audit</h2>
        <label>
          Record type
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="dispute">Service issue</option>
            <option value="booking">Work appointment</option>
            <option value="conversation">Job conversation</option>
          </select>
        </label>
        <label>
          Record reference
          <input required value={id} onChange={(e) => setId(e.target.value)} />
        </label>
        <label>
          Reason for access
          <textarea
            required
            minLength={10}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button className="button button-primary" disabled={api.busy}>
          Record reason and open audit
        </button>
      </form>
      {api.error && <p role="alert">{api.error}</p>}
      {view && (
        <section aria-label="Authorized evidence audit">
          <p className="job-notice">
            Audit access expires after five minutes. Access is checked again for each photo. Exact
            addresses, verification documents and bank records are excluded.
          </p>
          {view.workflow && <WorkflowPanel view={view.workflow} grantId={view.grantId} />}
          <section className="job-panel">
            <h2>Conversation evidence</h2>
            <ol className="job-record-list">
              {view.messages.map((m) => (
                <li key={m.id}>
                  <strong>Message #{m.sequence}</strong>
                  <p className="job-text">{m.body}</p>
                </li>
              ))}
            </ol>
            <Evidence assets={view.assets} grantId={view.grantId} />
            <h3>Safety reports</h3>
            {view.reports.map((r) => (
              <p className="job-text" key={r.id}>
                {r.status}: {r.reason}
              </p>
            ))}
          </section>
          {view.workflow?.dispute && (
            <form className="job-panel" onSubmit={(e) => void triage(e)}>
              <h3>Update support review</h3>
              <label>
                Review state
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="investigating">Investigating</option>
                  <option value="awaiting_evidence">Awaiting evidence</option>
                </select>
              </label>
              <label>
                Note shared with both parties
                <textarea
                  required
                  minLength={15}
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <p>
                Uses your recorded access reason. This does not resolve fault, refund or payment.
              </p>
              <button className="button button-secondary" disabled={api.busy}>
                Save support review update
              </button>
            </form>
          )}
        </section>
      )}
    </>
  );
}

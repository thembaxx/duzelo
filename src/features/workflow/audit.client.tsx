"use client";
import { useEffect, useRef, useState } from "react";
import { useCollaboration } from "@/features/collaboration/client-api";
import { Evidence } from "@/features/collaboration/evidence.client";
import { WorkflowPanel } from "./panel";
import { AuditQueue } from "./queue.client";
import type { AuditView, AuditQueuePage } from "./types";
export function AuditWorkspace({ queue }: { queue: AuditQueuePage }) {
  const api = useCollaboration(),
    [kind, setKind] = useState("dispute"),
    [id, setId] = useState(""),
    [reason, setReason] = useState(""),
    [view, setView] = useState<AuditView | null>(null),
    [note, setNote] = useState(""),
    [status, setStatus] = useState("investigating"),
    [triageReason, setTriageReason] = useState(""),
    [pending, setPending] = useState(false),
    latestRequest = useRef(0);
  useEffect(() => {
    if (!view) return;
    const clear = () => {
        latestRequest.current++;
        setPending(false);
        setView(null);
      },
      timer = setTimeout(clear, Math.max(0, view.expiresAt - Date.now()));
    window.addEventListener("pagehide", clear);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", clear);
    };
  }, [view]);
  function select(nextKind: string, nextId: string) {
    latestRequest.current++;
    setPending(false);
    setKind(nextKind);
    setId(nextId);
    setView(null);
    setNote("");
    setTriageReason("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const request = ++latestRequest.current;
    setPending(true);
    setView(null);
    try {
      const r = await api.run("audit", { kind, id, reason });
      const response = await fetch("/api/v1/collaboration/audit?id=" + r.grantId, {
          cache: "no-store",
        }),
        data = await response.json();
      if (request !== latestRequest.current) return;
      if (!response.ok) throw new Error(data.error?.message ?? "Audit access ended.");
      setView(data as AuditView);
    } catch (e) {
      if (e instanceof Error && request === latestRequest.current) api.setError(e.message);
    } finally {
      if (request === latestRequest.current) setPending(false);
    }
  }
  async function earlier(kind: "messages" | "reports") {
    if (!view) return;
    const request = latestRequest.current;
    setPending(true);
    try {
      const query =
        kind === "messages"
          ? "&before=" + view.next
          : "&reportCursor=" + encodeURIComponent(view.nextReports ?? "");
      const response = await fetch("/api/v1/collaboration/audit?id=" + view.grantId + query, {
          cache: "no-store",
        }),
        data = await response.json();
      if (request !== latestRequest.current) return;
      if (!response.ok) {
        setView(null);
        throw new Error(data.error?.message ?? "Audit access ended.");
      }
      setView((current) => {
        if (!current || current.grantId !== data.grantId) return current;
        const messages = new Map([...current.messages, ...data.messages].map((m) => [m.id, m])),
          assets = new Map([...current.assets, ...data.assets].map((a) => [a.id, a])),
          reports = new Map([...current.reports, ...data.reports].map((r) => [r.id, r]));
        return {
          ...current,
          workflow: data.workflow,
          expiresAt: data.expiresAt,
          messages: [...messages.values()].sort((a, b) => a.sequence - b.sequence),
          assets: [...assets.values()],
          reports: [...reports.values()],
          ...(kind === "messages"
            ? { hasMore: data.hasMore, next: data.next }
            : { nextReports: data.nextReports }),
        };
      });
    } catch (e) {
      if (request === latestRequest.current)
        api.setError(e instanceof Error ? e.message : "Earlier evidence unavailable.");
    } finally {
      if (request === latestRequest.current) setPending(false);
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
        reason: triageReason,
        consent: true,
      });
      setView(null);
      setNote("");
      setTriageReason("");
    } catch {}
  }
  return (
    <>
      <AuditQueue initial={queue} select={select} />
      <form className="job-panel" onSubmit={(e) => void submit(e)}>
        <h2>Open an evidence audit</h2>
        <label>
          Record type
          <select value={kind} onChange={(e) => select(e.target.value, id)}>
            <option value="dispute">Service issue</option>
            <option value="booking">Work appointment</option>
            <option value="conversation">Job conversation</option>
          </select>
        </label>
        <label>
          Record reference
          <input required value={id} onChange={(e) => select(kind, e.target.value)} />
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
        <button className="button button-primary" disabled={api.busy || pending}>
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
            {view.hasMore && (
              <button
                className="button button-outline"
                disabled={pending}
                onClick={() => void earlier("messages")}
              >
                Load earlier conversation evidence
              </button>
            )}
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
            {view.nextReports && (
              <button
                type="button"
                className="button button-outline"
                disabled={pending}
                onClick={() => void earlier("reports")}
              >
                Load earlier safety reports
              </button>
            )}
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
              <label>
                Reason for this review update
                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  value={triageReason}
                  onChange={(e) => setTriageReason(e.target.value)}
                />
              </label>
              <p>This does not resolve fault, refund or payment.</p>
              <button className="button button-outline" disabled={api.busy || pending}>
                Save support review update
              </button>
            </form>
          )}
        </section>
      )}
    </>
  );
}

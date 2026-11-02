"use client";
import { useState } from "react";
import { useCollaboration } from "@/features/collaboration/client-api";
import type { ThreadView } from "./types";
export function SafetyForm({
  thread: t,
  reload,
}: {
  thread: ThreadView;
  reload: () => Promise<void>;
}) {
  const api = useCollaboration(),
    [reason, setReason] = useState(""),
    [block, setBlock] = useState(true),
    [consent, setConsent] = useState(false),
    [notice, setNotice] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api.run("thread-report", {
        conversationId: t.id,
        reason,
        messageId: null,
        block,
        consent,
      });
      setNotice(String(r.message));
      await reload();
    } catch {}
  }
  async function unblock() {
    try {
      const r = await api.run("thread-unblock", { conversationId: t.id, consent: true });
      setNotice(String(r.message));
      await reload();
    } catch {}
  }
  return (
    <details className="job-panel">
      <summary>Report a concern or manage your block</summary>
      <p>
        Support can audit this job’s conversation for safety review. A report pauses messages. This
        is not an emergency service.
      </p>
      {t.ownBlocked && (
        <button
          className="button button-secondary"
          disabled={api.busy}
          onClick={() => void unblock()}
        >
          Remove my block
        </button>
      )}
      <form onSubmit={(e) => void submit(e)}>
        <label>
          What happened?
          <textarea
            required
            minLength={15}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label className="choice">
          <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} />
          Also block this participant
        </label>
        <label className="choice">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Save this concern for authorized support review.
        </label>
        <button className="button button-secondary" disabled={api.busy || !consent}>
          Submit safety report
        </button>
      </form>
      {api.error && <p role="alert">{api.error}</p>}
      {notice && <p role="status">{notice}</p>}
    </details>
  );
}

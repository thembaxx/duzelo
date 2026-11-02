"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCollaboration } from "@/features/collaboration/client-api";
import { EvidenceUpload } from "@/features/collaboration/evidence.client";
import type { UploadTarget } from "@/features/messages/schema";
import type { WorkflowView } from "./types";
export function WorkForm({
  view: b,
  action,
  title,
  field = "body",
  target,
}: {
  view: WorkflowView;
  action: string;
  title: string;
  field?: string;
  target?: UploadTarget;
}) {
  const api = useCollaboration(),
    router = useRouter(),
    [body, setBody] = useState(""),
    [consent, setConsent] = useState(false),
    [assets, setAssets] = useState<string[]>([]),
    [notice, setNotice] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const completion = b.completions.find((c) => c.status === "pending");
    const base =
      action === "case-respond"
        ? { disputeId: b.dispute!.id, expectedVersion: b.dispute!.version }
        : { bookingId: b.id, expectedVersion: b.version };
    const data = {
      ...base,
      consent,
      ...(field ? { [field]: body } : {}),
      ...(action === "work-complete" || action === "case-respond" ? { assetIds: assets } : {}),
      ...(action === "work-correction" || action === "work-confirm-completion"
        ? { completionId: completion?.id }
        : {}),
    };
    try {
      const r = await api.run(action, data);
      setNotice(String(r.message));
      setBody("");
      setAssets([]);
      router.refresh();
    } catch {}
  }
  return (
    <form className="job-panel" onSubmit={(e) => void submit(e)}>
      <h3>{title}</h3>
      {action === "case-respond" && (
        <p>Your explanation and photos are shared with authorized support only.</p>
      )}
      {field && (
        <label>
          {field === "summary"
            ? "Completion summary or explanation"
            : field === "reason"
              ? "Reason"
              : "Your explanation"}
          <textarea
            required
            minLength={action === "work-complete" ? 30 : 15}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
      )}
      {target && <EvidenceUpload target={target} value={assets} onChange={setAssets} />}
      <label className="choice">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        {action === "work-confirm-completion"
          ? "I explicitly confirm the submitted work is complete. This does not decide payment or waive dispute rights."
          : "Save this as my explicit report or request. This does not collect or release payment."}
      </label>
      <button className="button button-primary" disabled={api.busy || !consent}>
        {api.busy ? "Saving…" : title}
      </button>
      {api.error && (
        <p role="alert" className="form-error">
          {api.error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
export function ProgressForm({ view: b }: { view: WorkflowView }) {
  const api = useCollaboration(),
    router = useRouter(),
    [body, setBody] = useState(""),
    [kind, setKind] = useState("work_update");
  return (
    <form
      className="job-panel"
      onSubmit={(e) => {
        e.preventDefault();
        void api
          .run("work-progress", { bookingId: b.id, expectedVersion: b.version, kind, body })
          .then(() => {
            setBody("");
            router.refresh();
          })
          .catch(() => {});
      }}
    >
      <h3>Report progress</h3>
      <label>
        Update type
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="work_update">Work update</option>
          <option value="on_my_way">On my way</option>
          <option value="arrived">Arrived</option>
        </select>
      </label>
      <label>
        Your update
        <textarea
          required
          minLength={2}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <p>This is your report. No continuous location is collected.</p>
      <button className="button button-outline" disabled={api.busy}>
        Save progress update
      </button>
      {api.error && <p role="alert">{api.error}</p>}
    </form>
  );
}

"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/features/auth/button";
import { workerRequest, useWorkerReady } from "./client-api";
import type { Verification } from "./types";
export function DecisionForm({
  workerId,
  revision,
  verification,
}: {
  workerId: string;
  revision: number;
  verification: Verification;
}) {
  const ready = useWorkerReady(),
    [decision, setDecision] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await workerRequest("decision", {
        workerId,
        revision,
        verificationId: verification.id,
        decision,
        reason: String(form.get("reason")),
        expiryDate: String(form.get("expiryDate") ?? "") || null,
        confirmed: form.get("confirmed") === "on",
      });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The decision was not recorded.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form method="post" className="auth-form worker-form admin-decision-form" onSubmit={submit}>
      <label>
        Review decision
        <select required value={decision} onChange={(e) => setDecision(e.target.value)}>
          <option value="">Choose a decision</option>
          <option value="approved">Approve this claim</option>
          <option value="needs_changes">Request changes</option>
          <option value="rejected">Reject this claim</option>
        </select>
      </label>
      <label>
        Reason shared with the worker
        <textarea name="reason" required minLength={10} maxLength={500} />
      </label>
      <label>
        Credential expiry or next review date
        <input
          name="expiryDate"
          type="date"
          defaultValue={verification.expiry ?? ""}
          required={decision === "approved" && verification.kind === "trade"}
        />
      </label>
      <label className="choice">
        <input name="confirmed" type="checkbox" required />I have inspected the evidence and confirm
        this decision.
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!ready || busy}>
        {busy ? "Recording…" : "Record decision"}
      </Button>
    </form>
  );
}
export function PublishForm({ workerId, revision }: { workerId: string; revision: number }) {
  const ready = useWorkerReady(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await workerRequest("publish", {
        workerId,
        revision,
        publicContentReviewed: form.get("content") === "on",
        confirmed: form.get("confirmed") === "on",
      });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication did not complete.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form method="post" className="auth-form worker-form admin-decision-form" onSubmit={submit}>
      <h2>Publish reviewed content</h2>
      <p>
        Identity and any business review must be complete. Only categories with the required trade
        review can be published.
      </p>
      <label className="choice">
        <input name="content" type="checkbox" required />I have checked the public text and every
        public photo for private information.
      </label>
      <label className="choice">
        <input name="confirmed" type="checkbox" required />
        Publish only the eligible reviewed categories.
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!ready || busy}>
        {busy ? "Publishing…" : "Publish reviewed profile"}
      </Button>
    </form>
  );
}
export function PurgeForm({ workerId }: { workerId: string }) {
  const ready = useWorkerReady(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await workerRequest("purge-expired", { workerId, confirmed: true });
      setMessage(result.message ?? "Removal completed.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Removal did not complete.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form method="post" className="auth-form worker-form admin-decision-form" onSubmit={submit}>
      <h2>Expired private files</h2>
      <p>
        Remove files past their retention deadline and abandoned uploads older than one hour. The
        operation withdraws affected publication before deleting stored objects.
      </p>
      <label className="choice">
        <input type="checkbox" required />I confirm removal of expired files under the approved
        retention policy.
      </label>
      <Button type="submit" variant="outline" disabled={!ready || busy}>
        {busy ? "Removing…" : "Remove expired private files"}
      </Button>
      {message && <output aria-live="polite">{message}</output>}
    </form>
  );
}

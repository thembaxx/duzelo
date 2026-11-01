"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAgreementMutation } from "./client-api";
export function CloseRequest({ jobId, version }: { jobId: string; version: number }) {
  const mutation = useAgreementMutation(),
    router = useRouter(),
    [pending, startTransition] = useTransition(),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="job-panel">
      <h2>Close this request</h2>
      <p>
        End current offers and revoke any inspection permission. No provider is booked and no fee or
        refund is processed.
      </p>
      <label className="choice">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I
        choose to decline these offers and close this request.
      </label>
      <button
        type="button"
        className="button button-secondary"
        disabled={!consent || mutation.busy || pending}
        onClick={async () => {
          setMessage("");
          try {
            const result = await mutation.run("cancel-request", {
              jobId,
              expectedJobVersion: version,
              consent: true,
            });
            setMessage(String(result.message));
            startTransition(() => router.refresh());
          } catch {}
        }}
      >
        Decline offers and close request
      </button>
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

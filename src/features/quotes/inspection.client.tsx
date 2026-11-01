"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { jobTime, money } from "@/features/jobs/format";
import { useAgreementMutation } from "./client-api";
import type { GrantView } from "./types";
import { LocationReveal } from "@/features/bookings/location.client";
export function InspectionPanel({
  grant,
  worker,
  jobId,
}: {
  grant: GrantView;
  worker: boolean;
  jobId: string;
}) {
  const router = useRouter(),
    mutation = useAgreementMutation(),
    [pending, startTransition] = useTransition(),
    [message, setMessage] = useState("");
  return (
    <section className="job-panel" aria-label="Inspection permission">
      <h3>
        {grant.revoked
          ? "Inspection permission revoked"
          : grant.active
            ? "Site visit authorized"
            : "Inspection access expired"}
      </h3>
      <p>
        Visit: {jobTime(grant.visitStart)} — {jobTime(grant.visitEnd)}. Disclosed fee:{" "}
        {money(grant.feeCents)}.
      </p>
      <p>
        Exact access window: {jobTime(grant.accessFrom)} — {jobTime(grant.expires)}. This is not a
        work booking and no full work price is agreed.
      </p>
      {worker && grant.active && <LocationReveal jobId={jobId} />}
      {!worker && grant.active && (
        <button
          type="button"
          className="button button-secondary"
          disabled={mutation.busy || pending}
          onClick={async () => {
            setMessage("");
            try {
              const result = await mutation.run("revoke-inspection", { grantId: grant.id });
              setMessage(String(result.message));
              startTransition(() => router.refresh());
            } catch {}
          }}
        >
          Revoke inspection permission
        </button>
      )}
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

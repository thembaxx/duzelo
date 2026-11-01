"use client";
import { useRouter } from "next/navigation";
import { useJobMutation, useJobsReady } from "./client-api";
import type { JobOptions } from "./types";
export function StartJob({
  options,
  workerSlug,
  categoryId,
}: {
  options: JobOptions;
  workerSlug: string | null;
  categoryId: string | null;
}) {
  const router = useRouter(),
    mutation = useJobMutation(),
    ready = useJobsReady();
  return (
    <form
      method="post"
      className="job-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const result = await mutation.run<{ jobId: string }>("create", {
            workerSlug,
            categoryId,
          });
          router.push("/app/client/jobs/" + result.jobId);
        } catch {}
      }}
    >
      <h2>{workerSlug ? "Request this provider" : "Tell us what needs doing."}</h2>
      <p>
        {workerSlug
          ? "Only the selected provider can be invited. Their eligibility and coverage will be checked on submission."
          : "Your request starts as a private, recoverable draft. No worker is contacted until you review and submit it."}
      </p>
      {options.local && (
        <p className="test-notice">
          Isolated local testing. Test requests do not contact live workers or send SMS.
        </p>
      )}
      <p>
        Photos are optional. Exact location stays private; invited workers see the public town and
        the work details you choose to share.
      </p>
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      <button type="submit" className="button button-primary" disabled={!ready || mutation.busy}>
        {mutation.busy ? "Starting…" : "Start request"}
      </button>
    </form>
  );
}

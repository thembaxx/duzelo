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
      className="job-panel job-start-panel"
      aria-labelledby="start-job-title"
      aria-busy={mutation.busy}
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
      <h2 id="start-job-title">{workerSlug ? "Request this provider" : "Start a request"}</h2>
      <p>
        {workerSlug
          ? "Only this provider can be invited, after eligibility and coverage checks."
          : "Start with a private draft. Review your details before inviting workers."}
      </p>
      {options.local && (
        <p className="test-notice">
          Isolated local testing. Test requests do not contact live workers or send SMS.
        </p>
      )}
      <details className="job-privacy-details">
        <summary>Privacy and photos</summary>
        <p>
          Photos are optional. Your exact location stays private; invited workers can see the town
          and the job details you choose to share.
        </p>
      </details>
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      <div className="job-actions">
        <button type="submit" className="button button-primary" disabled={!ready || mutation.busy}>
          <span aria-live="polite">{mutation.busy ? "Starting…" : "Start request"}</span>
        </button>
        {!ready && !mutation.error && (
          <p className="job-help" role="status">
            Request setup isn’t ready yet.
          </p>
        )}
      </div>
    </form>
  );
}

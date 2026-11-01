"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJobMutation, useJobsReady } from "./client-api";
import { JobReview } from "./review";
import { jobTime } from "./format";
import type { OwnerJob, JobOptions } from "./types";
export function JobStatus({ job, options }: { job: OwnerJob; options: JobOptions }) {
  const router = useRouter(),
    mutation = useJobMutation(),
    ready = useJobsReady(),
    [message, setMessage] = useState("");
  const active = ["open", "matching"].includes(job.status);
  async function act(action: string, data: unknown) {
    setMessage("");
    try {
      const result = await mutation.run(action, data);
      setMessage(String(result.message ?? "Request updated."));
      router.refresh();
    } catch {}
  }
  return (
    <div className="job-status">
      {options.local && (
        <p className="test-notice">Isolated local test request. No live workers or SMS delivery.</p>
      )}
      <p className="eyebrow">
        Request #{job.id.slice(0, 8)} · {job.status}
      </p>
      <h2>
        {job.status === "cancelled"
          ? "Request cancelled"
          : job.status === "expired"
            ? "Request expired"
            : job.invited
              ? "Invitations created"
              : "No eligible workers found"}
      </h2>
      <p>
        {job.invited
          ? job.invited +
            " invitations have been created across " +
            job.waves +
            " wave(s). Their current status is listed below."
          : "No invitations were created for this request. Try a different service area or requested time in a new request."}
      </p>
      <p>
        No worker response, quote, booking or payment is guaranteed. We do not widen a direct
        request to other providers.
      </p>
      {job.approximate && (
        <p className="job-notice">
          Town-only matching is approximate. Coverage must be confirmed before agreeing an
          appointment.
        </p>
      )}
      {job.expires && <p>Invitation deadline: {jobTime(job.expires)}.</p>}
      {active && job.nextWave && (
        <div className="job-panel">
          <h3>Check the next invitation wave</h3>
          <p>
            The next wave can be sent after {jobTime(job.nextWave)} if no quote response has been
            received. Urgent waves wait twenty minutes; other waves wait four hours. At most three
            waves of five workers are allowed. Check this request to advance a due wave; closing
            this page does not schedule a background broadcast.
          </p>
          <button
            type="button"
            className="button button-secondary"
            disabled={!ready || mutation.busy}
            onClick={() => void act("dispatch", { jobId: job.id })}
          >
            Check next invitation wave
          </button>
        </div>
      )}
      {job.matches.length > 0 && (
        <section className="job-panel" aria-label="Invitation history">
          <h3>Invitation history</h3>
          <ul className="job-record-list">
            {job.matches.map((m) => (
              <li key={m.workerId}>
                <strong>{m.name}</strong>
                <p>
                  {m.status} · Invitation deadline {jobTime(m.expires)}
                </p>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={!ready || mutation.busy}
                  onClick={() =>
                    void act("client-block", {
                      jobId: job.id,
                      workerId: m.workerId,
                      blocked: !m.blocked,
                    })
                  }
                >
                  {m.blocked ? "Unblock" : "Block"} {m.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <details className="job-panel">
        <summary>Your saved request and private location</summary>
        <JobReview data={job.data} options={options} directWorker={job.directWorker} />
      </details>
      {active && (
        <div className="job-panel">
          <h3>Cancel this request</h3>
          <p>
            Cancellation ends current invitations and prevents later waves. It does not create a
            refund or affect a booking.
          </p>
          <button
            type="button"
            className="button button-secondary"
            disabled={!ready || mutation.busy}
            onClick={() => void act("cancel", { jobId: job.id })}
          >
            Cancel request
          </button>
        </div>
      )}
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <nav className="job-actions" aria-label="Request navigation">
        <a className="text-link" href={"/app/client/jobs/" + job.id}>
          Refresh request status
        </a>
        <Link className="text-link" href="/app/client/jobs">
          My requests
        </Link>
        <Link className="text-link" href="/app/client/jobs/new">
          Start another request
        </Link>
      </nav>
    </div>
  );
}

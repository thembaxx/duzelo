"use client";
import Link from "next/link";
import { loadOwnerJob, JobRequestError } from "./client-api";
import { useJobWizard } from "./use-job-wizard";
import type { JobOptions, OwnerJob } from "./types";
import { CategoryFields, DetailFields, TimingFields, BudgetFields } from "./fields.client";
import { JobLocationFields } from "./location.client";
import { JobPhotos } from "./photos.client";
import { JobReview } from "./review";
const steps = [
  "Service",
  "Work details and photos",
  "Requested times",
  "Optional budget",
  "Private location",
  "Review",
];
export function JobWizard({ initial, options }: { initial: OwnerJob; options: JobOptions }) {
  const {
    job,
    data,
    step,
    dirty,
    direction,
    message,
    consent,
    setConsent,
    submission,
    mutation,
    ready,
    heading,
    save,
    move,
    submit,
    update,
    setJob,
    setPhotoBusy,
    locked,
    busy,
  } = useJobWizard(initial);
  const fieldProps = { data, update, options };
  return (
    <div className="job-wizard">
      {options.local && (
        <p className="test-notice">
          Isolated local test request. This does not contact real providers or send SMS.
        </p>
      )}
      <p className="eyebrow">Request #{job.id.slice(0, 8)} · Private draft</p>
      <ol className="job-step-list" aria-label="Request steps">
        {steps.map((name, i) => (
          <li key={name} aria-current={step === i ? "step" : undefined}>
            <span aria-hidden="true">{i + 1}</span>
            {name}
          </li>
        ))}
      </ol>
      <p role="status">
        {dirty
          ? "Unsaved changes. Save before leaving."
          : message || "Your saved draft can be recovered from My requests."}
      </p>
      <fieldset disabled={locked} className="job-panel">
        <legend className="sr-only">Request draft fields</legend>
        <div key={step} data-direction={direction} className="job-step">
          <h2 ref={heading} tabIndex={-1}>
            Step {step + 1}: {steps[step]}
          </h2>
          {step === 0 && <CategoryFields {...fieldProps} />}
          {step === 1 && (
            <>
              <DetailFields {...fieldProps} />
              <JobPhotos
                jobId={job.id}
                assets={job.assets}
                onBusyChange={setPhotoBusy}
                onRefresh={async () => {
                  const fresh = await loadOwnerJob(job.id);
                  setJob((current) => ({ ...current, assets: fresh.assets }));
                }}
              />
            </>
          )}
          {step === 2 && <TimingFields {...fieldProps} />}
          {step === 3 && <BudgetFields {...fieldProps} />}
          {step === 4 && <JobLocationFields {...fieldProps} />}
          {step === 5 && (
            <JobReview data={data} options={options} directWorker={job.directWorker} />
          )}
        </div>
        <div className="job-actions">
          {step > 0 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void move(step - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="button button-secondary"
            disabled={!ready}
            onClick={async () => {
              try {
                await save();
              } catch (e) {
                if (!(e instanceof JobRequestError)) mutation.setError("Check the draft fields.");
              }
            }}
          >
            Save draft
          </button>
          {step < 5 && (
            <button
              type="button"
              className="button button-primary"
              disabled={!ready}
              onClick={() => void move(step + 1)}
            >
              Save and continue
            </button>
          )}
        </div>
      </fieldset>
      {step === 5 && (
        <div className="job-panel">
          <label className="choice">
            <input
              type="checkbox"
              checked={consent}
              disabled={locked}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I choose to submit this request and send the bounded invitations described above.
          </label>
          <button
            type="button"
            className="button button-primary"
            disabled={!ready || busy || !consent}
            onClick={() => void submit()}
          >
            {busy
              ? submission
                ? "Submitting…"
                : "Saving…"
              : submission
                ? "Retry the same submission"
                : "Submit request"}
          </button>
          {submission && (
            <p>
              Submission may already have completed. Retry uses the same request key; reloading
              shows the saved server state.
            </p>
          )}
        </div>
      )}
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      <nav className="job-actions" aria-label="Saved request navigation">
        <a href={"/app/client/jobs/" + job.id} className="text-link">
          Reload saved request
        </a>
        <Link href="/app/client/jobs" className="text-link">
          My requests
        </Link>
      </nav>
    </div>
  );
}

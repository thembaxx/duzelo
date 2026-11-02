import { WorkHistory } from "./history.client";
import { Evidence } from "@/features/collaboration/evidence.client";
import { money, jobTime } from "@/features/jobs/format";
import type { WorkflowView } from "./types";
import { WorkForm, ProgressForm } from "./forms.client";
import { ProposalPanel } from "./proposals.client";
export function WorkflowPanel({ view: b, grantId }: { view: WorkflowView; grantId?: string }) {
  const pending = b.proposals.some((p) => p.status === "proposed");
  return (
    <section className="work-panel" aria-label="Work progress and resolution">
      <header className="job-panel">
        <p className="eyebrow">Work record · version {b.version}</p>
        <h2>Keep each step clear.</h2>
        <p>Status: {b.status.replaceAll("_", " ")}</p>
        <dl className="quote-totals">
          <dt>Original accepted quote</dt>
          <dd>{money(b.baseCents)}</dd>
          <dt>Current agreed total</dt>
          <dd>
            <strong>{money(b.totalCents)}</strong>
          </dd>
          <dt>Current agreed appointment</dt>
          <dd>
            {jobTime(b.start)} — {jobTime(b.end)}
          </dd>
        </dl>
        <p>
          Only accepted adjustments change the agreed total. No payment is collected or released
          here.
        </p>
      </header>
      {!grantId && (
        <>
          <ProposalPanel view={b} />
          {!b.client && b.canChange && <ProgressForm view={b} />}{" "}
          {!pending && b.canStart && (
            <WorkForm view={b} action="work-start" title="Record work started" field="" />
          )}
          {!pending && b.canComplete && (
            <WorkForm
              view={b}
              action="work-complete"
              title="Submit completion for review"
              field="summary"
              target={{ purpose: "completion", bookingId: b.id }}
            />
          )}
        </>
      )}
      <section className="job-panel">
        <h3>Completion evidence</h3>
        <p>
          A review reminder never means acceptance, automatic payment, or loss of dispute rights.
        </p>
        {!b.completions.length && <p>No completion evidence is available.</p>}
        {b.completions.map((c) => (
          <article key={c.id}>
            <h4>
              Submission {c.round} · {c.status.replaceAll("_", " ")}
            </h4>
            <p className="job-text">{c.summary}</p>
            <p>
              Review reminder: {jobTime(c.reviewDue)}
              {c.supportDue ? " · Support review due" : ""}
            </p>
            <Evidence assets={c.assets} grantId={grantId} />
          </article>
        ))}
      </section>
      {!grantId && b.canConfirm && (
        <>
          <WorkForm
            view={b}
            action="work-confirm-completion"
            title="Confirm work complete"
            field=""
          />
          <WorkForm view={b} action="work-correction" title="Request a correction" field="reason" />
        </>
      )}
      <WorkHistory
        key={b.id + ":" + b.version + ":" + (grantId ?? "party")}
        initial={b.entries}
        next={b.nextEntries}
        bookingId={b.id}
        grantId={grantId}
      />
      {b.dispute && (
        <section className="job-panel">
          <h3>Service issue · {b.dispute.status.replaceAll("_", " ")}</h3>
          {b.dispute.reason && <p className="job-text">{b.dispute.reason}</p>}
          <p>
            Completion is paused for support. Your private responses are visible to authorized
            support; shared support notes appear above. No finding of fault or financial resolution
            has been made.
          </p>
          {!grantId &&
            ["open", "investigating", "awaiting_evidence"].includes(b.dispute.status) && (
              <WorkForm
                view={b}
                action="case-respond"
                title="Send private case evidence"
                target={{ purpose: "case", disputeId: b.dispute.id }}
              />
            )}
        </section>
      )}
      {!grantId && b.canDispute && (
        <details className="job-panel">
          <summary>Raise a service issue</summary>
          <WorkForm
            view={b}
            action="case-open"
            title="Open service issue for support"
            field="reason"
          />
        </details>
      )}
    </section>
  );
}

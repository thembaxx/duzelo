"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QuoteCard } from "@/features/quotes/card";
import type { BookingView } from "@/features/quotes/types";
import { useAgreementMutation } from "@/features/quotes/client-api";
import { jobTime } from "@/features/jobs/format";
import { LocationReveal } from "./location.client";
import { appointmentStatus } from "./status";
export function BookingDetail({ booking: b }: { booking: BookingView }) {
  const router = useRouter(),
    mutation = useAgreementMutation(),
    [pending, startTransition] = useTransition(),
    [reason, setReason] = useState("plans_changed"),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState("");
  async function act(action: string) {
    setMessage("");
    try {
      const result = await mutation.run(
        "booking-" + action,
        { bookingId: b.id, expectedVersion: b.version, ...(action === "cancel" ? { reason } : {}) },
        b.worker,
      );
      setMessage(String(result.message));
      startTransition(() => router.refresh());
    } catch {}
  }
  const busy = mutation.busy || pending;
  return (
    <div className="booking-detail">
      <section className="job-panel">
        <p className="eyebrow">
          Appointment #{b.id.slice(0, 8)} · Version {b.version}
        </p>
        <h2>Appointment status: {appointmentStatus(b.status)}</h2>
        <p>
          {b.provider} · {b.town}
        </p>
        <p>
          {jobTime(b.startsAt)} — {jobTime(b.endsAt)}
        </p>
        <p>
          {b.status === "pending_worker"
            ? "The worker has not confirmed. Exact address access is withheld."
            : b.status === "confirmed"
              ? "The selected worker confirmed this appointment. Payment and work completion are separate."
              : "This appointment is closed. No new provider is invited automatically."}
        </p>
        {b.status === "pending_worker" && Date.parse(b.startsAt) <= Date.now() && (
          <p className="job-notice">
            The proposed start has passed. Confirmation is unavailable; decline or cancel this
            appointment and agree to a new request.
          </p>
        )}
        {b.conflict && b.status === "pending_worker" && (
          <p className="job-notice">
            A private schedule conflict currently prevents confirmation. Do not travel without
            confirmation.
          </p>
        )}
        {!b.eligible && b.status === "pending_worker" && (
          <p className="job-notice">
            Current worker approval, availability or coverage no longer permits confirmation.
          </p>
        )}
        {b.worker && b.status === "pending_worker" && (
          <div className="job-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={busy || !b.canConfirm}
              onClick={() => void act("confirm")}
            >
              Confirm appointment
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() => void act("decline")}
            >
              Decline booking request
            </button>
          </div>
        )}
      </section>
      <QuoteCard quote={b.quote} jobVersion={0} worker={b.worker} actions={false} />
      {b.worker && b.status === "confirmed" && <LocationReveal jobId={b.jobId} />}
      {b.canCancel && (
        <section className="job-panel">
          <h2>Cancel this appointment</h2>
          <p>
            Cancellation ends this request. No fee, refund, penalty or finding of fault is created.
            A no-show is your report and is available thirty minutes after the proposed start.
          </p>
          <label>
            Cancellation reason
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="plans_changed">Plans changed</option>
              <option value="provider_unavailable">Provider unavailable</option>
              <option value="client_unavailable">Client unavailable</option>
              <option value="no_show" disabled={!b.noShowAvailable}>
                Report a no-show
              </option>
            </select>
          </label>
          <label className="choice">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I choose to close this appointment and understand that this does not decide fault or
            payment.
          </label>
          <button
            type="button"
            className="button button-secondary"
            disabled={busy || !consent || (reason === "no_show" && !b.noShowAvailable)}
            onClick={() => void act("cancel")}
          >
            Cancel appointment
          </button>
        </section>
      )}
      <section className="job-panel">
        <h2>Appointment history</h2>
        <ol className="job-record-list">
          {b.events.map((e) => (
            <li key={e.id}>
              <strong>{e.type.replaceAll("_", " ")}</strong>
              <p>
                {e.from ? appointmentStatus(e.from) : "New request"} →{" "}
                {e.to ? appointmentStatus(e.to) : "Status unavailable"} · {jobTime(e.at)}
              </p>
              {e.reason && (
                <p>
                  Participant-reported reason: {e.reason.replaceAll("_", " ")}. No payment action.
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <p>Payments, conversations, starting work and completion are not open in this milestone.</p>
      <nav className="job-actions" aria-label="Booking navigation">
        <Link className="text-link" href={"/app/" + (b.worker ? "worker" : "client") + "/bookings"}>
          All appointments
        </Link>
        <Link
          className="text-link"
          href={
            b.worker
              ? "/app/worker/quotes?job=" + b.jobId
              : "/app/client/jobs/" + b.jobId + "/quotes"
          }
        >
          Quote versions
        </Link>
        {!b.worker && !b.canCancel && (
          <Link className="text-link" href="/app/client/jobs/new">
            Start a new request
          </Link>
        )}
        <a
          className="text-link"
          href={"/app/" + (b.worker ? "worker" : "client") + "/bookings/" + b.id}
        >
          Refresh appointment
        </a>
      </nav>
    </div>
  );
}

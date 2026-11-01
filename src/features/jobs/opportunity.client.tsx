"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Opportunity } from "./types";
import { useJobMutation, useJobsReady } from "./client-api";
import { money, jobTime } from "./format";
export function OpportunityDetail({ opportunity: o }: { opportunity: Opportunity }) {
  const router = useRouter(),
    mutation = useJobMutation(),
    ready = useJobsReady(),
    [message, setMessage] = useState("");
  async function act(action: string) {
    try {
      const result = await mutation.run(action, {
        matchId: o.matchId,
        ...(action === "worker-block" ? { blocked: true } : {}),
      });
      setMessage(String(result.message ?? "Opportunity updated."));
      if (action !== "view") router.push("/app/worker/opportunities");
      else router.refresh();
    } catch {}
  }
  return (
    <article className="job-panel">
      <p className="eyebrow">
        {o.category} · {o.town} · Approximate public area
      </p>
      <h2>{o.title}</h2>
      <p className="job-text">{o.description}</p>
      <p>
        <strong>Eligibility:</strong> {o.rationale}. Eligibility is checked again whenever you open
        this preview.
      </p>
      {o.approximate && (
        <p className="job-notice">Town-only match. Exact service coverage is not confirmed.</p>
      )}
      <dl>
        <dt>Urgency</dt>
        <dd>{o.urgency}</dd>
        <dt>Invitation expiry</dt>
        <dd>{jobTime(o.expires)}</dd>
        <dt>Requested windows</dt>
        <dd>
          {o.slots.length ? (
            <ul>
              {o.slots.map((s, i) => (
                <li key={i}>
                  {jobTime(s.start)} — {jobTime(s.end)}
                </li>
              ))}
            </ul>
          ) : (
            "Flexible; appointment not agreed"
          )}
        </dd>
        <dt>Client response availability</dt>
        <dd>{o.contactWindow || "Not specified"}</dd>
        <dt>Approximate budget</dt>
        <dd>
          {money(o.budgetMin)} — {money(o.budgetMax)}. No agreed amount or payment.
        </dd>
      </dl>
      <p className="job-notice">
        The exact job point, street and access instructions are withheld. An invitation is not a
        booking or permission to visit. Exact location requires a confirmed booking or a separately
        approved, logged inspection.
      </p>
      {o.media.length > 0 && (
        <section>
          <h3>Request photos</h3>
          <p>
            The client chose to share these work photos. Embedded location metadata has been
            removed.
          </p>
          <div className="job-photo-list">
            {o.media.map((id, i) => (
              <Image
                key={id}
                unoptimized
                src={"/api/v1/jobs/media/" + id}
                width={320}
                height={220}
                alt={"Client request photo " + (i + 1)}
              />
            ))}
          </div>
        </section>
      )}
      <p>Quotes and bookings are not open yet. Reviewing a request does not accept work.</p>
      <div className="job-actions">
        {o.status === "invited" && (
          <button
            type="button"
            className="button button-primary"
            disabled={!ready || mutation.busy}
            onClick={() => void act("view")}
          >
            Mark as reviewed
          </button>
        )}
        <button
          type="button"
          className="button button-secondary"
          disabled={!ready || mutation.busy}
          onClick={() => void act("decline")}
        >
          Decline invitation
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={!ready || mutation.busy}
          onClick={() => void act("worker-block")}
        >
          Block requests from this client
        </button>
      </div>
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <Link className="text-link" href="/app/worker/opportunities">
        Back to opportunities
      </Link>
    </article>
  );
}

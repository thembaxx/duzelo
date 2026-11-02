"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCollaboration } from "@/features/collaboration/client-api";
import { money, jobTime } from "@/features/jobs/format";
import type { WorkflowView } from "./types";
export function ProposalPanel({ view: b }: { view: WorkflowView }) {
  const api = useCollaboration(),
    router = useRouter(),
    [kind, setKind] = useState("scope"),
    [scope, setScope] = useState(""),
    [delta, setDelta] = useState("0"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [expiry, setExpiry] = useState(""),
    [consent, setConsent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.run("proposal-" + kind, {
        bookingId: b.id,
        expectedVersion: b.version,
        consent,
        expiresAt: new Date(expiry).toISOString(),
        ...(kind === "scope"
          ? { scope, deltaCents: Number(delta) }
          : { startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() }),
      });
      router.refresh();
    } catch (e) {
      if (e instanceof RangeError) api.setError("Supply valid appointment and expiry times.");
    }
  }
  async function decide(p: WorkflowView["proposals"][number], decision: string) {
    try {
      await api.run("proposal-decide", {
        bookingId: b.id,
        expectedVersion: b.version,
        proposalId: p.id,
        kind: p.kind,
        decision,
        consent: true,
      });
      router.refresh();
    } catch {}
  }
  const pending = b.proposals.some((p) => p.status === "proposed");
  return (
    <section className="job-panel">
      <h3>Proposed changes</h3>
      <p>
        The current appointment and price stay in place until both parties agree. Rejecting a
        proposal keeps the prior agreement.
      </p>
      <ul className="job-record-list">
        {b.proposals.map((p) => (
          <li key={p.id}>
            <strong>
              {p.kind === "scope" ? "Scope and price" : "Appointment time"} · {p.status}
            </strong>
            <p className="job-text">{p.description}</p>
            {p.kind === "scope" && <p>Adjustment: {money(p.deltaCents)}</p>}
            <p>Expires {jobTime(p.expiresAt)}</p>
            {p.status === "proposed" && (
              <div className="job-actions">
                {p.canAccept && (
                  <button
                    className="button button-primary"
                    disabled={api.busy}
                    onClick={() => void decide(p, "accept")}
                  >
                    Accept proposed change
                  </button>
                )}
                <button
                  className="button button-outline"
                  disabled={api.busy}
                  onClick={() => void decide(p, p.own ? "withdraw" : "reject")}
                >
                  {p.own ? "Withdraw proposal" : "Reject proposal"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!pending && b.canChange && (
        <form onSubmit={(e) => void submit(e)}>
          <label>
            Change type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="scope">Scope and price</option>
              <option value="reschedule">Appointment time</option>
            </select>
          </label>
          {kind === "scope" ? (
            <>
              <label>
                Exact scope change
                <textarea
                  required
                  minLength={15}
                  maxLength={2000}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                />
              </label>
              <label>
                Price adjustment in cents (negative reduces total)
                <input
                  type="number"
                  step="1"
                  min={-100000000}
                  max={100000000}
                  required
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                New start (your device time)
                <input
                  type="datetime-local"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                New end (your device time)
                <input
                  type="datetime-local"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </>
          )}
          <label>
            Proposal expires (your device time)
            <input
              type="datetime-local"
              required
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
          <label className="choice">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I propose these terms for the other party’s explicit agreement.
          </label>
          <button className="button button-outline" disabled={api.busy || !consent}>
            Send change proposal
          </button>
        </form>
      )}
      {api.error && <p role="alert">{api.error}</p>}
    </section>
  );
}

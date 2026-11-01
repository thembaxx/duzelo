"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJobMutation, useJobsReady } from "./client-api";
import { jobTime, fromSastInput } from "./format";
export interface MatchPreferences {
  urgentReady: boolean;
  dailyLimit: number;
  blocks: { id: string; start: string; end: string }[];
  blockedClients: { matchId: string; reference: string }[];
}
export function MatchPreferencesForm({ initial }: { initial: MatchPreferences }) {
  const router = useRouter(),
    mutation = useJobMutation(),
    ready = useJobsReady(),
    [message, setMessage] = useState("");
  async function run(action: string, data: unknown) {
    setMessage("");
    try {
      await mutation.run(action, data);
      setMessage("Preferences saved.");
      router.refresh();
    } catch {}
  }
  return (
    <details className="job-panel">
      <summary>Opportunity preferences, time blocks and blocked clients</summary>
      <form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          void run("preferences", {
            urgentReady: form.get("urgent") === "on",
            dailyLimit: Number(form.get("dailyLimit")),
          });
        }}
      >
        <p>
          Manual approval, current category credentials and profile availability are still required.
          These preferences do not grant verification.
        </p>
        <label className="choice">
          <input name="urgent" type="checkbox" defaultChecked={initial.urgentReady} />I explicitly
          accept urgent requests.
        </label>
        <label>
          Maximum invitations per day
          <select name="dailyLimit" defaultValue={initial.dailyLimit}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p>
          There is also a hard limit of three new invitations per hour. Urgent availability remains
          selected until you turn it off.
        </p>
        <button
          type="submit"
          className="button button-secondary"
          disabled={!ready || mutation.busy}
        >
          Save opportunity preferences
        </button>
      </form>
      <h3>Times you cannot work</h3>
      <p>
        South African Standard Time. Blocks are private and prevent invitations for overlapping
        requested windows.
      </p>
      <ul className="job-record-list">
        {initial.blocks.map((b) => (
          <li key={b.id}>
            {jobTime(b.start)} — {jobTime(b.end)}{" "}
            <button
              type="button"
              className="text-link"
              disabled={mutation.busy}
              onClick={() => void run("remove-time-block", { id: b.id })}
            >
              Remove time block
            </button>
          </li>
        ))}
      </ul>
      <form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          try {
            void run("time-block", {
              start: fromSastInput(String(form.get("start"))),
              end: fromSastInput(String(form.get("end"))),
            });
          } catch {
            mutation.setError("Choose valid start and end times.");
          }
        }}
      >
        <div className="job-two-columns">
          <label>
            Unavailable from
            <input name="start" type="datetime-local" required />
          </label>
          <label>
            Unavailable until
            <input name="end" type="datetime-local" required />
          </label>
        </div>
        <button
          type="submit"
          className="button button-secondary"
          disabled={!ready || mutation.busy}
        >
          Add private time block
        </button>
      </form>
      <h3>Blocked clients</h3>
      {initial.blockedClients.length ? (
        <ul className="job-record-list">
          {initial.blockedClients.map((b) => (
            <li key={b.matchId}>
              Client from request #{b.reference}{" "}
              <button
                type="button"
                className="text-link"
                disabled={mutation.busy}
                onClick={() => void run("worker-block", { matchId: b.matchId, blocked: false })}
              >
                Unblock this client
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No clients are blocked.</p>
      )}
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}

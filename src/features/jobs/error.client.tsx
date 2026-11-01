"use client";
export function JobsError({ reset }: { reset: () => void }) {
  return (
    <section className="job-panel">
      <h2>This request could not be loaded.</h2>
      <p role="alert">Reconnect and retry to check the current saved server state.</p>
      <button type="button" className="button button-secondary" onClick={reset}>
        Try loading again
      </button>
    </section>
  );
}

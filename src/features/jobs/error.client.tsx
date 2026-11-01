"use client";
export function JobsError({ reset }: { reset: () => void }) {
  return (
    <section className="job-panel">
      <h2>This request could not be loaded.</h2>
      <p role="alert">
        Your saved server data has not been replaced. Check your connection and try again.
      </p>
      <button type="button" className="button button-secondary" onClick={reset}>
        Try loading again
      </button>
    </section>
  );
}

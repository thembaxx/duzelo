"use client";
export function AgreementError({ reset }: { reset: () => void }) {
  return (
    <section className="job-panel">
      <h2>This agreement could not be loaded.</h2>
      <p role="alert">
        Reconnect or sign in again, then reload the saved status. No action is confirmed by this
        error.
      </p>
      <button type="button" className="button button-secondary" onClick={reset}>
        Try loading again
      </button>
    </section>
  );
}

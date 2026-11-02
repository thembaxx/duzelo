"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty-panel">
      <h1>Conversation unavailable.</h1>
      <p>Your saved history has not changed.</p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}

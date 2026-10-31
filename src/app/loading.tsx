/** Dimensionally stable skeleton: never fake a percentage or completion. */
export default function Loading() {
  return (
    <section className="shell inner-page loading-shell" aria-label="Loading page" role="status" aria-busy="true">
      <span className="sr-only">Loading Duzelo. Please wait.</span>
      <div className="skeleton-line skeleton-eyebrow" aria-hidden="true"/>
      <div className="skeleton-line skeleton-heading" aria-hidden="true"/>
      <div className="skeleton-line skeleton-heading shorter" aria-hidden="true"/>
      <div className="skeleton-line skeleton-description" aria-hidden="true"/>
      <div className="skeleton-grid" aria-hidden="true">
        <div className="skeleton-box"/><div className="skeleton-box"/><div className="skeleton-box"/>
      </div>
    </section>
  );
}

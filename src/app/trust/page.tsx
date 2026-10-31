import type { Metadata } from "next";
export const metadata: Metadata = { title: "Trust and safety" };

export default function TrustPage() {
  return (
    <section className="shell inner-page">
      <p className="eyebrow">TRUST IS EARNED</p>
      <h1 className="inner-heading">
        Safety isn't an <em>afterthought.</em>
      </h1>
      <p className="inner-lede">
        Duzelo is still being built. These are the guardrails we intend to enforce before connecting
        customers and workers—not claims that anyone has already been verified.
      </p>
      <div className="trust-grid">
        <article className="detail-panel">
          <span className="trust-index">01 /</span>
          <h2>Manual review first</h2>
          <p>
            Workers won't receive a verified badge without an actual administrator review, including
            category-specific qualifications when needed.
          </p>
        </article>
        <article className="detail-panel">
          <span className="trust-index">02 /</span>
          <h2>Location stays private</h2>
          <p>
            Public listings will use approximate places. Personal addresses and exact worker bases
            won't appear in public results.
          </p>
        </article>
        <article className="detail-panel">
          <span className="trust-index">03 /</span>
          <h2>Clear commitments</h2>
          <p>
            Quotes, bookings and payment statuses must be backed by real records. No invented
            ratings, promises or escrow claims.
          </p>
        </article>
        <article className="detail-panel">
          <span className="trust-index">04 /</span>
          <h2>Support when it counts</h2>
          <p>
            Reporting, disputes and administrative audit trails are part of the planned release,
            with strict access permissions.
          </p>
        </article>
      </div>
      <p className="trust-note">
        If you are facing an immediate emergency or dangerous electrical situation, contact your
        local emergency services or a qualified emergency provider directly; Duzelo is not an
        emergency service.
      </p>
    </section>
  );
}

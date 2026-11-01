import { money, jobTime } from "@/features/jobs/format";
import type { QuoteView } from "./types";
import { QuoteActions } from "./actions.client";
export function QuoteCard({
  quote: q,
  jobVersion,
  worker,
  actions = true,
}: {
  quote: QuoteView;
  jobVersion: number;
  worker: boolean;
  actions?: boolean;
}) {
  return (
    <article
      className="job-panel quote-card"
      aria-label={"Quote version " + q.version + " from " + q.workerName}
    >
      <p className="eyebrow">
        {q.workerName} · Version {q.version} · {q.status}
      </p>
      <h3>
        {q.terms.pricingType === "inspection_required"
          ? "Inspect before pricing"
          : q.terms.pricingType === "estimate"
            ? "Estimated work price"
            : "Fixed work price"}
      </h3>
      <p className="quote-amount">
        {q.totalCents === null ? "Work price not agreed" : money(q.totalCents)}
      </p>
      {q.terms.pricingType === "estimate" && (
        <p>This is an estimate. A later scope or price change needs separate agreement.</p>
      )}
      <p className="job-text">
        <strong>Scope:</strong> {q.terms.scope}
      </p>
      <p className="job-text">
        <strong>Exclusions:</strong> {q.terms.exclusions || "None supplied"}
      </p>
      {!!q.terms.items.length && (
        <ul className="quote-lines" aria-label="Line items">
          {q.terms.items.map((i, n) => (
            <li key={n}>
              <div>
                <strong>{i.description}</strong>
                <small>
                  {i.kind} · {i.quantityHundredths / 100} × {money(i.unitPriceCents)}
                </small>
              </div>
              <span>{money(Math.round((i.quantityHundredths * i.unitPriceCents) / 100))}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="quote-totals">
        {q.totalCents !== null ? (
          <>
            <dt>Labor/materials subtotal</dt>
            <dd>{money(q.subtotalCents)}</dd>
            <dt>Travel fee</dt>
            <dd>{money(q.terms.travelFeeCents)}</dd>
            <dt>
              {q.terms.taxMode === "vat_15_inclusive"
                ? "Included VAT declaration (15%)"
                : q.terms.taxMode === "vat_15_exclusive"
                  ? "Added VAT declaration (15%)"
                  : "VAT not charged"}
            </dt>
            <dd>{money(q.taxCents)}</dd>
            <dt>Total {q.terms.pricingType === "estimate" ? "estimate" : "quote"}</dt>
            <dd>
              <strong>{money(q.totalCents)}</strong>
            </dd>
          </>
        ) : (
          <>
            <dt>Inspection visit fee</dt>
            <dd>{money(q.terms.inspectionFeeCents)}</dd>
            <dt>Full work price</dt>
            <dd>Requires a later priced quote and your separate acceptance.</dd>
          </>
        )}
        <dt>Proposed time</dt>
        <dd>
          {jobTime(q.terms.startsAt)} — {jobTime(q.terms.endsAt)}
        </dd>
        <dt>Offer valid until</dt>
        <dd>{jobTime(q.terms.validUntil)}</dd>
      </dl>
      <p className="quote-small">
        Tax treatment is the provider’s declaration, not verified VAT registration or a tax invoice.
        This quote does not confirm a payment.
      </p>
      {actions && <QuoteActions quote={q} jobVersion={jobVersion} worker={worker} />}
    </article>
  );
}

"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAgreementMutation } from "./client-api";
import type { QuoteView } from "./types";
export function QuoteActions({
  quote,
  jobVersion,
  worker,
}: {
  quote: QuoteView;
  jobVersion: number;
  worker: boolean;
}) {
  const router = useRouter(),
    mutation = useAgreementMutation(),
    [pending, startTransition] = useTransition(),
    [message, setMessage] = useState(""),
    [consent, setConsent] = useState(false),
    [addressConsent, setAddressConsent] = useState(false),
    [feeConsent, setFeeConsent] = useState(false);
  const busy = mutation.busy || pending,
    inspection = quote.terms.pricingType === "inspection_required";
  async function act(action: string) {
    setMessage("");
    try {
      const result = await mutation.run(action, {
        quoteId: quote.id,
        expectedVersion: quote.version,
        ...(!worker
          ? {
              expectedJobVersion: jobVersion,
              consent: true,
              ...(inspection ? { addressConsent: true, feeConsent: true } : {}),
            }
          : {}),
      });
      setMessage(String(result.message));
      startTransition(() => {
        if (result.bookingId) router.push("/app/client/bookings/" + result.bookingId);
        else router.refresh();
      });
    } catch {}
  }
  return (
    <div className="quote-actions">
      {worker && quote.canPublish && (
        <button
          type="button"
          className="button button-primary"
          disabled={busy}
          onClick={() => void act("publish")}
        >
          Send quote version {quote.version}
        </button>
      )}
      {worker && quote.canWithdraw && (
        <button
          type="button"
          className="button button-secondary"
          disabled={busy}
          onClick={() => void act("withdraw")}
        >
          Withdraw version {quote.version}
        </button>
      )}
      {!worker && quote.canChoose && (
        <fieldset disabled={busy}>
          <legend>{inspection ? "Authorize this site visit" : "Request this appointment"}</legend>
          <label className="choice">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {inspection
              ? "I choose this inspection proposal; a later priced quote needs my separate agreement."
              : "I have read this quote version, scope, exclusions, tax declaration and proposed time. The worker must still confirm."}
          </label>
          {inspection && (
            <>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={addressConsent}
                  onChange={(e) => setAddressConsent(e.target.checked)}
                />
                I authorize exact-location access from one hour before the visit until its end. I
                can revoke it.
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={feeConsent}
                  onChange={(e) => setFeeConsent(e.target.checked)}
                />
                I agree to the disclosed inspection fee. No payment is collected by Duzelo.
              </label>
            </>
          )}
          <button
            type="button"
            className="button button-primary"
            disabled={!consent || (inspection && (!addressConsent || !feeConsent))}
            onClick={() => void act(inspection ? "authorize-inspection" : "accept")}
          >
            {inspection ? "Authorize inspection only" : "Choose quote and request booking"}
          </button>
        </fieldset>
      )}
      {mutation.error && (
        <p className="form-error" role="alert">
          {mutation.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!worker && (
        <small>
          Current availability and schedule are checked again. This action does not collect a
          payment.
        </small>
      )}
    </div>
  );
}

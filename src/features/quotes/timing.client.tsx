"use client";
import type { QuoteTerms } from "./schema";
import { toSastInput, fromSastInput } from "@/features/jobs/format";
export function QuoteTiming({
  terms,
  change,
  onError,
}: {
  terms: QuoteTerms;
  change: (patch: Partial<QuoteTerms>) => void;
  onError: (s: string) => void;
}) {
  return (
    <>
      <div className="job-two-columns">
        {(["startsAt", "endsAt", "validUntil"] as const).map((key, i) => (
          <label key={key}>
            {["Proposed start (SAST)", "Proposed end (SAST)", "Offer expiry (SAST)"][i]}
            <input
              type="datetime-local"
              required
              value={toSastInput(terms[key])}
              onChange={(e) => {
                if (e.target.value)
                  try {
                    change({ [key]: fromSastInput(e.target.value) });
                  } catch {
                    onError("Choose a valid date and time.");
                  }
              }}
            />
          </label>
        ))}
      </div>
      <p>
        Work appointments: within 90 days, up to 24 hours. Inspections: within seven days, up to
        eight hours. Offers expire before the appointment and within seven days.
      </p>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { jobTime } from "@/features/jobs/format";
import { useAgreementMutation } from "@/features/quotes/client-api";
import type { ExactLocation } from "@/features/quotes/types";
export function LocationReveal({ jobId }: { jobId: string }) {
  const mutation = useAgreementMutation(),
    [location, setLocation] = useState<ExactLocation | null>(null);
  useEffect(() => {
    if (!location) return;
    const timer = setTimeout(
      () => setLocation(null),
      Math.max(0, Date.parse(location.until) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [location]);
  return (
    <section className="quote-location" aria-label="Audited exact location">
      <h3>Private visit location</h3>
      <p>
        Opening this location is logged and checked against your live permission. This view clears
        after at most one minute.
      </p>
      <button
        type="button"
        className="button button-secondary"
        disabled={mutation.busy}
        onClick={async () => {
          setLocation(null);
          try {
            setLocation(
              await mutation.run<ExactLocation & Record<string, unknown>>("location", { jobId }),
            );
          } catch {}
        }}
      >
        View authorized location
      </button>
      {location && (
        <div className="job-private-review" role="status">
          <p>{location.street || "Town-only request: no exact street supplied."}</p>
          <p>{location.province}</p>
          <p className="job-text">{location.notes}</p>
          {location.point && (
            <p>
              Private point: {location.point.latitude.toFixed(6)},{" "}
              {location.point.longitude.toFixed(6)}
            </p>
          )}
          <p>View clears by {jobTime(location.until)}.</p>
          <button type="button" className="text-link" onClick={() => setLocation(null)}>
            Hide private location
          </button>
        </div>
      )}
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
    </section>
  );
}

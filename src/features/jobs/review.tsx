import type { DraftData } from "./schema";
import type { JobOptions } from "./types";
import { money, jobTime } from "./format";
export function JobReview({
  data,
  options,
  directWorker,
}: {
  data: DraftData;
  options: JobOptions;
  directWorker: string | null;
}) {
  const location = data.location?.kind === "manual" ? data.location : null;
  return (
    <div className="job-review">
      <h3>{data.title || "Add a request title"}</h3>
      <dl>
        <dt>Category</dt>
        <dd>{options.categories.find((c) => c.id === data.categoryId)?.label ?? "Not selected"}</dd>
        <dt>Work details</dt>
        <dd className="job-text">{data.description || "Not added"}</dd>
        <dt>Invitations</dt>
        <dd>
          {directWorker
            ? "Only " + directWorker
            : "Up to five eligible workers per wave; at most three waves"}
        </dd>
        <dt>Urgency</dt>
        <dd>{data.urgency === "urgent" ? "Urgent today — no response guarantee" : data.urgency}</dd>
        <dt>Requested windows</dt>
        <dd>
          {data.slots.length ? (
            <ul>
              {data.slots.map((s, i) => (
                <li key={i}>
                  {jobTime(s.start)} — {jobTime(s.end)}
                </li>
              ))}
            </ul>
          ) : data.urgency === "urgent" ? (
            "Next two hours, capped at the end of today in SAST"
          ) : (
            "No fixed window chosen"
          )}
        </dd>
        <dt>Contact availability</dt>
        <dd>{data.contactWindow || "Not specified"}</dd>
        <dt>Approximate budget</dt>
        <dd>
          {money(data.budgetMin)} — {money(data.budgetMax)}. No payment or price commitment.
        </dd>
        <dt>Public job town</dt>
        <dd>
          {options.areas.find((a) => a.id === location?.areaId)?.label ??
            (data.location?.kind === "saved"
              ? "Save to resolve your selected address"
              : "Not selected")}
        </dd>
      </dl>
      <section className="job-private-review" aria-label="Your private location confirmation">
        <h3>Your private location confirmation</h3>
        <p>
          This section is for you. It is excluded from invited-worker previews and notification
          payloads.
        </p>
        {location ? (
          <>
            <p>
              {location.townOnly
                ? "Town-only approximate matching"
                : location.street || "No street/rural directions added"}
            </p>
            {location.province && <p>{location.province}</p>}
            {location.notes && <p className="job-text">{location.notes}</p>}
            {location.point && (
              <p>
                Private point: {location.point.latitude.toFixed(6)},{" "}
                {location.point.longitude.toFixed(6)}
              </p>
            )}
          </>
        ) : (
          <p>Save and review your location before submitting.</p>
        )}
      </section>
      <p>
        Invited workers can read your title, work details, photos, public town, requested windows
        and budget. Keep identifying location information out of the shared text and photos. Exact
        location is not disclosed by an invitation. Quotes, appointments and payments are not
        confirmed by this request.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/page-heading";
export const metadata: Metadata = { title: "Trust & safety" };
export default function TrustPage() {
  return (
    <div className="reading-layout">
      <PageHeading eyebrow="Care is part of the work" title="Trust needs more than a badge.">
        <p>
          These are the safeguards being designed into the marketplace. Verification operations and
          reporting tools are not active in this release.
        </p>
      </PageHeading>
      {[
        [
          "Manual review before publication",
          "Workers will need identity review and relevant trade or business checks before a listing is published. A checked identity is not a guarantee of work quality, insurance, background checks or a valid licence for every trade.",
        ],
        [
          "Private by default",
          "Public profiles will show only an approximate service area. Exact worker bases, customer addresses, identity documents and bank details will stay out of public listings. Exact job addresses will require a confirmed booking or an explicitly approved, time-limited inspection grant.",
        ],
        [
          "Agreement before action",
          "A request will not be a confirmed booking. Clients and workers will agree on scope and price, and the worker will confirm the appointment. Reviews will come only from genuine completed bookings.",
        ],
        [
          "Clear payment boundaries",
          "Online payments are disabled pending South African merchant and legal validation. There is no escrow or payment-protection promise. Direct cash or EFT records, when implemented, will be clearly labelled as self-reported where appropriate.",
        ],
        [
          "Safety comes first",
          "This app is not an emergency response service. If there is immediate physical danger, contact the appropriate emergency services. In-app reports and disputes will be implemented before the pilot opens.",
        ],
      ].map(([title, body]) => (
        <section className="prose-block" key={title}>
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
    </div>
  );
}

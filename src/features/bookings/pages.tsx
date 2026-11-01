import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/features/auth/guard";
import { PageHeading } from "@/features/auth/page-heading";
import { quotesConfig } from "@/features/quotes/config";
import { AgreementClosed, AgreementNavigation } from "@/features/quotes/pages";
import { jobTime } from "@/features/jobs/format";
import { bookingList, bookingDetail } from "./queries";
import { BookingDetail } from "./detail.client";
import { AgreementNotices } from "@/features/quotes/notices";
import { appointmentStatus } from "./status";
export async function BookingsPage({ worker = false }: { worker?: boolean }) {
  await requireWorkspace(worker ? "worker" : "client");
  if (!quotesConfig()) return <AgreementClosed worker={worker} />;
  const bookings = await bookingList(worker);
  return (
    <>
      <AgreementNavigation worker={worker} />
      <PageHeading
        eyebrow={worker ? "Worker appointments" : "Client appointments"}
        title="Know what is agreed."
      >
        <p>Pending requests need explicit worker confirmation. No payment is collected here.</p>
      </PageHeading>
      {bookings.length ? (
        <ul className="job-record-list">
          {bookings.map((b) => (
            <li key={b.id}>
              <p className="eyebrow">
                {appointmentStatus(b.status)} · {b.town}
              </p>
              <h2>
                <Link href={"/app/" + (worker ? "worker" : "client") + "/bookings/" + b.id}>
                  {b.title}
                </Link>
              </h2>
              <p>
                {jobTime(b.startsAt)} — {jobTime(b.endsAt)}
              </p>
              <Link
                className="button button-secondary"
                href={"/app/" + (worker ? "worker" : "client") + "/bookings/" + b.id}
              >
                Review appointment
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="empty-panel">
          <h2>No appointments yet.</h2>
          <p>
            Agree to a genuine priced quote to request an appointment. An inspection alone does not
            create a work booking.
          </p>
        </section>
      )}
    </>
  );
}
export async function BookingPage({ id, worker = false }: { id: string; worker?: boolean }) {
  await requireWorkspace(worker ? "worker" : "client");
  if (!quotesConfig()) return <AgreementClosed worker={worker} />;
  if (!z.guid().safeParse(id).success) notFound();
  const booking = await bookingDetail(id, worker).catch((error) => {
    if (error instanceof Error && error.message === "FORBIDDEN") notFound();
    throw error;
  });
  return (
    <div className="quotes-page">
      <AgreementNavigation worker={worker} />
      <PageHeading eyebrow="Private appointment" title={booking.jobTitle}>
        <p>Selected quote terms are retained. This page does not collect or verify payment.</p>
      </PageHeading>
      {quotesConfig()!.mode === "local" && (
        <p className="test-notice">Isolated local appointment. Fictional parties and no payment.</p>
      )}
      <BookingDetail key={booking.id + ":" + booking.version} booking={booking} />
      <AgreementNotices worker={worker} />
    </div>
  );
}

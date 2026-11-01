import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/features/auth/guard";
import { PageHeading } from "@/features/auth/page-heading";
import { quotesConfig } from "./config";
import { quotesForJob, workerQuoteJobs } from "./queries";
import { QuoteCard } from "./card";
import { QuoteBuilder } from "./builder.client";
import { InspectionPanel } from "./inspection.client";
import { CloseRequest } from "./close-request.client";
import { AgreementNotices } from "./notices";
export function AgreementClosed({ worker = false }: { worker?: boolean }) {
  return (
    <section className="job-panel">
      <h2>Quotations and appointments are not open yet.</h2>
      <p>This capability is awaiting release configuration.</p>
      <Link className="text-link" href={"/app/" + (worker ? "worker" : "client")}>
        Back to your workspace
      </Link>
    </section>
  );
}
export function AgreementNavigation({ worker = false }: { worker?: boolean }) {
  const prefix = "/app/" + (worker ? "worker" : "client");
  return (
    <nav className="job-actions" aria-label="Agreements">
      <Link className="text-link" href={prefix}>
        Account workspace
      </Link>
      <Link className="text-link" href={prefix + (worker ? "/quotes" : "/jobs")}>
        {worker ? "Quote workspace" : "My requests"}
      </Link>
      <Link className="text-link" href={prefix + "/bookings"}>
        Appointments
      </Link>
    </nav>
  );
}
export async function QuotesPage({
  jobId,
  worker = false,
  history = 0,
}: {
  jobId?: string;
  worker?: boolean;
  history?: number;
}) {
  await requireWorkspace(worker ? "worker" : "client");
  if (!quotesConfig()) return <AgreementClosed worker={worker} />;
  if (!jobId && worker) {
    const jobs = await workerQuoteJobs();
    return (
      <>
        <AgreementNavigation worker />
        <PageHeading eyebrow="Worker quotations" title="Your work, clearly priced.">
          <p>Only your current invitations and retained quote history appear here.</p>
        </PageHeading>
        {jobs.length ? (
          <ul className="job-record-list">
            {jobs.map((j) => (
              <li key={j.id}>
                <p>
                  {j.town} · {j.status}
                </p>
                <h2>
                  <Link href={"/app/worker/quotes?job=" + j.id}>{j.title}</Link>
                </h2>
                <Link className="button button-secondary" href={"/app/worker/quotes?job=" + j.id}>
                  Open quote workspace
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <section className="empty-panel">
            <h2>No requests to quote yet.</h2>
            <p>Use Opportunities to review a current eligible invitation.</p>
            <Link className="text-link" href="/app/worker/opportunities">
              Open opportunities
            </Link>
          </section>
        )}
      </>
    );
  }
  if (!z.guid().safeParse(jobId).success) notFound();
  const view = await quotesForJob(jobId!, worker, history).catch((error) => {
    if (error instanceof Error && error.message === "FORBIDDEN") notFound();
    throw error;
  });
  const cards = (quotes: typeof view.offers) =>
    quotes.map((q) => (
      <QuoteCard key={q.id} quote={q} jobVersion={view.jobVersion} worker={worker} />
    ));
  return (
    <div className="quotes-page">
      <AgreementNavigation worker={worker} />
      <PageHeading
        eyebrow={worker ? "Your private quotation workspace" : "Client quote comparison"}
        title={worker ? "Make the scope clear." : "Choose with the details in view."}
      >
        <p>
          {view.title} · {view.town} · {view.jobStatus}
        </p>
      </PageHeading>
      {quotesConfig()!.mode === "local" && (
        <p className="test-notice">
          Isolated local agreement. No real provider, SMS delivery or payment.
        </p>
      )}
      <section className="job-panel">
        <h2>Supplied work details</h2>
        <p className="job-text">{view.description}</p>
        <p>{view.eligibilityMessage}</p>
        <p>
          The exact location is withheld until worker confirmation or a separate authorized
          inspection. An offer is not a booking.
        </p>
        {!!view.media.length && (
          <div className="job-photo-list">
            {view.media.map((id, i) => (
              <Image
                unoptimized
                key={id}
                src={"/api/v1/jobs/media/" + id}
                width={320}
                height={220}
                alt={"Request work photo " + (i + 1)}
              />
            ))}
          </div>
        )}
        {view.bookingId && (
          <Link
            className="button button-primary"
            href={"/app/" + (worker ? "worker" : "client") + "/bookings/" + view.bookingId}
          >
            Open selected appointment
          </Link>
        )}
      </section>
      {worker && view.canQuote && (!view.latest || view.latest.version < 20) && (
        <QuoteBuilder key={view.latest?.id ?? "new"} jobId={view.jobId} latest={view.latest} />
      )}
      <section aria-label="Current quote offers">
        <h2>Current sent offers</h2>
        {view.offers.length ? (
          cards(view.offers)
        ) : (
          <div className="empty-panel">
            <h3>No current sent offers.</h3>
            <p>
              Drafts are private. Expired, withdrawn and superseded versions are retained below.
            </p>
          </div>
        )}
      </section>
      {view.grants.map((grant) => (
        <InspectionPanel key={grant.id} grant={grant} worker={worker} jobId={view.jobId} />
      ))}
      <section aria-label="Quote version history">
        <h2>{worker ? "Private drafts and version history" : "Previous quote versions"}</h2>
        {view.history.length ? cards(view.history) : <p>No previous versions.</p>}
      </section>
      {!worker && (
        <nav className="job-actions" aria-label="Quote history pages">
          {history > 0 && (
            <Link className="text-link" href={"?history=" + (history - 1)}>
              Newer history
            </Link>
          )}
          {view.hasMore && (
            <Link className="text-link" href={"?history=" + (history + 1)}>
              Older history
            </Link>
          )}
        </nav>
      )}
      {!worker && !view.bookingId && ["open", "matching", "quoted"].includes(view.jobStatus) && (
        <CloseRequest jobId={view.jobId} version={view.jobVersion} />
      )}
      <AgreementNotices worker={worker} />
      <a
        className="text-link"
        href={
          worker
            ? "/app/worker/quotes?job=" + view.jobId
            : "/app/client/jobs/" + view.jobId + "/quotes?history=" + history
        }
      >
        Refresh saved quote status
      </a>
    </div>
  );
}

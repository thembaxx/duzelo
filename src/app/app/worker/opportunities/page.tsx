import Link from "next/link";
import { requireWorkspace } from "@/features/auth/guard";
import { jobsConfig } from "@/features/jobs/config";
import { opportunities, matchSettings, jobNotifications } from "@/features/jobs/queries";
import { JobsNavigation, JobsClosed } from "@/features/jobs/navigation";
import { PageHeading } from "@/features/auth/page-heading";
import { MatchPreferencesForm } from "@/features/jobs/preferences.client";
import { jobTime } from "@/features/jobs/format";
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await requireWorkspace("worker");
  if (!jobsConfig()) return <JobsClosed />;
  const [items, settings, notifications] = await Promise.all([
    opportunities(),
    matchSettings(),
    jobNotifications(),
  ]);
  return (
    <>
      <JobsNavigation worker />
      <PageHeading eyebrow="Worker opportunities" title="Work that fits your services.">
        <p>
          Only current invitations you are eligible to view appear here. Your profile status is{" "}
          {actor.workerStatus ?? "not started"}. An invitation is not a booking.
        </p>
      </PageHeading>
      <a className="text-link" href="/app/worker/opportunities">
        Refresh opportunities
      </a>
      {items.length ? (
        <ul className="job-record-list">
          {items.map((o) => (
            <li key={o.matchId}>
              <p className="eyebrow">
                {o.category} · {o.town}
              </p>
              <h2>
                <Link href={"/app/worker/opportunities/" + o.matchId}>{o.title}</Link>
              </h2>
              <p>{o.rationale}</p>
              <p>Invitation expires {jobTime(o.expires)}</p>
              <Link
                href={"/app/worker/opportunities/" + o.matchId}
                className="button button-secondary"
              >
                Review opportunity
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="empty-panel">
          <h2>No current eligible invitations.</h2>
          <p>
            Invitations depend on manual approval, category credentials, availability, coverage,
            blocks and requested times. Expired or ineligible requests are not shown.
          </p>
        </section>
      )}
      <MatchPreferencesForm initial={settings} />
      <details className="job-panel">
        <summary>Recent in-app notices</summary>
        {notifications.length ? (
          <ul>
            {notifications.map((n) => (
              <li key={n.id}>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No invitation notices yet.</p>
        )}
        <p>
          Notices are a history. Open opportunities to check current eligibility. This pilot sends
          no SMS, email or push invitation.
        </p>
      </details>
    </>
  );
}

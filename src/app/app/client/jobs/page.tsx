import Link from "next/link";
import { requireWorkspace } from "@/features/auth/guard";
import { jobsConfig } from "@/features/jobs/config";
import { ownerJobs } from "@/features/jobs/queries";
import { JobsNavigation, JobsClosed } from "@/features/jobs/navigation";
import { PageHeading } from "@/features/auth/page-heading";
import { jobTime } from "@/features/jobs/format";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireWorkspace("client");
  if (!jobsConfig()) return <JobsClosed />;
  const jobs = await ownerJobs();
  return (
    <>
      <JobsNavigation />
      <PageHeading eyebrow="Client requests" title="A little help starts here.">
        <p>Resume a private draft or check the invitations for a submitted request.</p>
      </PageHeading>
      {jobs.length ? (
        <ul className="job-record-list">
          {jobs.map((j) => (
            <li key={j.id}>
              <h2>
                <Link href={"/app/client/jobs/" + j.id}>{j.title || "Untitled private draft"}</Link>
              </h2>
              <p>
                {j.status} · Created {jobTime(new Date(j.created_at).toISOString())}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <section className="empty-panel">
          <h2>No job requests yet.</h2>
          <p>
            Start a draft when you know what needs doing. No worker is contacted until you submit.
          </p>
          <Link href="/app/client/jobs/new" className="button button-primary">
            Start your first request
          </Link>
        </section>
      )}
    </>
  );
}

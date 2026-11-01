import { z } from "zod";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/features/auth/guard";
import { jobsConfig } from "@/features/jobs/config";
import { quotesConfig } from "@/features/quotes/config";
import Link from "next/link";
import { getOwnerJob, jobOptions } from "@/features/jobs/queries";
import { JobsNavigation, JobsClosed } from "@/features/jobs/navigation";
import { PageHeading } from "@/features/auth/page-heading";
import { JobWizard } from "@/features/jobs/wizard.client";
import { JobStatus } from "@/features/jobs/status.client";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireWorkspace("client");
  if (!jobsConfig()) return <JobsClosed />;
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();
  const job = await getOwnerJob(id).catch((error) => {
    if (error instanceof Error && error.message === "FORBIDDEN") notFound();
    throw error;
  });
  const options = await jobOptions();
  return (
    <>
      <JobsNavigation />
      <PageHeading
        eyebrow={job.status === "draft" ? "Your private draft" : "Your service request"}
        title={job.status === "draft" ? "Make room for a little help." : job.data.title}
      >
        <p>
          {job.directWorker
            ? "Direct request to " + job.directWorker
            : "Invitations are limited to eligible workers for this request."}
        </p>
      </PageHeading>
      {job.status === "draft" ? (
        <JobWizard initial={job} options={options} />
      ) : (
        <>
          <JobStatus job={job} options={options} />
          {quotesConfig() && (
            <Link className="button button-primary" href={"/app/client/jobs/" + job.id + "/quotes"}>
              Review quote offers
            </Link>
          )}
        </>
      )}
    </>
  );
}

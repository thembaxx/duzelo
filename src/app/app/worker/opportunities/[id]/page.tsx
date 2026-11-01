import { z } from "zod";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/features/auth/guard";
import { jobsConfig } from "@/features/jobs/config";
import { quotesConfig } from "@/features/quotes/config";
import { opportunities } from "@/features/jobs/queries";
import { JobsNavigation, JobsClosed } from "@/features/jobs/navigation";
import { PageHeading } from "@/features/auth/page-heading";
import { OpportunityDetail } from "@/features/jobs/opportunity.client";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireWorkspace("worker");
  if (!jobsConfig()) return <JobsClosed worker />;
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();
  const [opportunity] = await opportunities(id);
  if (!opportunity) notFound();
  return (
    <>
      <JobsNavigation worker />
      <PageHeading
        eyebrow="Private invitation · Approximate town only"
        title="Look at the work, then decide."
      >
        <p>The client’s precise location is withheld.</p>
      </PageHeading>
      <OpportunityDetail opportunity={opportunity} quotesEnabled={!!quotesConfig()} />
    </>
  );
}

import { z } from "zod";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/features/auth/guard";
import { jobsConfig } from "@/features/jobs/config";
import { jobOptions } from "@/features/jobs/queries";
import { JobsNavigation, JobsClosed } from "@/features/jobs/navigation";
import { PageHeading } from "@/features/auth/page-heading";
import { StartJob } from "@/features/jobs/start.client";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireWorkspace("client");
  if (!jobsConfig()) return <JobsClosed />;
  const params = await searchParams;
  const input = z
    .object({
      workerSlug: z
        .string()
        .regex(/^provider-[a-f0-9-]{36}$/)
        .nullable(),
      categoryId: z.guid().nullable(),
    })
    .safeParse({ workerSlug: params.worker ?? null, categoryId: params.category ?? null });
  if (!input.success) notFound();
  return (
    <>
      <JobsNavigation />
      <PageHeading eyebrow="A request, at your pace" title="What needs a good pair of hands?">
        <p>Save as you go. Share only what eligible workers need to understand the work.</p>
      </PageHeading>
      <StartJob options={await jobOptions()} {...input.data} />
    </>
  );
}

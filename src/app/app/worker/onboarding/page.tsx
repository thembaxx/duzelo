import Link from "next/link";
import { requireWorkspace } from "@/features/auth/guard";
import { PageHeading } from "@/features/auth/page-heading";
import { workerConfig } from "@/features/workers/config";
import { ownerApplication } from "@/features/workers/queries";
import { WorkerProfileForm } from "@/features/workers/profile-form.client";
import { EvidencePanel } from "@/features/workers/upload-panel.client";
import { WorkerNavigation } from "@/features/workers/navigation";
export const dynamic = "force-dynamic";
export default async function WorkerOnboarding({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireWorkspace("worker");
  if (!workerConfig())
    return (
      <PageHeading eyebrow="Worker profile" title="Profile setup is not open yet.">
        <p>Private storage and manual review are still awaiting release configuration.</p>
      </PageHeading>
    );
  const application = await ownerApplication(),
    edit = (await searchParams).edit === "1" || !application.draft;
  return (
    <>
      <PageHeading eyebrow="Your worker profile" title="Make space for your skills.">
        <p>
          Build a clear service profile, then provide evidence for manual review. Your exact base
          and identity documents stay private.
        </p>
      </PageHeading>
      <WorkerNavigation step={edit ? "profile" : "evidence"} />
      {application.status === "suspended" ? (
        <p>This worker profile is suspended. Changes and publication are unavailable.</p>
      ) : !application.areas.length || !application.categories.length ? (
        <p>
          An operator must configure the service categories and public towns before setup opens.
        </p>
      ) : edit ? (
        <WorkerProfileForm initial={application} />
      ) : application.state === "draft" ? (
        <EvidencePanel application={application} />
      ) : (
        <section className="empty-panel">
          <h2>Application: {application.status.replaceAll("_", " ")}</h2>
          <p>
            Your submitted evidence is locked to this revision. Editing the profile starts a new
            review and takes any listing offline.
          </p>
          <Link href="/app/worker/verification" className="button button-primary">
            View review status
          </Link>
        </section>
      )}
    </>
  );
}

import Link from "next/link";
import { requireWorkspace } from "@/features/auth/guard";
import { PageHeading } from "@/features/auth/page-heading";
import { workerConfig } from "@/features/workers/config";
import { ownerApplication } from "@/features/workers/queries";
import { WorkerNavigation } from "@/features/workers/navigation";
import { EvidenceAccess } from "@/features/workers/access-button.client";
export const dynamic = "force-dynamic";
export default async function VerificationStatus() {
  await requireWorkspace("worker");
  if (!workerConfig())
    return <PageHeading eyebrow="Worker review" title="Manual review is not open yet." />;
  const application = await ownerApplication();
  return (
    <>
      <PageHeading eyebrow="Your application" title="Every claim has its own review.">
        <p>
          Account access, identity review, business review and trade credentials are separate. A
          trade badge applies only to the category reviewed.
        </p>
      </PageHeading>
      <WorkerNavigation step="status" />
      <section className="empty-panel">
        <h2>Application status: {application.status.replaceAll("_", " ")}</h2>
        <p>
          Publication:{" "}
          {application.publicSlug ? "Public for eligible categories" : "Not currently public"}
        </p>
        {application.publicSlug && (
          <Link href={"/workers/" + application.publicSlug} className="button button-primary">
            View public profile
          </Link>
        )}
        <Link href="/app/worker/onboarding?edit=1" className="button button-secondary">
          Edit application
        </Link>
      </section>
      {application.verifications.length ? (
        <div className="worker-review-list">
          {application.verifications.map((v) => (
            <section key={v.id} className="empty-panel">
              <h2>
                {v.kind}
                {v.categoryId
                  ? " · " + application.categories.find((c) => c.id === v.categoryId)?.label
                  : ""}
              </h2>
              <p>Recorded decision: {v.status.replaceAll("_", " ")}</p>
              {v.reason && <p>Reviewer feedback: {v.reason}</p>}
              {v.expiry && <p>Credential expiry: {v.expiry}</p>}
            </section>
          ))}
        </div>
      ) : (
        <p>No evidence has been submitted for the current revision.</p>
      )}
      <h2>Your stored images</h2>
      {application.assets.map((asset) => (
        <EvidenceAccess key={asset.id} assetId={asset.id} label={asset.kind} />
      ))}
    </>
  );
}

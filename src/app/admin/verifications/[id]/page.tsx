import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/features/auth/guard";
import { PageHeading } from "@/features/auth/page-heading";
import { workerConfig } from "@/features/workers/config";
import { reviewApplication } from "@/features/workers/queries";
import { EvidenceAccess } from "@/features/workers/access-button.client";
import { DecisionForm, PublishForm, PurgeForm } from "@/features/workers/review-forms.client";
export const dynamic = "force-dynamic";
export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireWorkspace("admin");
  if (!["owner", "verification"].includes(actor.adminRole ?? "")) redirect("/auth/forbidden");
  const { id } = await params;
  if (!workerConfig() || !z.guid().safeParse(id).success) notFound();
  let application;
  try {
    application = await reviewApplication(id);
  } catch {
    notFound();
  }
  return (
    <>
      <PageHeading eyebrow="Manual evidence review" title={application.name}>
        <p>
          Revision {application.revision} ·{" "}
          {application.kind === "business" ? "Business owner" : "Individual"} ·{" "}
          {application.status.replaceAll("_", " ")}
        </p>
      </PageHeading>
      <Link href="/admin/verifications" className="text-link">
        Back to review queue
      </Link>
      <section className="empty-panel">
        <h2>Public content to check</h2>
        <p>{application.bio}</p>
        <p>Public town: {application.areas.find((a) => a.id === application.areaId)?.label}</p>
        {application.services.map((s, n) => (
          <div key={n}>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            <p>
              {s.pricing === "quote"
                ? "Custom quote"
                : `${s.pricing === "from" ? "From " : ""}R ${s.price}`}
            </p>
          </div>
        ))}
        <p>Exact worker base and private registration data are not included in this page.</p>
      </section>
      <p className="admin-mobile-notice">
        Use a larger screen to record verification or publication decisions. Evidence access remains
        audited and requires MFA.
      </p>
      {application.verifications.map((v) => (
        <section key={v.id} className="worker-review-claim">
          <h2>
            {v.kind}
            {v.categoryId
              ? " · " + application.categories.find((c) => c.id === v.categoryId)?.label
              : ""}
          </h2>
          <p>Current status: {v.status.replaceAll("_", " ")}</p>
          {v.reason && <p>Worker feedback: {v.reason}</p>}
          {application.assets
            .filter((a) => a.kind === v.kind && a.categoryId === v.categoryId)
            .map((a) => (
              <EvidenceAccess key={a.id} assetId={a.id} label={a.kind} />
            ))}
          <DecisionForm workerId={id} revision={application.revision} verification={v} />
        </section>
      ))}
      <section className="worker-review-claim">
        <h2>Proposed public photos</h2>
        {application.assets
          .filter((a) => ["avatar", "portfolio"].includes(a.kind))
          .map((a) => (
            <div key={a.id}>
              <p>
                {a.kind} · {a.caption || "No caption"}
              </p>
              <EvidenceAccess assetId={a.id} label={a.kind} />
            </div>
          ))}
      </section>
      <PublishForm workerId={id} revision={application.revision} />
      <PurgeForm workerId={id} />
    </>
  );
}

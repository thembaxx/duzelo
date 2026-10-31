import Link from "next/link";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/features/auth/guard";
import { PageHeading } from "@/features/auth/page-heading";
import { workerConfig } from "@/features/workers/config";
import { reviewQueue } from "@/features/workers/queries";
export const dynamic = "force-dynamic";
export default async function VerificationQueue() {
  const actor = await requireWorkspace("admin");
  if (!["owner", "verification"].includes(actor.adminRole ?? "")) redirect("/auth/forbidden");
  if (!workerConfig())
    return <PageHeading eyebrow="Manual review" title="Verification is not open yet." />;
  const applications = await reviewQueue();
  return (
    <>
      <PageHeading eyebrow="Administrator · MFA required" title="Review with care.">
        <p>
          Inspect each evidence image before deciding. Publication is a separate confirmation after
          checking public text and photos.
        </p>
      </PageHeading>
      {applications.length ? (
        <ul className="worker-queue">
          {applications.map((a) => (
            <li key={String(a.id)}>
              <Link href={"/admin/verifications/" + a.id}>
                <strong>{String(a.display_name)}</strong>
                <span>
                  {String(a.state).replaceAll("_", " ")} · revision {Number(a.revision)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No applications are available for your review.</p>
      )}
    </>
  );
}

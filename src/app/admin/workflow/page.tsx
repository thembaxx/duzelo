import { redirect } from "next/navigation";
import { requireWorkspace } from "@/features/auth/guard";
import { workflowConfig } from "@/features/collaboration/config";
import { auditQueue } from "@/features/workflow/admin";
import { AuditWorkspace } from "@/features/workflow/audit.client";
import { PageHeading } from "@/features/auth/page-heading";
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await requireWorkspace("admin");
  if (!["owner", "support"].includes(actor.adminRole ?? "")) redirect("/auth/forbidden");
  if (!workflowConfig()) return <p>Work evidence review is not open yet.</p>;
  return (
    <>
      <PageHeading eyebrow="Support · MFA verified" title="Review the record with care.">
        <p>
          Read evidence and record support requests without making a financial or fault decision.
        </p>
      </PageHeading>
      <AuditWorkspace queue={await auditQueue()} />
    </>
  );
}

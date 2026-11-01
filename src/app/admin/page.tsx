import Link from "next/link";
import { workerConfig } from "@/features/workers/config";
import { requireWorkspace } from "@/features/auth/guard";
import { PageHeading } from "@/features/auth/page-heading";
import { SignOutButton } from "@/features/auth/forms.client";
export const dynamic = "force-dynamic";
export default async function Admin() {
  const actor = await requireWorkspace("admin");
  return (
    <>
      <PageHeading eyebrow="Administrator · MFA verified" title="A careful foundation.">
        <p>
          Your administrator membership and authenticator were verified. Review permissions are
          checked again whenever evidence is opened or a decision is recorded.
        </p>
      </PageHeading>
      {workerConfig() && ["owner", "verification"].includes(actor.adminRole ?? "") && (
        <p>
          <Link className="button button-primary" href="/admin/verifications">
            Review worker applications
          </Link>
        </p>
      )}
      <SignOutButton />
    </>
  );
}

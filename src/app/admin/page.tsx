import { requireWorkspace } from "@/features/auth/guard";
import { PageHeading } from "@/features/auth/page-heading";
import { SignOutButton } from "@/features/auth/forms.client";
export const dynamic = "force-dynamic";
export default async function Admin() {
  await requireWorkspace("admin");
  return (
    <>
      <PageHeading eyebrow="Administrator · MFA verified" title="A careful foundation.">
        <p>
          Your administrator membership and authenticator were verified. Verification queues,
          evidence access and approval actions are not active yet.
        </p>
      </PageHeading>
      <SignOutButton />
    </>
  );
}

import { PageHeading } from "@/features/auth/page-heading";
import { SignOutButton } from "@/features/auth/forms.client";
import { getVerifiedIdentity } from "@/features/auth/service";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Suspended() {
  const actor = await getVerifiedIdentity();
  if (!actor?.profile?.is_suspended) redirect("/auth/sign-in");
  return (
    <>
      <PageHeading eyebrow="Account access limited" title="This account is paused.">
        <p>
          Your account cannot access private workspaces or make changes while suspended. There is no
          automatic appeal or reinstatement action in this release.
        </p>
      </PageHeading>
      <SignOutButton />
    </>
  );
}

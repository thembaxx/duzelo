import { PageHeading } from "@/components/layout/page-heading";
import { SignOutButton } from "@/features/auth/forms.client";
export default function Suspended() {
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

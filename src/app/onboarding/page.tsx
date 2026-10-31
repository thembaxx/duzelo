import { requireIdentity } from "@/features/auth/guard";
import { ProfileForm } from "@/features/auth/forms.client";
import { PageHeading } from "@/features/auth/page-heading";
export const dynamic = "force-dynamic";
export default async function Onboarding() {
  const actor = await requireIdentity();
  return (
    <>
      <PageHeading eyebrow="Your account" title="Make yourself at home.">
        <p>
          Find help, offer your skills, or do both with one account. You can add another mode later.
        </p>
      </PageHeading>
      <ProfileForm
        onboarding
        initial={{
          displayName: actor.profile?.display_name ?? "",
          emailNotifications: actor.profile?.email_notifications ?? false,
          inAppNotifications: actor.profile?.in_app_notifications ?? true,
        }}
      />
    </>
  );
}

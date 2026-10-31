import { requireIdentity } from "@/features/auth/guard";
import { ProfileForm } from "@/features/auth/forms.client";
import { PageHeading } from "@/components/layout/page-heading";
export const dynamic = "force-dynamic";
export default async function Onboarding() {
  const actor = await requireIdentity();
  return (
    <>
      <PageHeading eyebrow="Your account" title="Make yourself at home.">
        <p>
          One account can find help, offer services, or do both. Switching views never grants
          approval or access to someone else’s information.
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

import { AppearanceControl } from "@/components/appearance-control";
import { requireIdentity } from "@/features/auth/guard";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm, SignOutButton } from "@/features/auth/forms.client";
import { PageHeading } from "@/features/auth/page-heading";
export const dynamic = "force-dynamic";
export default async function Settings() {
  const actor = await requireIdentity();
  if (!actor.profile?.onboarding_completed_at) redirect("/onboarding");
  return (
    <>
      <PageHeading eyebrow="Your account" title="A little more you.">
        <p>
          Edit your display name and notification preferences. Your phone number and verification
          details are managed separately.
        </p>
      </PageHeading>
      <h2>Appearance</h2>
      <AppearanceControl />
      <h2>Profile preferences</h2>
      <ProfileForm
        onboarding={false}
        initial={{
          displayName: actor.profile.display_name,
          emailNotifications: actor.profile.email_notifications,
          inAppNotifications: actor.profile.in_app_notifications,
        }}
      />
      <div className="inline-actions">
        <Link
          href={actor.profile.client_enabled ? "/app/client" : "/app/worker"}
          className="text-link"
        >
          Back to workspace
        </Link>
        <SignOutButton />
      </div>
    </>
  );
}

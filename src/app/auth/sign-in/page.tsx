import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKey as LockKeyhole } from "@phosphor-icons/react/dist/ssr";
import { PageHeading } from "@/features/auth/page-heading";
import { buttonVariants } from "@/features/auth/button";
import { readAuthConfig } from "@/config/auth";
import { SignInForm } from "@/features/auth/forms.client";
import { getVerifiedIdentity } from "@/features/auth/service";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Account access",
  robots: { index: false, follow: false },
};
export default async function SignInPage() {
  const config = readAuthConfig();
  if (config) {
    const identity = await getVerifiedIdentity();
    if (identity)
      redirect(
        identity.profile?.is_suspended
          ? "/auth/suspended"
          : identity.profile?.onboarding_completed_at
            ? identity.profile.client_enabled
              ? "/app/client"
              : "/app/worker"
            : "/onboarding",
      );
    return (
      <>
        <PageHeading eyebrow="One account. Your community." title="Welcome closer to home.">
          <p>Sign in or create your account with a South African mobile number.</p>
        </PageHeading>
        <SignInForm
          local={config.mode === "local"}
          {...(config.captchaSiteKey ? { captchaSiteKey: config.captchaSiteKey } : {})}
        />
      </>
    );
  }
  return (
    <>
      <PageHeading eyebrow="Account access" title="A little more groundwork first.">
        <p>
          Sign-in and registration aren’t open yet. Phone verification is awaiting provider
          configuration and release checks.
        </p>
      </PageHeading>
      <section className="empty-panel">
        <LockKeyhole size={30} aria-hidden="true" />
        <h2>Your workspace stays protected.</h2>
        <p>
          Client, worker and administrator pages are unavailable in this public preview. No phone
          number is collected and no code is sent.
        </p>
        <div className="inline-actions">
          <Link href="/services" className={buttonVariants()}>
            Explore services
          </Link>
          <Link href="/how-it-works" className={buttonVariants({ variant: "outline" })}>
            Learn how it will work
          </Link>
        </div>
      </section>
    </>
  );
}

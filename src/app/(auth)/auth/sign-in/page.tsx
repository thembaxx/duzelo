import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { buttonVariants } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Account access",
  robots: { index: false, follow: false },
};
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { workspace } = await searchParams;
  const label =
    workspace === "admin"
      ? "Administrator"
      : workspace === "worker"
        ? "Worker"
        : workspace === "client"
          ? "Client"
          : "Account";
  return (
    <>
      <PageHeading eyebrow={`${label} access`} title="A little more groundwork first.">
        <p>
          Sign-in and registration aren’t open yet. Phone verification will be connected after the
          database and security baseline are ready.
        </p>
      </PageHeading>
      <section className="empty-panel">
        <LockKeyhole size={30} aria-hidden="true" />
        <h2>Your workspace stays protected.</h2>
        <p>
          Client, worker and administrator pages are unavailable to all sessions in this preview. No
          phone number is collected, no code is sent, and no access can be granted here.
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

import Link from "next/link";
import { PageHeading } from "@/features/auth/page-heading";
export default function Forbidden() {
  return (
    <>
      <PageHeading eyebrow="Access unavailable" title="This workspace needs additional permission.">
        <p>Account preferences and mode selection cannot grant administrator authority.</p>
      </PageHeading>
      <Link href="/auth/sign-in" className="text-link">
        Return to account
      </Link>
    </>
  );
}

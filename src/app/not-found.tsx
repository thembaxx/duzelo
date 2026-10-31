import Link from "next/link";
import { PageHeading } from "@/components/layout/page-heading";
import { buttonVariants } from "@/components/ui/button";
export default function NotFound() {
  return (
    <>
      <PageHeading eyebrow="404 · Not found" title="That page isn’t here.">
        <p>It may have moved, or it may not be part of this release.</p>
      </PageHeading>
      <Link href="/" className={buttonVariants()}>
        Back to home
      </Link>
    </>
  );
}

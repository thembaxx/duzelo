import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { buttonVariants } from "@/components/ui/button";
export const metadata: Metadata = { title: "Explore" };
export default function ExplorePage() {
  return (
    <>
      <PageHeading eyebrow="Nearby, when we’re ready" title="Local discovery is on its way.">
        <p>The pilot will start in Piet Retief / Mkhondo and surrounding communities.</p>
      </PageHeading>
      <section className="empty-panel">
        <Compass size={32} aria-hidden="true" />
        <h2>A local network takes real people.</h2>
        <p>
          Worker search, maps and matching are not available yet. We won’t fill this space with
          invented profiles or ask for your location before discovery is ready.
        </p>
        <p>
          You can explore the planned service categories and learn how requests and quotes will
          work.
        </p>
        <div className="inline-actions">
          <Link href="/services" className={buttonVariants()}>
            Explore service categories
          </Link>
          <Link href="/how-it-works" className={buttonVariants({ variant: "outline" })}>
            How it works
          </Link>
        </div>
      </section>
    </>
  );
}

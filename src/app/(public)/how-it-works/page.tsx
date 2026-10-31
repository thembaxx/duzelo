import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export const metadata: Metadata = { title: "How it works" };
export default function HowItWorksPage() {
  return (
    <>
      <PageHeading eyebrow="A better everyday, together" title="From “needs doing” to done.">
        <p>
          Here’s the planned journey. Requests, quotes and bookings will open in later releases.
        </p>
      </PageHeading>
      <div className="info-grid">
        <Card className="content-card">
          <Badge variant="outline">For clients · planned</Badge>
          <h2>Find the right help.</h2>
          <p>
            Browse manually reviewed workers or describe a job to receive relevant local quotes.
            Review the scope and price, then request a booking.
          </p>
          <p>
            The worker must confirm before the booking is agreed. Completion, reviews and payments
            will have separate, clear statuses.
          </p>
          <Link href="/services" className="text-link">
            Explore planned services ↗
          </Link>
        </Card>
        <Card className="content-card" id="workers">
          <Badge variant="outline">For workers · planned</Badge>
          <h2>Bring your skills closer.</h2>
          <p>
            Individuals and service-business owners will be able to set up a profile, describe
            services and choose a private base and coverage area.
          </p>
          <p>
            Manual identity and relevant trade/business review will be required before publication.
            You won’t be able to approve your own profile.
          </p>
          <Link href="/auth/sign-in?workspace=worker" className="text-link">
            Check account availability ↗
          </Link>
        </Card>
      </div>
      <section className="prose-block mt-8">
        <h2>One person. Both sides.</h2>
        <p>
          One account will support client and worker capabilities. Switching the view will never
          grant extra permissions. The pilot is planned to be free, with no subscriptions, lead
          charges or commissions.
        </p>
        <Link href="/trust" className="text-link">
          Read our trust and privacy approach ↗
        </Link>
      </section>
    </>
  );
}

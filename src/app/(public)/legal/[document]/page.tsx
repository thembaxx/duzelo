import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
const documents = {
  privacy: {
    title: "Privacy",
    body: "This preview does not collect account details, job information or location. No analytics or advertising trackers are configured. Standard hosting request logs may still exist. A service worker stores only a generic offline page on your device, which you can remove through your browser’s site-data settings. Before accounts open, full privacy disclosures, responsible-party contact details, lawful processing grounds, retention and data-access procedures must be reviewed and published.",
  },
  terms: {
    title: "Terms",
    body: "This preview is for viewing the marketplace foundation. It does not accept job requests, confirm bookings, approve workers or process payments. The working name and service plans are provisional. Full marketplace terms covering service relationships, consent, cancellations, disputes and consumer rights require South African legal review before the pilot opens.",
  },
};
function getDocument(slug: string) {
  return slug === "privacy" || slug === "terms" ? documents[slug] : null;
}
export function generateStaticParams() {
  return [{ document: "privacy" }, { document: "terms" }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string }>;
}): Promise<Metadata> {
  return { title: getDocument((await params).document)?.title ?? "Not found" };
}
export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const document = getDocument((await params).document);
  if (!document) notFound();
  return (
    <div className="reading-layout">
      <PageHeading eyebrow="Preview notice · pending legal review" title={document.title}>
        <p>
          This is a limited preview notice, not the final marketplace policy or a compliance
          certification.
        </p>
      </PageHeading>
      <section className="prose-block">
        <h2>About this release</h2>
        <p>{document.body}</p>
      </section>
    </div>
  );
}

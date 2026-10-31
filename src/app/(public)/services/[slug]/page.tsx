import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { findService, services } from "@/features/services/catalog";
export function generateStaticParams() {
  return services.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const service = findService((await params).slug);
  return { title: service?.name ?? "Service not found" };
}
export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const service = findService((await params).slug);
  if (!service) notFound();
  const Icon = service.icon;
  return (
    <>
      <Link className="text-link mb-6" href="/services">
        <ArrowLeft size={16} aria-hidden="true" />
        All services
      </Link>
      <PageHeading eyebrow="Planned service category" title={service.name}>
        <p>{service.description}. We’re preparing the pilot in Piet Retief / Mkhondo.</p>
      </PageHeading>
      <section className="empty-panel">
        <Icon size={30} aria-hidden="true" />
        <h2>Listings aren’t open yet.</h2>
        <p>
          There are no published worker profiles to browse in this foundation release. Profiles will
          only be listed after manual review. No location has been requested or saved.
        </p>
        <div className="inline-actions">
          <Link href="/how-it-works" className={buttonVariants()}>
            How the marketplace will work
          </Link>
          <Link href="/trust" className={buttonVariants({ variant: "outline" })}>
            Read our trust approach
          </Link>
        </div>
      </section>
    </>
  );
}

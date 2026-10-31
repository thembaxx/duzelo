import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { findServiceCategory, serviceCategories } from '@/lib/services';

export function generateStaticParams() {
  return serviceCategories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = findServiceCategory(slug);
  return category ? {
    title: category.name + ' services — Mkhondo',
    description: category.summary + ' Browse Duzelo service-category previews; real bookings are not open.',
    alternates: { canonical: '/services/' + category.slug },
  } : { title: 'Service not found', robots: { index: false, follow: false } };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = findServiceCategory(slug);
  if (!category) notFound();

  return (
    <section className="shell inner-page detail-page">
      <Link href="/services" className="breadcrumb">← All services</Link>
      <p className="eyebrow">SERVICE CATEGORY / {category.number}</p>
      <h1 className="inner-heading">{category.name}<span className="highlight-period">.</span></h1>
      <p className="inner-lede">{category.summary}</p>
      <div className="detail-grid">
        <div className="detail-panel">
          <h2>Common requests</h2>
          <ul className="example-list">{category.examples.map((example) => <li key={example}><span aria-hidden>↗</span>{example}</li>)}</ul>
        </div>
        <div className="detail-panel tinted-panel">
          <p className="eyebrow">LAUNCH STATUS</p>
          <h2>We're getting ready.</h2>
          <p>No workers are available to book through Duzelo yet. We won’t show invented profiles, ratings or prices while the marketplace is being built.</p>
          <Link href="/explore" className="text-link">Explore more categories <span aria-hidden>↗</span></Link>
        </div>
      </div>
    </section>
  );
}

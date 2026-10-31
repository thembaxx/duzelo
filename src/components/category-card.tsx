import Link from 'next/link';
import type { ServiceCategory } from '@/lib/services';

export function CategoryCard({ category }: { category: ServiceCategory }) {
  return (
    <Link href={'/services/' + category.slug} className="category-card">
      <span className="category-number">{category.number} / SERVICES</span>
      <span className="category-card-main">
        <span className="category-title">{category.name}</span>
        <span className="category-arrow" aria-hidden>↗</span>
      </span>
      <span className="category-summary">{category.summary}</span>
    </Link>
  );
}

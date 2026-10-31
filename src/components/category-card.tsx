import Link from "next/link";
import {
  ArrowUpRight,
  Broom,
  Drop,
  Flower,
  Lightning,
  PaintBrush,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import type { ServiceCategory } from "@/lib/services";

const categoryIcons = {
  "home-repairs": Wrench,
  plumbing: Drop,
  electrical: Lightning,
  cleaning: Broom,
  gardening: Flower,
  painting: PaintBrush,
} as const;

export function CategoryCard({ category }: { category: ServiceCategory }) {
  const Glyph = categoryIcons[category.slug as keyof typeof categoryIcons] ?? Wrench;
  return (
    <Link href={"/services/" + category.slug} className="category-card">
      <span className="category-card-top">
        <span className="category-icon">
          <Glyph size={28} weight="regular" aria-hidden="true" />
        </span>
        <span className="category-number">{category.number} / 06</span>
      </span>
      <span className="category-card-main">
        <span className="category-title">{category.name}</span>
        <span className="category-arrow">
          <ArrowUpRight size={22} weight="bold" aria-hidden="true" />
        </span>
      </span>
      <span className="category-summary">{category.summary}</span>
    </Link>
  );
}

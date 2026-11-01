import { discoveryConfig } from "@/features/discovery/config";
import { discoveryOptions, searchWorkers } from "@/features/discovery/queries";
import { Discovery } from "@/features/discovery/discovery.client";
import { searchSchema } from "@/features/discovery/schema";
import "@/features/discovery/discovery.css";
export const dynamic = "force-dynamic";
import Link from "next/link";
import type { Metadata } from "next";
import { CategoryCard } from "@/components/category-card";
import { ServiceSearch } from "@/components/service-search";
import { searchServiceCategories } from "@/lib/services";

export const metadata: Metadata = { title: "Explore local services" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  if (discoveryConfig()) {
    const options = await discoveryOptions();
    const category =
      typeof params.category === "string" &&
      options.categories.some((c) => c.id === params.category)
        ? params.category
        : (options.categories.find((c) => c.label.toLowerCase() === query.toLowerCase())?.id ??
          null);
    const town =
      typeof params.town === "string" && options.towns.some((t) => t.id === params.town)
        ? params.town
        : null;
    const parsed = searchSchema.safeParse({
      categoryId: category,
      location: town ? { kind: "town", id: town } : null,
      radiusKm: Number(params.radius ?? 30),
      sort: params.sort ?? "name",
      available: params.available === "true",
      tradeReviewed: params.trade === "true",
      cursor: null,
    });
    const filters = parsed.success
      ? parsed.data
      : searchSchema.parse({
          categoryId: null,
          location: null,
          radiusKm: 30,
          sort: "name",
          available: false,
          tradeReviewed: false,
          cursor: null,
        });
    const initial = await searchWorkers(filters);
    return <Discovery options={options} initial={initial} initialFilters={filters} />;
  }
  const results = searchServiceCategories(query);
  return (
    <section className="shell inner-page">
      <p className="eyebrow">A PLACE TO BEGIN</p>
      <h1 className="inner-heading">
        Explore <em>local services.</em>
      </h1>
      <p className="inner-lede">
        Search service categories. Verified worker discovery and the interactive map are not yet
        available in this early build.
      </p>
      <div className="explore-search">
        <ServiceSearch defaultValue={query} />
      </div>
      <div className="results-heading">
        <h2>
          {results.length} {results.length === 1 ? "category" : "categories"}
          {query && " matching “" + query + "”"}
        </h2>
        {query && (
          <Link href="/explore" className="text-link">
            Clear search
          </Link>
        )}
      </div>
      {results.length ? (
        <div className="category-grid">
          {results.map((category) => (
            <CategoryCard category={category} key={category.slug} />
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <h3>No matching categories yet.</h3>
          <p>Try a broader search, such as cleaning, repairs or gardening.</p>
          <Link href="/explore" className="button button-primary">
            View all categories
          </Link>
        </div>
      )}
    </section>
  );
}

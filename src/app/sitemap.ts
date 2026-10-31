import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { serviceCategories } from "@/lib/services";
export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages: readonly [string, number][] = [
    ["/", 1],
    ["/services", 0.9],
    ["/explore", 0.8],
    ["/how-it-works", 0.7],
    ["/trust", 0.7],
  ];
  return [
    ...publicPages.map(([path, priority]) => ({
      url: SITE_URL + path,
      changeFrequency: "monthly" as const,
      priority,
    })),
    ...serviceCategories.map((service) => ({
      url: SITE_URL + "/services/" + service.slug,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}

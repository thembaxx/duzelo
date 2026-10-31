import { serviceCategories, type ServiceCategory } from "./services";

export type ServiceGroup = "all" | "home" | "outdoors";

const HOME_SLUGS = new Set(["home-repairs", "plumbing", "electrical", "cleaning", "painting"]);
const OUTDOOR_SLUGS = new Set(["gardening", "painting", "home-repairs"]);

export const serviceGroups = [
  { id: "all", label: "All services" },
  { id: "home", label: "Around the home" },
  { id: "outdoors", label: "Outside & garden" },
] as const satisfies readonly { id: ServiceGroup; label: string }[];

export function filterServiceCategories(group: ServiceGroup): ServiceCategory[] {
  if (group === "all") return [...serviceCategories];
  const selected = group === "home" ? HOME_SLUGS : OUTDOOR_SLUGS;
  return serviceCategories.filter((category) => selected.has(category.slug));
}

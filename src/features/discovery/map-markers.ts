import { Marker, type Map as MapInstance } from "maplibre-gl";
import type { DiscoveryCard } from "./types";
export function workerMarkers(
  map: MapInstance,
  cards: DiscoveryCard[],
  onSelect: (slug: string) => void,
) {
  const groups = new globalThis.Map<string, DiscoveryCard[]>();
  for (const card of cards) {
    const key = card.point.longitude + ":" + card.point.latitude;
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  return [...groups.values()].map((group) => {
    const card = group[0]!;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "discovery-marker";
    button.textContent = String(group.length);
    button.setAttribute(
      "aria-label",
      `${group.length} reviewed ${group.length === 1 ? "worker" : "workers"} in ${card.town}. Show in list.`,
    );
    button.dataset.slugs = group.map((c) => c.slug).join(",");
    button.addEventListener("click", () => onSelect(card.slug));
    return new Marker({ element: button })
      .setLngLat([card.point.longitude, card.point.latitude])
      .addTo(map);
  });
}

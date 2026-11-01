import { Marker, type Map as MapInstance } from "maplibre-gl";
import type { DiscoveryCard } from "./types";
export function workerMarkers(
  map: MapInstance,
  groups: DiscoveryCard[][],
  onSelect: (slug: string) => void,
) {
  return groups.map((group) => {
    const card = group[0]!;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "discovery-marker";
    button.textContent = String(group.length);
    button.setAttribute(
      "aria-label",
      `${group.length} reviewed ${group.length === 1 ? "worker" : "workers"} in ${[...new Set(group.map((c) => c.town))].join(", ")} on this page. Show in list.`,
    );
    button.dataset.slugs = group.map((c) => c.slug).join(",");
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      button.focus({ preventScroll: true });
      onSelect(card.slug);
    });
    return new Marker({ element: button })
      .setLngLat([card.point.longitude, card.point.latitude])
      .addTo(map);
  });
}

export function highlightMarkers(markers: Marker[], selected: string | null) {
  for (const marker of markers) {
    const element = marker.getElement(),
      active = (element.dataset.slugs ?? "").split(",").includes(selected ?? "");
    element.classList.toggle("selected", active);
    element.setAttribute("aria-pressed", String(active));
  }
}

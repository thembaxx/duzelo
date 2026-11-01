import type { Map, StyleSpecification } from "maplibre-gl";
export async function applyMapStyle(map: Map, url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("STYLE");
  const next = (await response.json()) as StyleSpecification;
  if (next.version !== 8 || !next.sources || !Array.isArray(next.layers)) throw new Error("STYLE");
  if (signal.aborted) return;
  const camera = map.getCenter();
  map.setStyle({
    ...next,
    center: [camera.lng, camera.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  });
}

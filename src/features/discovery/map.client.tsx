"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Map as LibreMap, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { applyMapStyle } from "./map-style";
import "maplibre-gl/dist/maplibre-gl.css";
import { clusterPoints } from "./clusters";
import { workerMarkers, highlightMarkers } from "./map-markers";
import { coarsePoint, pointSchema, type Point } from "./schema";
import type { DiscoveryCard, DiscoveryOptions } from "./types";
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
export default function DiscoveryMap({
  cards,
  selected,
  center,
  config,
  onSelect,
  onPoint,
  placing,
  visible,
  sheetExpanded,
}: {
  cards: DiscoveryCard[];
  selected: string | null;
  center: Point | null;
  config: DiscoveryOptions["map"];
  onSelect: (slug: string) => void;
  onPoint: (point: Point) => void;
  placing: boolean;
  visible: boolean;
  sheetExpanded: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    map = useRef<LibreMap | null>(null),
    markers = useRef<Marker[]>([]),
    pin = useRef<Marker | null>(null);
  const callbacks = useRef({ onSelect, onPoint, placing, selected });
  callbacks.current = { onSelect, onPoint, placing, selected };
  const { resolvedTheme } = useTheme(),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const style = resolvedTheme === "dark" && config.dark ? config.dark : config.light;
  const styleRef = useRef(style);
  styleRef.current = style;
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!root.current || !config.light) return;
    let instance: LibreMap;
    try {
      instance = new LibreMap({
        container: root.current,
        style: styleRef.current!,
        center: center ? [center.longitude, center.latitude] : [30.8, -27.0],
        zoom: center ? 10 : 5,
        maxBounds: [
          [16, -35],
          [33, -22],
        ],
        attributionControl: { compact: false },
        cooperativeGestures: true,
      });
      map.current = instance;
      instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
      instance.on("load", () => {
        setReady(true);
        setError("");
      });
      instance.on("error", () =>
        setError("Map content could not load. The worker list remains available."),
      );
      instance.on("click", (event) => {
        if (callbacks.current.placing) {
          const point = pointSchema.safeParse({
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
          });
          if (point.success) callbacks.current.onPoint(coarsePoint(point.data));
        }
      });
      instance.on("webglcontextlost", () =>
        setError("Map graphics are unavailable. Use the worker list."),
      );
    } catch {
      setError("This browser cannot display the map. Use the worker list and manual coordinates.");
    }
    return () => {
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      pin.current?.remove();
      pin.current = null;
      map.current = null;
      setReady(false);
      instance?.remove();
    };
    // One map instance survives filters, selection and theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.light, retry]);
  useEffect(() => {
    if (!map.current || !ready || !style) return;
    const instance = map.current,
      controller = new AbortController();
    async function updateStyle() {
      try {
        await applyMapStyle(instance, style!, controller.signal);
      } catch {
        if (!controller.signal.aborted)
          setError(
            "The requested map style could not load. The previous map and worker list remain available.",
          );
      }
    }
    void updateStyle();
    return () => controller.abort();
  }, [style, ready]);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    let signature = "";
    function refresh() {
      const groups = clusterPoints(cards, (point) =>
        instance!.project([point.longitude, point.latitude]),
      );
      const next = JSON.stringify(groups.map((g) => g.map((c) => c.slug)));
      if (next === signature) return;
      signature = next;
      markers.current.forEach((marker) => marker.remove());
      markers.current = workerMarkers(instance!, groups, (slug) =>
        callbacks.current.onSelect(slug),
      );
      highlightMarkers(markers.current, callbacks.current.selected);
    }
    refresh();
    instance.on("zoomend", refresh);
    return () => {
      instance.off("zoomend", refresh);
    };
  }, [cards, ready]);
  useEffect(() => {
    highlightMarkers(markers.current, selected);
    const card = cards.find((c) => c.slug === selected),
      instance = map.current;
    if (
      card &&
      instance &&
      !instance.getBounds().contains([card.point.longitude, card.point.latitude])
    )
      instance.jumpTo({ center: [card.point.longitude, card.point.latitude] });
  }, [selected, cards, ready]);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || !center) return;
    instance.jumpTo({ center: [center.longitude, center.latitude] });
    if (!pin.current) {
      const element = document.createElement("span");
      element.className = "discovery-search-pin";
      element.setAttribute("aria-hidden", "true");
      pin.current = new Marker({ element, draggable: true })
        .setLngLat([center.longitude, center.latitude])
        .addTo(instance);
      pin.current.on("dragend", () => {
        const position = pin.current!.getLngLat(),
          point = pointSchema.safeParse({ longitude: position.lng, latitude: position.lat });
        if (point.success) callbacks.current.onPoint(coarsePoint(point.data));
      });
    }
    pin.current.setLngLat([center.longitude, center.latitude]);
  }, [center, ready]);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || !root.current) return;
    function layout() {
      const mobile = window.matchMedia("(max-width:767px)").matches;
      instance!.setPadding({
        top: 44,
        bottom: mobile ? instance!.getContainer().clientHeight * (sheetExpanded ? 0.7 : 0.34) : 44,
        left: 12,
        right: 12,
      });
      instance!.resize();
    }
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [sheetExpanded, ready]);
  useEffect(() => {
    if (visible) map.current?.resize();
  }, [visible]);
  return (
    <div className="discovery-map-shell">
      <div
        ref={root}
        className="discovery-map"
        role="region"
        aria-label="Approximate town markers; equivalent worker list below"
        data-ready={ready}
      />
      {!ready && !error && (
        <p className="map-status" role="status">
          Loading the map…
        </p>
      )}
      {error && (
        <div className="map-status" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setError("");
              setRetry((n) => n + 1);
            }}
          >
            Retry map
          </button>
        </div>
      )}
      {config.fixture ? (
        <p className="map-credit">Synthetic local map · CC0 · Not a geographic basemap</p>
      ) : (
        <p className="map-credit">
          <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">
            © MapTiler
          </a>{" "}
          ·{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap contributors
          </a>
        </p>
      )}
      {resolvedTheme === "dark" && !config.dark && (
        <p className="map-theme-notice">
          No dark map style is configured. Keeping the readable licensed light map.
        </p>
      )}
    </div>
  );
}

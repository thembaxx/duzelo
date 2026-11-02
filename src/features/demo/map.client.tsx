"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Map as LibreMap, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { ArrowUpRight, Crosshair, MapTrifold, Star } from "@phosphor-icons/react";
import { applyMapStyle } from "@/features/discovery/map-style";
import { demoMoney, type DemoProvider } from "./catalogue";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
const center: [number, number] = [30.81, -27.007];
function resetCamera(instance: LibreMap) {
  instance.fitBounds(
    [
      [30.775, -27.035],
      [30.845, -26.975],
    ],
    {
      padding: { top: 50, right: 38, bottom: 135, left: 38 },
      maxZoom: 12.2,
      duration: 0,
    },
  );
}
export default function DemoMap({
  providers,
  selected,
  onSelect,
}: {
  providers: DemoProvider[];
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<LibreMap | null>(null),
    markers = useRef<Marker[]>([]);
  const callback = useRef(onSelect);
  callback.current = onSelect;
  const { resolvedTheme } = useTheme();
  const style = `https://tiles.openfreemap.org/styles/${resolvedTheme === "dark" ? "fiord" : "positron"}`;
  const styleRef = useRef(style);
  const appliedStyle = useRef<string | null>(null);
  styleRef.current = style;
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!host.current) return;
    let instance: LibreMap | undefined;
    const timeout = window.setTimeout(
      () =>
        setError(
          "The map is taking longer than expected. You can keep exploring providers in the list.",
        ),
      15000,
    );
    try {
      instance = new LibreMap({
        container: host.current,
        style: styleRef.current,
        center,
        zoom: 12.2,
        minZoom: 9,
        maxZoom: 15,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        cooperativeGestures: true,
        attributionControl: { compact: false },
        maxBounds: [
          [30.6, -27.2],
          [31, -26.8],
        ],
      });
      map.current = instance;
      appliedStyle.current = styleRef.current;
      instance
        .getCanvas()
        .setAttribute(
          "aria-label",
          "Demo neighbourhood map. Arrow keys pan; plus and minus zoom. Equivalent providers appear in the list.",
        );
      instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
      instance.on("load", () => {
        window.clearTimeout(timeout);
        if (instance) resetCamera(instance);
        setReady(true);
        setError("");
      });
      instance.on("error", () =>
        setError(
          "Some map content could not load. The provider list and booking demo are still available.",
        ),
      );
      instance.on("webglcontextlost", () =>
        setError("Map graphics are unavailable. Use the provider list to continue."),
      );
    } catch {
      window.clearTimeout(timeout);
      setError(
        "This browser cannot display the map. All sample providers are available in the list.",
      );
    }
    const observer = new ResizeObserver(() => instance?.resize());
    observer.observe(host.current);
    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      map.current = null;
      instance?.remove();
      setReady(false);
    };
  }, [retry]);
  useEffect(() => {
    if (!ready || !map.current || appliedStyle.current === style) return;
    const controller = new AbortController();
    void applyMapStyle(map.current, style, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) appliedStyle.current = style;
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "The map theme could not load. Your list, selection and current map are preserved.",
          );
      });
    return () => controller.abort();
  }, [style, ready]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    markers.current.forEach((m) => m.remove());
    markers.current = providers.map((p) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "demo-map-pin";
      button.textContent = demoMoney(Math.min(...p.services.map((s) => s.price)));
      button.setAttribute("aria-label", `Preview ${p.name}, sample price ${button.textContent}`);
      button.dataset.slug = p.slug;
      button.addEventListener("click", () => callback.current(p.slug));
      return new Marker({ element: button, anchor: "bottom" }).setLngLat(p.point).addTo(instance);
    });
    return () => {
      markers.current.forEach((m) => m.remove());
      markers.current = [];
    };
  }, [providers, ready]);
  useEffect(() => {
    markers.current.forEach((m) =>
      m.getElement().setAttribute("aria-pressed", String(m.getElement().dataset.slug === selected)),
    );
    const provider = providers.find((p) => p.slug === selected),
      instance = map.current;
    if (!provider || !instance || !ready) return;
    if (!instance.getBounds().contains(provider.point)) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        instance.jumpTo({ center: provider.point });
      else instance.easeTo({ center: provider.point, duration: 400 });
    }
  }, [selected, providers, ready]);
  const provider = providers.find((p) => p.slug === selected);
  return (
    <div className="demo-map-wrap">
      <div
        ref={host}
        className="demo-map"
        data-ready={ready}
        role="region"
        aria-label="Interactive demo map of Mkhondo"
      />
      {!ready && !error && (
        <div className="demo-map-loading" role="status">
          <MapTrifold size={32} aria-hidden="true" />
          Loading your neighbourhood…
        </div>
      )}
      {error && (
        <div className="demo-map-error" role="status">
          <p>{error}</p>
          <button
            type="button"
            className="demo-text-button"
            onClick={() => {
              setError("");
              setRetry((n) => n + 1);
            }}
          >
            Retry map
          </button>
        </div>
      )}
      {ready && (
        <button
          type="button"
          className="demo-map-reset"
          onClick={() => {
            if (map.current) resetCamera(map.current);
          }}
        >
          <Crosshair size={18} aria-hidden="true" /> Recenter
        </button>
      )}
      <div className="demo-map-preview" aria-live="polite">
        {provider ? (
          <>
            <span className={`demo-avatar demo-avatar-${provider.accent}`}>
              {provider.initials}
            </span>
            <div>
              <strong>{provider.name}</strong>
              <span>
                <Star size={13} weight="fill" aria-hidden="true" /> {provider.rating} sample rating
                · {provider.area}
              </span>
            </div>
            <Link href={`/demo/providers/${provider.slug}`} aria-label={`View ${provider.name}`}>
              <ArrowUpRight size={22} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <MapTrifold size={25} weight="duotone" aria-hidden="true" />
            <div>
              <strong>Around the corner, in the demo.</strong>
              <span>Tap a price to meet your next pair of hands.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

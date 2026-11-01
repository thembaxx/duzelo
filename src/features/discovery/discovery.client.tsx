"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useDiscoverySearch } from "./use-search";
import { DiscoveryFilters } from "./filters.client";
import { DiscoveryResults } from "./results.client";
import { AddressForm } from "./address-form.client";
import { coarsePoint, type SearchInput, type Point } from "./schema";
import type { DiscoveryOptions, SearchResult } from "./types";
const DiscoveryMap = dynamic(() => import("./map.client"), {
  ssr: false,
  loading: () => <p role="status">Preparing map controls…</p>,
});
export function Discovery({
  options: initialOptions,
  initial,
  initialFilters,
}: {
  options: DiscoveryOptions;
  initial: SearchResult;
  initialFilters: SearchInput;
}) {
  const [options, setOptions] = useState(initialOptions),
    state = useDiscoverySearch(initial, initialFilters),
    [view, setView] = useState<"list" | "map">("list"),
    [opened, setOpened] = useState(false),
    [expanded, setExpanded] = useState(false),
    [placing, setPlacing] = useState(false),
    [point, setPoint] = useState<Point | null>(initial.center);
  function openMap() {
    setOpened(true);
    setView("map");
  }
  function manualPoint(next: Point) {
    const point = coarsePoint(next);
    setPoint(point);
    state.setFilters((current) => ({ ...current, location: { kind: "coordinates", point } }));
  }
  function select(slug: string) {
    state.setSelected(slug);
    setExpanded(true);
    document
      .getElementById("worker-" + slug)
      ?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  const center = point ?? state.result.center;
  return (
    <section className="shell inner-page discovery-page">
      <p className="eyebrow">Good help, close to home.</p>
      <h1 className="inner-heading">
        Find the people <em>behind the work.</em>
      </h1>
      <p className="inner-lede">
        Browse manually reviewed profiles by town and service. Markers represent public town
        centres, never a worker’s private base. Scope and availability still need to be agreed;
        bookings are not open.
      </p>
      {options.local && (
        <p className="test-notice">
          Isolated local testing. Profiles are test records, not live workers.
        </p>
      )}
      <DiscoveryFilters
        options={options}
        value={state.filters}
        busy={state.busy}
        onChange={state.setFilters}
        onSearch={() => {
          setPoint(null);
          setPlacing(false);
          void state.apply();
        }}
        onPoint={setPoint}
        onMapPoint={() => {
          setPlacing(true);
          openMap();
        }}
      />
      {options.canSave && (
        <AddressForm
          onSaved={(saved) =>
            setOptions((current) => ({ ...current, saved: [...current.saved, saved] }))
          }
        />
      )}
      {placing && (
        <p role="status">
          Tap the map or drag the search pin to choose a point, then Apply filters. Manual
          coordinate inputs provide the same action without the map.
        </p>
      )}
      <div className="discovery-toolbar">
        <div role="group" aria-label="Discovery view">
          <button
            type="button"
            className="button button-secondary"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            List view
          </button>
          {options.map.light ? (
            <button
              type="button"
              className="button button-secondary"
              aria-pressed={view === "map"}
              onClick={openMap}
            >
              Map view
            </button>
          ) : (
            <p>Map tiles are not configured. List search and manual locations remain available.</p>
          )}
        </div>
        <a href="#worker-results" className="text-link">
          Skip to worker list
        </a>
      </div>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error} Previous results may be out of date.
        </p>
      )}
      <div className={"discovery-layout " + (view === "map" ? "with-map" : "list-only")}>
        {opened && (
          <div className="discovery-map-pane" hidden={view !== "map"}>
            <DiscoveryMap
              cards={state.result.workers}
              selected={state.selected}
              center={center}
              config={options.map}
              onSelect={select}
              onPoint={manualPoint}
              placing={placing}
              visible={view === "map"}
              sheetExpanded={expanded}
            />
          </div>
        )}
        <DiscoveryResults
          state={state}
          mapView={view === "map"}
          expanded={expanded}
          setExpanded={setExpanded}
          onSelect={select}
        />
      </div>
    </section>
  );
}

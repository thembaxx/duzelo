"use client";
import { useDiscoveryReady } from "./client-api";
import { LocationControls } from "./location.client";
import type { DiscoveryOptions } from "./types";
import type { SearchInput, Point } from "./schema";
export function DiscoveryFilters({
  options,
  value,
  busy,
  onChange,
  onSearch,
  onPoint,
  onMapPoint,
}: {
  options: DiscoveryOptions;
  value: SearchInput;
  busy: boolean;
  onChange: (next: SearchInput) => void;
  onSearch: () => void;
  onPoint: (point: Point) => void;
  onMapPoint: () => void;
}) {
  const ready = useDiscoveryReady();
  return (
    <form
      method="post"
      className="discovery-filters"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <div className="discovery-filter-row">
        <label>
          Service category
          <select
            aria-label="Service category"
            value={value.categoryId ?? ""}
            onChange={(e) => onChange({ ...value, categoryId: e.target.value || null })}
          >
            <option value="">All categories</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Approximate distance
          <select
            aria-label="Approximate distance"
            value={value.radiusKm}
            onChange={(e) => onChange({ ...value, radiusKm: Number(e.target.value) })}
          >
            {[5, 15, 30, 60, 100, 150].map((n) => (
              <option key={n} value={n}>
                Within about {n} km of a public town marker
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort workers
          <select
            aria-label="Sort workers"
            value={value.sort}
            onChange={(e) => onChange({ ...value, sort: e.target.value as SearchInput["sort"] })}
          >
            <option value="name">Name</option>
            <option value="distance">Approximate distance</option>
          </select>
        </label>
      </div>
      <div className="discovery-checks">
        <label className="choice">
          <input
            type="checkbox"
            checked={value.available}
            onChange={(e) => onChange({ ...value, available: e.target.checked })}
          />
          Open to enquiries
        </label>
        <label className="choice">
          <input
            type="checkbox"
            checked={value.tradeReviewed}
            onChange={(e) => onChange({ ...value, tradeReviewed: e.target.checked })}
          />
          Trade credential reviewed for this category
        </label>
      </div>
      <LocationControls
        options={options}
        location={value.location}
        onChange={(location) => {
          onChange({ ...value, location });
          if (location?.kind === "coordinates") onPoint(location.point);
        }}
        onMapPoint={onMapPoint}
      />
      <button type="submit" className="button button-primary" disabled={!ready || busy}>
        {busy ? "Searching…" : "Apply filters"}
      </button>
    </form>
  );
}

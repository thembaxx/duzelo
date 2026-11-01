"use client";
import { useRef, useState } from "react";
import { discoveryRequest } from "./client-api";
import type { Point } from "./schema";
import type { Place } from "./types";
export function GeocodeSearch({
  testProvider,
  onPoint,
}: {
  testProvider: boolean;
  onPoint: (point: Point) => void;
}) {
  const [query, setQuery] = useState(""),
    [places, setPlaces] = useState<Place[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const cache = useRef(new Map<string, { until: number; places: Place[] }>());
  async function find() {
    setBusy(true);
    setMessage("");
    try {
      const key = query.trim().toLocaleLowerCase(),
        prior = cache.current.get(key);
      const result =
        prior && prior.until > Date.now()
          ? prior.places
          : (await discoveryRequest<{ places: Place[] }>("geocode", { query })).places;
      // Personal in-memory cache only: no shared cache, URL, analytics or storage.
      if (!prior || prior.until <= Date.now())
        cache.current.set(key, { places: result, until: Date.now() + 300000 });
      if (cache.current.size > 20) cache.current.delete(cache.current.keys().next().value!);
      setPlaces(result);
      if (!result.length)
        setMessage("No places found. A rural or unnamed location can be placed manually.");
    } catch (error) {
      setPlaces([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "Address search failed. Choose a town or manual point.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="geocode-controls">
      <label>
        Town or address search
        <input value={query} maxLength={160} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <p>
        Search sends this text to {testProvider ? "the isolated test provider" : "MapTiler"}.
        Results are reused for up to five minutes and stay only in this page while it is open.
      </p>
      <button
        type="button"
        className="button button-secondary"
        disabled={busy || query.trim().length < 3}
        onClick={() => void find()}
      >
        {busy ? "Searching places…" : "Search places"}
      </button>
      <ul>
        {places.map((place, index) => (
          <li key={index}>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                onPoint(place.point);
                setPlaces([]);
                setMessage("Place selected. Apply filters to search.");
              }}
            >
              {place.label}
            </button>
          </li>
        ))}
      </ul>
      {message && <p role="status">{message}</p>}
      {!testProvider && (
        <p>
          <a href="https://www.maptiler.com/copyright/">© MapTiler</a> ·{" "}
          <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>
        </p>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { coarsePoint, pointSchema, type Point, type SearchLocation } from "./schema";
import { GeocodeSearch } from "./geocode-search.client";
import type { DiscoveryOptions } from "./types";
export function LocationControls({
  options,
  location,
  onChange,
  onMapPoint,
}: {
  options: DiscoveryOptions;
  location: SearchLocation | null;
  onChange: (location: SearchLocation | null) => void;
  onMapPoint: () => void;
}) {
  const [latitude, setLatitude] = useState(""),
    [longitude, setLongitude] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (location?.kind === "coordinates") {
      setLatitude(String(location.point.latitude));
      setLongitude(String(location.point.longitude));
    }
  }, [location]);
  function choosePoint(point: Point) {
    const safe = coarsePoint(point);
    setLatitude(String(safe.latitude));
    setLongitude(String(safe.longitude));
    onChange({ kind: "coordinates", point: safe });
  }
  function gps() {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Location is unsupported. Choose a town or enter a point manually.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const point = pointSchema.safeParse({
          longitude: p.coords.longitude,
          latitude: p.coords.latitude,
        });
        if (!point.success) {
          setBusy(false);
          setMessage(
            "Location is outside the supported area. Choose a South African town or enter a point manually.",
          );
          return;
        }
        choosePoint(point.data);
        setBusy(false);
        setMessage("Search area updated. Apply filters to search.");
      },
      () => {
        setBusy(false);
        setMessage(
          "Location was not shared. Choose a town or enter a point manually; you can retry.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 },
    );
  }
  function manual() {
    const point = pointSchema.safeParse({
      longitude: Number(longitude),
      latitude: Number(latitude),
    });
    if (!latitude.trim() || !longitude.trim() || !point.success) {
      setMessage("Enter South African coordinates: latitude −35 to −22, longitude 16 to 33.");
      return;
    }
    choosePoint(point.data);
    setMessage("Manual search area selected. Apply filters to search.");
  }
  return (
    <fieldset className="discovery-location">
      <legend>Search area</legend>
      <p>
        Location is optional. GPS is rounded to an approximate area before it is sent. Searches are
        not saved unless you explicitly save an address. Distance refers to the worker’s public
        town, not their home or driving time.
      </p>
      <label>
        Town
        <select
          aria-label="Town"
          value={location?.kind === "town" ? location.id : ""}
          onChange={(e) => onChange(e.target.value ? { kind: "town", id: e.target.value } : null)}
        >
          <option value="">All public areas</option>
          {options.towns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="button button-secondary" disabled={busy} onClick={gps}>
        {busy ? "Checking location…" : "Use my location"}
      </button>
      {options.saved.length > 0 && (
        <label>
          Saved address
          <select
            aria-label="Saved address"
            value={location?.kind === "saved" ? location.id : ""}
            onChange={(e) => {
              if (e.target.value) onChange({ kind: "saved", id: e.target.value });
            }}
          >
            <option value="">Choose a saved address</option>
            {options.saved.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} · {s.town}
              </option>
            ))}
          </select>
        </label>
      )}
      {options.geocoding && (
        <GeocodeSearch testProvider={options.geocoderTest} onPoint={choosePoint} />
      )}
      <details>
        <summary>Enter a point manually</summary>
        <p>
          Use your chosen search point for a farm or unnamed road. This does not disclose a worker’s
          private base.
        </p>
        <label>
          Search latitude
          <input
            inputMode="decimal"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
        </label>
        <label>
          Search longitude
          <input
            inputMode="decimal"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </label>
        <button type="button" className="button button-secondary" onClick={manual}>
          Use manual point
        </button>
        {options.map.light && (
          <button type="button" className="button button-secondary" onClick={onMapPoint}>
            Place a point on the map
          </button>
        )}
      </details>
      {location?.kind === "coordinates" && (
        <p>
          Selected search point: {location.point.latitude.toFixed(2)},{" "}
          {location.point.longitude.toFixed(2)}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </fieldset>
  );
}

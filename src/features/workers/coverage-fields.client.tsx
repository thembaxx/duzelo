"use client";
import { useState } from "react";
import { Button } from "@/features/auth/button";
import type { Catalog } from "./types";
export interface CoverageDraft {
  areaId: string;
  latitude: string;
  longitude: string;
  radiusKm: number;
  townIds: string[];
  travelFee: string;
}
export function CoverageFields({
  value,
  areas,
  onChange,
}: {
  value: CoverageDraft;
  areas: Catalog["areas"];
  onChange: (next: CoverageDraft) => void;
}) {
  const [error, setError] = useState(""),
    [locating, setLocating] = useState(false);
  function locate() {
    setError("");
    if (!navigator.geolocation) {
      setError("Location is unavailable. Enter your coordinates manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          ...value,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        });
        setLocating(false);
      },
      () => {
        setError("Location was not shared. Enter your coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  }
  return (
    <section className="worker-section">
      <h2>Where you work</h2>
      <p>
        Your exact base is private. Your public profile uses the selected town centre, never your
        base coordinates. Location permission is optional.
      </p>
      <label>
        Public town
        <select
          required
          value={value.areaId}
          onChange={(e) => onChange({ ...value, areaId: e.target.value })}
        >
          <option value="">Choose your public town</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="button" variant="outline" disabled={locating} onClick={locate}>
        {locating ? "Finding your location…" : "Use my location for my private base"}
      </Button>
      {error && <p role="alert">{error}</p>}
      <div className="worker-columns">
        <label>
          Private latitude
          <input
            required
            type="number"
            step="any"
            min={-35}
            max={-22}
            value={value.latitude}
            onChange={(e) => onChange({ ...value, latitude: e.target.value })}
          />
        </label>
        <label>
          Private longitude
          <input
            required
            type="number"
            step="any"
            min={16}
            max={33}
            value={value.longitude}
            onChange={(e) => onChange({ ...value, longitude: e.target.value })}
          />
        </label>
      </div>
      <p>
        For manual setup, enter your own base coordinates. Town selection alone does not set or
        disclose your exact base.
      </p>
      <label>
        Travel radius in kilometres
        <input
          required
          type="number"
          min={1}
          max={150}
          value={value.radiusKm}
          onChange={(e) => onChange({ ...value, radiusKm: Number(e.target.value) })}
        />
      </label>
      <fieldset>
        <legend>Towns you can serve</legend>
        {areas.map((a) => (
          <label key={a.id} className="choice">
            <input
              type="checkbox"
              checked={value.townIds.includes(a.id)}
              onChange={(e) =>
                onChange({
                  ...value,
                  townIds: e.target.checked
                    ? [...value.townIds, a.id]
                    : value.townIds.filter((id) => id !== a.id),
                })
              }
            />
            {a.label}
          </label>
        ))}
      </fieldset>
      <label>
        Possible travel fee in rand
        <input
          required
          inputMode="decimal"
          value={value.travelFee}
          onChange={(e) => onChange({ ...value, travelFee: e.target.value })}
        />
      </label>
      <p>Use 0 if you do not advertise a travel fee. Any fee must be agreed before work begins.</p>
    </section>
  );
}

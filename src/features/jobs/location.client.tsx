"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { coarsePoint, pointSchema, provinces } from "@/features/discovery/schema";
import type { JobFieldsProps } from "./fields.client";
import type { JobLocation } from "./schema";
const PinMap = dynamic(() => import("@/features/discovery/map.client"), {
  ssr: false,
  loading: () => <p role="status">Preparing point controls…</p>,
});
export function JobLocationFields({ data, update, options }: JobFieldsProps) {
  const manual = data.location?.kind === "manual" ? data.location : null;
  const [latitude, setLatitude] = useState(manual?.point ? String(manual.point.latitude) : ""),
    [longitude, setLongitude] = useState(manual?.point ? String(manual.point.longitude) : ""),
    [message, setMessage] = useState(""),
    [gpsBusy, setGpsBusy] = useState(false),
    [mapOpen, setMapOpen] = useState(false);
  const current = manual ?? {
    kind: "manual" as const,
    areaId: null,
    street: "",
    province: "" as const,
    notes: "",
    point: null,
    townOnly: false,
    consent: false,
  };
  function change(patch: Partial<Extract<JobLocation, { kind: "manual" }>>) {
    update({ location: { ...current, ...patch } });
  }
  function point(value: { latitude: number; longitude: number }) {
    change({ point: value, townOnly: false });
    setLatitude(String(value.latitude));
    setLongitude(String(value.longitude));
  }
  function gps() {
    if (!navigator.geolocation) {
      setMessage("Location is unsupported. Enter a point or use town-only matching.");
      return;
    }
    setGpsBusy(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const found = pointSchema.safeParse({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });
        setGpsBusy(false);
        if (!found.success) {
          setMessage("Choose a point within the supported South African area.");
          return;
        }
        point(found.data);
        setMessage("Point selected. It is stored only when you consent and save this request.");
      },
      () => {
        setGpsBusy(false);
        setMessage(
          "Location was not shared. Manual coordinates and town-only matching remain available.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 },
    );
  }
  return (
    <div className="job-location">
      <p>
        Only the public town is shown to invited workers. The exact point, street and access notes
        stay private until a confirmed booking or a separately approved inspection.
      </p>
      {options.saved.length > 0 && (
        <label>
          Use a saved private address
          <select
            value={data.location?.kind === "saved" ? data.location.id : ""}
            onChange={(e) => {
              if (e.target.value) update({ location: { kind: "saved", id: e.target.value } });
              else update({ location: { ...current } });
            }}
          >
            <option value="">Enter a job location</option>
            {options.saved.map((a) => (
              <option value={a.id} key={a.id}>
                {a.label} · {a.town}
              </option>
            ))}
          </select>
        </label>
      )}
      {data.location?.kind === "saved" ? (
        <p>
          The owner-authorized address will be copied privately when you save. Review the private
          snapshot before submitting.
        </p>
      ) : (
        <>
          <label>
            Public job town
            <select
              value={current.areaId ?? ""}
              onChange={(e) => change({ areaId: e.target.value || null })}
            >
              <option value="">Choose the nearest supported public town</option>
              {options.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="choice">
            <input
              type="checkbox"
              checked={current.townOnly}
              onChange={(e) =>
                change({
                  townOnly: e.target.checked,
                  ...(e.target.checked
                    ? { point: null, street: "", province: "" as const, notes: "" }
                    : {}),
                })
              }
            />
            Use town-only matching because my exact location is not known.
          </label>
          {current.townOnly ? (
            <p>
              Matching will be marked approximate. A worker must confirm coverage before any
              appointment is agreed.
            </p>
          ) : (
            <>
              <label>
                Private street or rural directions
                <input
                  value={current.street}
                  maxLength={160}
                  onChange={(e) => change({ street: e.target.value })}
                />
              </label>
              <label>
                Job province
                <select
                  value={current.province}
                  onChange={(e) => change({ province: e.target.value as typeof current.province })}
                >
                  <option value="">Choose province</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Private access notes
                <textarea
                  value={current.notes}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => change({ notes: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="button button-secondary"
                onClick={gps}
                disabled={gpsBusy}
              >
                {gpsBusy ? "Checking location…" : "Use my location for this request"}
              </button>
              <div className="job-two-columns">
                <label>
                  Private job latitude
                  <input
                    inputMode="decimal"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                </label>
                <label>
                  Private job longitude
                  <input
                    inputMode="decimal"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  const found = pointSchema.safeParse({
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                  });
                  if (!latitude.trim() || !longitude.trim() || !found.success) {
                    setMessage("Enter latitude −35 to −22 and longitude 16 to 33.");
                    return;
                  }
                  point(found.data);
                  setMessage(
                    "Manual point selected. Consent and save to keep it with this request.",
                  );
                }}
              >
                Use this private point
              </button>
              {current.point && (
                <p>
                  Selected private point: {current.point.latitude.toFixed(6)},{" "}
                  {current.point.longitude.toFixed(6)}
                </p>
              )}
              {options.map?.light && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setMapOpen((v) => !v)}
                >
                  {mapOpen ? "Hide point map" : "Place an approximate point on the map"}
                </button>
              )}
              {mapOpen && options.map && (
                <div className="job-pin-map">
                  <p>
                    The map receives a coarsened area. Placing or dragging the pin chooses an
                    approximate point; manual coordinate inputs provide the same control.
                  </p>
                  <PinMap
                    cards={[]}
                    selected={null}
                    center={current.point ? coarsePoint(current.point) : null}
                    config={options.map}
                    onSelect={() => {}}
                    onPoint={point}
                    placing
                    visible
                    sheetExpanded={false}
                    label="Choose a job point; manual coordinate inputs provide the same control"
                  />
                </div>
              )}
            </>
          )}
          <label className="choice">
            <input
              type="checkbox"
              checked={current.consent}
              onChange={(e) => change({ consent: e.target.checked })}
            />
            I choose to store this location privately with my job request.
          </label>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}

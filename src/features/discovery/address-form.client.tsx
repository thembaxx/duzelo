"use client";
import { useState, type FormEvent } from "react";
import { discoveryRequest, useDiscoveryReady } from "./client-api";
import type { DiscoveryOptions } from "./types";
export function AddressForm({
  onSaved,
}: {
  onSaved: (address: DiscoveryOptions["saved"][number]) => void;
}) {
  const ready = useDiscoveryReady();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const saved = await discoveryRequest<DiscoveryOptions["saved"][number]>("address", {
        label: String(data.get("label")),
        street: String(data.get("street")),
        town: String(data.get("town")),
        point: { latitude: Number(data.get("latitude")), longitude: Number(data.get("longitude")) },
        consent: data.get("consent") === "on",
      });
      onSaved(saved);
      form.reset();
      setError("Address saved privately. It is now available in the saved-address selector.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Address was not saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="discovery-save">
      <summary>Save a private address</summary>
      <p>
        Only your account can use this address. Exact coordinates and street details are stored
        privately; discovery uses only an approximate search area. This does not create a job or
        share the address with a worker.
      </p>
      <form onSubmit={submit} method="post" className="auth-form">
        <label>
          Address label
          <input name="label" required minLength={2} maxLength={60} />
        </label>
        <label>
          Private street or rural directions
          <input name="street" required minLength={3} maxLength={160} />
        </label>
        <label>
          Address town
          <input name="town" required minLength={2} maxLength={80} />
        </label>
        <label>
          Private address latitude
          <input name="latitude" type="number" step="any" min={-35} max={-22} required />
        </label>
        <label>
          Private address longitude
          <input name="longitude" type="number" step="any" min={16} max={33} required />
        </label>
        <label className="choice">
          <input type="checkbox" name="consent" required />I choose to save this private address for
          my account.
        </label>
        <button type="submit" className="button button-primary" disabled={!ready || busy}>
          {busy ? "Saving…" : "Save private address"}
        </button>
        {error && <p role="status">{error}</p>}
      </form>
    </details>
  );
}

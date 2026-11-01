"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/features/auth/button";
import { CoverageFields, type CoverageDraft } from "./coverage-fields.client";
import { ServiceFields } from "./service-fields.client";
import { workerRequest, useWorkerReady } from "./client-api";
import type { OwnerApplication } from "./types";
import type { WorkerDraft } from "./schema";
export function WorkerProfileForm({ initial }: { initial: OwnerApplication }) {
  const ready = useWorkerReady(),
    saved = initial.draft;
  const [profile, setProfile] = useState({
    displayName: saved?.displayName ?? "",
    bio: saved?.bio ?? "",
    kind: saved?.kind ?? "individual",
    businessName: saved?.businessName ?? "",
    registrationNumber: saved?.registrationNumber ?? "",
  });
  const [coverage, setCoverage] = useState<CoverageDraft>({
    areaId: saved?.areaId ?? "",
    latitude: saved ? String(saved.latitude) : "",
    longitude: saved ? String(saved.longitude) : "",
    radiusKm: saved?.radiusKm ?? 20,
    townIds: saved?.townIds ?? [],
    travelFee: saved?.travelFee ?? "0",
  });
  const [services, setServices] = useState<WorkerDraft["services"]>(
    saved?.services ?? [
      { categoryId: "", title: "", description: "", pricing: "quote", price: "" },
    ],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await workerRequest("profile", {
        ...profile,
        ...coverage,
        latitude: Number(coverage.latitude),
        longitude: Number(coverage.longitude),
        services,
      });
      window.location.assign("/app/worker/onboarding#evidence");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form method="post" className="auth-form worker-form" onSubmit={submit}>
      <section className="worker-section">
        <h2>Your public profile</h2>
        <p>
          Saving changes reopens review and takes your listing offline until it is reviewed again.
        </p>
        <label>
          Public display name
          <input
            required
            minLength={2}
            maxLength={80}
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
          />
        </label>
        <label>
          About your work
          <textarea
            required
            minLength={20}
            maxLength={600}
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
        </label>
        <fieldset>
          <legend>How you offer services</legend>
          <label className="choice">
            <input
              type="radio"
              name="provider-kind"
              checked={profile.kind === "individual"}
              onChange={() =>
                setProfile({
                  ...profile,
                  kind: "individual",
                  businessName: "",
                  registrationNumber: "",
                })
              }
            />
            Individual
          </label>
          <label className="choice">
            <input
              type="radio"
              name="provider-kind"
              checked={profile.kind === "business"}
              onChange={() => setProfile({ ...profile, kind: "business" })}
            />
            Business owner
          </label>
        </fieldset>
        {profile.kind === "business" && (
          <>
            <label>
              Business public name
              <input
                required
                minLength={2}
                maxLength={80}
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
              />
            </label>
            <label>
              Business registration number (private, if applicable)
              <input
                maxLength={60}
                value={profile.registrationNumber}
                onChange={(e) => setProfile({ ...profile, registrationNumber: e.target.value })}
              />
            </label>
            <p>The business owner uses this account. Employee dispatch is not available.</p>
          </>
        )}
      </section>
      <ServiceFields services={services} categories={initial.categories} onChange={setServices} />
      <CoverageFields value={coverage} areas={initial.areas} onChange={setCoverage} />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={!ready || busy} type="submit">
        {busy ? "Saving draft…" : "Save worker draft"}
      </Button>
    </form>
  );
}

"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/features/auth/button";
import { workerRequest, useWorkerReady } from "./client-api";
import { EvidenceAccess } from "./access-button.client";
import type { OwnerApplication } from "./types";
export function EvidencePanel({ application }: { application: OwnerApplication }) {
  const ready = useWorkerReady(),
    [kind, setKind] = useState("identity"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const categories = application.categories.filter((c) =>
    application.draft?.services.some((s) => s.categoryId === c.id),
  );
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget),
      file = form.get("file");
    if (!(file instanceof File)) {
      setError("Choose an image.");
      setBusy(false);
      return;
    }
    const body = new FormData();
    body.set("file", file);
    body.set(
      "metadata",
      JSON.stringify({
        kind,
        categoryId: kind === "trade" ? String(form.get("categoryId")) : null,
        caption: String(form.get("caption") ?? ""),
        consent: form.get("consent") === "on",
      }),
    );
    try {
      await workerRequest("upload", body);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload could not complete.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await workerRequest("submit", {
        revision: application.revision,
        consent: true,
      });
      window.location.assign(result.redirect ?? "/app/worker/verification");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission could not complete.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="evidence" className="worker-evidence">
      <section className="empty-panel" aria-label="Public profile preview">
        <p className="eyebrow">Preview · not public</p>
        <h2>
          {application.draft?.kind === "business"
            ? application.draft.businessName
            : application.draft?.displayName}
        </h2>
        <p>{application.draft?.bio}</p>
        <p>{application.areas.find((a) => a.id === application.draft?.areaId)?.label}</p>
        {application.draft?.services.map((service, index) => (
          <p key={index}>
            {service.title} ·{" "}
            {service.pricing === "quote"
              ? "Custom quote"
              : (service.pricing === "from" ? "From " : "") + "R " + service.price}
          </p>
        ))}
        <p>
          Review badges appear only after the required manual checks. Your exact base and identity
          evidence are excluded from the public profile.
        </p>
      </section>
      <h2>Evidence and photos</h2>
      {application.local && (
        <p className="test-notice">
          Local testing only. Use fictional sample images; do not upload a real identity document.
        </p>
      )}
      <p>
        Identity, business and trade images stay private. Your avatar and portfolio become public
        only after manual review. Images become inaccessible after {application.retentionDays} days;
        an approved operator removes expired files.
      </p>
      <p>
        JPEG or PNG photos only, up to 3 MB each. We remove image metadata before storage. PDFs and
        other formats are not accepted.
      </p>
      <form method="post" className="auth-form worker-form" onSubmit={upload}>
        <label>
          Image purpose
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="identity">Identity document</option>
            {application.draft?.kind === "business" && (
              <option value="business">Business evidence</option>
            )}
            {categories.some((c) => c.requiresTrade) && (
              <option value="trade">Trade credential</option>
            )}
            <option value="avatar">Public avatar</option>
            <option value="portfolio">Public portfolio</option>
          </select>
        </label>
        {kind === "trade" && (
          <label>
            Credential category
            <select name="categoryId" required>
              <option value="">Choose a trade category</option>
              {categories
                .filter((c) => c.requiresTrade)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label>
          Photo file
          <input name="file" type="file" accept="image/jpeg,image/png" required />
        </label>
        {["avatar", "portfolio"].includes(kind) && (
          <label>
            Public photo caption
            <input name="caption" maxLength={120} />
          </label>
        )}
        <label className="choice">
          <input name="consent" type="checkbox" required />I have permission to provide this image
          for the stated review or public-profile purpose.
        </label>
        <Button type="submit" disabled={!ready || busy}>
          {busy ? "Please wait…" : "Check and upload image"}
        </Button>
      </form>
      <div className="worker-assets" aria-label="Stored application images">
        {application.assets.length === 0 ? (
          <p>No images have been stored for this revision.</p>
        ) : (
          application.assets.map((a) => (
            <div key={a.id}>
              <p>
                {a.kind}
                {a.categoryId
                  ? " · " + application.categories.find((c) => c.id === a.categoryId)?.label
                  : ""}
                {a.caption ? " · " + a.caption : ""}
              </p>
              <EvidenceAccess assetId={a.id} label={a.kind} />
            </div>
          ))
        )}
      </div>
      <form method="post" className="auth-form worker-form" onSubmit={submit}>
        <h2>Ready for manual review?</h2>
        <p>
          Identity evidence is required. Business owners also need business evidence, and each
          regulated trade needs its own credential. Choosing worker mode does not approve any of
          these claims.
        </p>
        <label className="choice">
          <input type="checkbox" required />
          My profile, service scope and evidence are accurate, and I agree to manual review.
        </label>
        <Button type="submit" disabled={!ready || busy}>
          {busy ? "Submitting…" : "Submit application for review"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="form-error worker-error">
          {error}
        </p>
      )}
    </section>
  );
}

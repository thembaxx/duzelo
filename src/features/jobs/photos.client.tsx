"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useJobMutation, useJobsReady } from "./client-api";
import type { OwnerJob } from "./types";
export function JobPhotos({
  jobId,
  assets,
  onRefresh,
  onBusyChange,
}: {
  jobId: string;
  assets: OwnerJob["assets"];
  onRefresh: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const mutation = useJobMutation(),
    ready = useJobsReady(),
    [message, setMessage] = useState("");
  useEffect(() => {
    onBusyChange(mutation.busy);
  }, [mutation.busy, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);
  return (
    <section className="job-photos" aria-label="Request photos">
      <h3>Photos, if they help</h3>
      <p>
        Add up to eight JPEG or PNG photos, each no larger than 3 MB. Photos are scanned and
        location metadata is removed. Avoid faces, identity files, contact details and visible
        address signs.
      </p>
      <ul className="job-photo-list">
        {assets.map((a, i) => (
          <li key={a.id}>
            {a.state === "stored" ? (
              <Image
                unoptimized
                src={"/api/v1/jobs/media/" + a.id}
                width={320}
                height={220}
                alt={"Saved request photo " + (i + 1)}
              />
            ) : (
              <p>
                Photo {i + 1}:{" "}
                {a.state === "pending"
                  ? "Upload pending. Retry the original file or remove it."
                  : a.state === "expired"
                    ? "Photo expired. Remove it before submitting."
                    : "Removal pending. Retry removal."}
              </p>
            )}
            <button
              type="button"
              className="button button-secondary"
              disabled={mutation.busy}
              onClick={async () => {
                try {
                  await mutation.run("remove-photo", { jobId, assetId: a.id });
                  await onRefresh();
                  setMessage("Photo removed.");
                } catch {}
              }}
            >
              Remove photo {i + 1}
            </button>
          </li>
        ))}
      </ul>
      <form
        method="post"
        encType="multipart/form-data"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            body = new FormData(form),
            file = body.get("photo");
          if (!(file instanceof File) || !file.size) return;
          const upload = new FormData();
          upload.set("metadata", JSON.stringify({ jobId, consent: true }));
          upload.set("file", file);
          try {
            await mutation.run("upload", upload);
            await onRefresh();
            form.reset();
            setMessage("Photo checked and saved.");
          } catch {}
        }}
      >
        <label>
          Choose a request photo
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png"
            required
            disabled={assets.length >= 8}
          />
        </label>
        <label className="choice">
          <input type="checkbox" required />I choose to share this photo with eligible invited
          workers.
        </label>
        <button
          type="submit"
          className="button button-secondary"
          disabled={!ready || mutation.busy || assets.length >= 8}
        >
          {mutation.busy ? "Checking photo…" : "Upload photo"}
        </button>
      </form>
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

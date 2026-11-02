"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Attachment } from "@/features/messages/types";
import type { UploadTarget } from "@/features/messages/schema";
import { useCollaboration } from "./client-api";
export function Evidence({ assets, grantId }: { assets: Attachment[]; grantId?: string }) {
  return (
    <div className="work-photos">
      {assets.map((asset, i) => (
        <PrivateImage
          key={asset.id}
          asset={asset}
          label={"Evidence photo " + (i + 1)}
          grantId={grantId}
        />
      ))}
    </div>
  );
}
function PrivateImage({
  asset,
  label,
  grantId,
}: {
  asset: Attachment;
  label: string;
  grantId?: string;
}) {
  const api = useCollaboration(),
    [url, setUrl] = useState(""),
    object = useRef(""),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0);
  function clear() {
    generation.current++;
    if (object.current) URL.revokeObjectURL(object.current);
    object.current = "";
    if (timer.current) clearTimeout(timer.current);
    setUrl("");
  }
  useEffect(() => {
    window.addEventListener("pagehide", clear);
    return () => {
      window.removeEventListener("pagehide", clear);
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
      if (object.current) URL.revokeObjectURL(object.current);
    };
  }, []);
  async function open() {
    clear();
    const gen = generation.current;
    try {
      const data = await api.run<{ ticket: string; expiresAt: number }>("media-access", {
        assetId: asset.id,
        ...(grantId ? { grantId } : {}),
      });
      const response = await fetch("/api/v1/collaboration/media/" + asset.id, {
        headers: { "X-Duzelo-Asset-Ticket": data.ticket },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Photo access ended. Request a fresh view.");
      const blob = await response.blob();
      if (gen !== generation.current || data.expiresAt <= Date.now()) return;
      object.current = URL.createObjectURL(blob);
      setUrl(object.current);
      timer.current = setTimeout(clear, Math.max(0, data.expiresAt - Date.now()));
    } catch (e) {
      api.setError(e instanceof Error ? e.message : "Photo unavailable.");
    }
  }
  return (
    <div>
      {url ? (
        <>
          <Image unoptimized src={url} width={320} height={240} alt={label} />
          <button className="text-link" onClick={clear}>
            Close photo
          </button>
        </>
      ) : (
        <button
          className="button button-outline"
          disabled={!asset.available || api.busy}
          onClick={() => void open()}
        >
          {asset.available ? "View " + label.toLowerCase() : "Photo retention ended"}
        </button>
      )}
      {api.error && <p role="alert">{api.error}</p>}
    </div>
  );
}
export function EvidenceUpload({
  target,
  value,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  target: UploadTarget;
  value: string[];
  onChange: (ids: string[]) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const removal = useCollaboration();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    retry = useRef<{ file: File; key: string } | null>(null);
  async function upload(file: File) {
    setBusy(true);
    onBusyChange(true);
    setError("");
    const key = retry.current?.file === file ? retry.current.key : crypto.randomUUID();
    retry.current = { file, key };
    try {
      const form = new FormData();
      form.set("meta", JSON.stringify(target));
      form.set("file", file);
      const response = await fetch("/api/v1/collaboration/upload", {
          method: "POST",
          headers: { "Idempotency-Key": key },
          body: form,
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Upload failed.");
      onChange([...new Set([...value, String(data.assetId)])]);
      retry.current = null;
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Upload response could not be confirmed. Retry this photo."
          : e instanceof Error
            ? e.message
            : "Upload failed.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  async function remove(id: string) {
    onBusyChange(true);
    try {
      await removal.run("remove-photo", { assetId: id });
      onChange(value.filter((v) => v !== id));
    } catch {
    } finally {
      onBusyChange(false);
    }
  }
  return (
    <div>
      <label>
        Private evidence photo (JPEG or PNG, up to 3 MiB)
        <input
          type="file"
          accept="image/jpeg,image/png"
          disabled={disabled || busy || removal.busy || value.length >= 4}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </label>
      <p>
        {busy
          ? "Checking photo…"
          : value.length + " photos ready to attach. Unsent photos expire with retention."}
      </p>
      {value.map((id, i) => (
        <button
          key={id}
          type="button"
          className="text-link"
          disabled={disabled || busy || removal.busy}
          onClick={() => void remove(id)}
        >
          Remove unsent photo {i + 1}
        </button>
      ))}
      {removal.error && <p role="alert">{removal.error}</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <button
            disabled={disabled || busy || removal.busy}
            type="button"
            className="text-link"
            onClick={() => retry.current && void upload(retry.current.file)}
          >
            Retry photo upload
          </button>
        </>
      )}
    </div>
  );
}

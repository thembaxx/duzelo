"use client";
import { useState } from "react";
import { Button } from "@/features/auth/button";
import { workerRequest } from "./client-api";
export function EvidenceAccess({ assetId, label }: { assetId: string; label: string }) {
  const [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function request() {
    setBusy(true);
    setError("");
    setUrl("");
    try {
      const result = await workerRequest("document-access", { assetId });
      if (result.url) setUrl(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Access could not be requested.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="evidence-access">
      <Button type="button" variant="outline" disabled={busy} onClick={() => void request()}>
        {busy ? "Requesting access…" : `Request ${label} image`}
      </Button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
          Open {label} image · expires within 60 seconds
        </a>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}

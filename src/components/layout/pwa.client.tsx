"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function PwaStatus() {
  const [offline, setOffline] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    const updateNetwork = () => setOffline(!navigator.onLine);
    updateNetwork();
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const hadController = Boolean(navigator.serviceWorker.controller);
      let refreshing = false;
      const onControllerChange = () => {
        if (hadController && !refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      void navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          if (registration.waiting) setWaiting(registration.waiting);
          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            installing?.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller)
                setWaiting(registration.waiting);
            });
          });
        })
        .catch(() => {
          /* Site remains usable without installation/offline support. */
        });
      return () => {
        window.removeEventListener("online", updateNetwork);
        window.removeEventListener("offline", updateNetwork);
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      };
    }
    return () => {
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);
  if (!offline && !waiting) return null;
  return (
    <output className="connection-banner" aria-live="polite">
      {offline
        ? "You’re offline. Reconnect to open another page. No actions have been sent."
        : "An update is ready."}
      {waiting && !offline && (
        <Button size="sm" onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>
          Update now
        </Button>
      )}
    </output>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ArrowClockwise, DownloadSimple, WifiSlash, X } from "@phosphor-icons/react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaRuntime() {
  const [offline, setOffline] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onConnection = () => setOffline(!navigator.onLine);
    onConnection();
    window.addEventListener("online", onConnection);
    window.addEventListener("offline", onConnection);

    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);

    let didReload = false;
    const onController = () => {
      if (didReload) return;
      didReload = true;
      window.location.reload();
    };
    let unregisterFocus = () => {};
    if (
      "serviceWorker" in navigator &&
      (location.protocol === "https:" || location.hostname === "localhost")
    ) {
      navigator.serviceWorker.addEventListener("controllerchange", onController);
      void navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          if (registration.waiting && navigator.serviceWorker.controller)
            setWaiting(registration.waiting);
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller)
                setWaiting(worker);
            });
          });
          const refresh = () => {
            if (document.visibilityState === "visible" && navigator.onLine) {
              void registration.update().catch(() => {});
            }
          };
          window.addEventListener("focus", refresh);
          unregisterFocus = () => window.removeEventListener("focus", refresh);
        })
        .catch(() => {});
    }
    return () => {
      window.removeEventListener("online", onConnection);
      window.removeEventListener("offline", onConnection);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
      navigator.serviceWorker?.removeEventListener("controllerchange", onController);
      unregisterFocus();
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <div className="pwa-status-stack">
      {offline && (
        <div className="pwa-notice" role="status">
          <WifiSlash size={18} aria-hidden="true" />
          <span>Offline. Previously saved public pages may still work.</span>
        </div>
      )}
      {waiting && (
        <div className="pwa-notice" role="status">
          <ArrowClockwise size={18} aria-hidden="true" />
          <span>An update is ready.</span>
          <button type="button" onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>
            Refresh app
          </button>
        </div>
      )}
      {installPrompt && !dismissed && !waiting && (
        <div className="pwa-notice" role="status">
          <DownloadSimple size={18} aria-hidden="true" />
          <span>Install Duzelo</span>
          <button type="button" onClick={() => void install()}>
            Install
          </button>
          <button
            type="button"
            className="notice-dismiss"
            aria-label="Dismiss install prompt"
            onClick={() => setDismissed(true)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

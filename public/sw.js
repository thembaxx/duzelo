/* M00: cache one generic offline document only. No runtime/API/HTML/asset caching. */
const CACHE = "duzelo-offline-v1";
const OFFLINE = "/offline.html";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE, { cache: "reload" }))),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("duzelo-offline-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;
  // Protected pages and APIs never pass through an offline cache, including while offline.
  const sensitive = ["/app", "/admin", "/auth", "/api"];
  if (sensitive.some((path) => url.pathname === path || url.pathname.startsWith(path + "/")))
    return;
  // RSC/prefetch requests are not document navigations and are never cached.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE).then(
        (response) =>
          response ||
          new Response("Offline. Reconnect to continue.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          }),
      ),
    ),
  );
});

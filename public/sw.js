/* Duzelo public-only offline shell: no auth, API, or private caching. */
const REV = 'duzelo-shell-v5';
const PAGES = REV + '-pages';
const ASSETS = REV + '-assets';
const OFFLINE = '/offline';
const PREPARE = ['/', '/services', '/how-it-works', '/trust', OFFLINE];
const PRIVATE = /^\/(?:app(?:\/|$)|admin(?:\/|$)|onboarding(?:\/|$)|workers(?:\/|$)|explore(?:\/|$)|auth(?:\/|$)|api(?:\/|$))/;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(PAGES).then(async cache => {
    await Promise.allSettled(PREPARE.map(async path => {
      const response = await fetch(path, {cache: 'reload'});
      if (response.ok && response.type === 'basic' && !response.headers.has('set-cookie')) {
        await cache.put(path, response);
      }
    }));
    if (!await cache.match(OFFLINE)) throw new Error('Offline page not ready');
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key =>
      key.startsWith('duzelo-') && key !== PAGES && key !== ASSETS
    ).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
const canCache = response => response.ok && response.type === 'basic'
  && !response.headers.has('set-cookie')
  && !/private|no-store/i.test(response.headers.get('cache-control') || '');

async function publicNavigation(request, url) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (!url.search && canCache(response) && /text\/html/i.test(response.headers.get('content-type') || '')) {
      await cache.put(url.pathname, response.clone());
    }
    return response;
  } catch {
    const saved = url.search ? null : await cache.match(url.pathname);
    return saved || await cache.match(OFFLINE) ||
      new Response('Offline; reconnect to retry.', {status: 503});
  }
}
async function staticAsset(request) {
  const cache = await caches.open(ASSETS);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (canCache(response)) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    if (keys.length > 70) {
      await Promise.all(keys.slice(0, keys.length - 70).map(key => cache.delete(key)));
    }
  }
  return response;
}
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;
  if (request.mode === 'navigate' && !url.pathname.startsWith('/_next')) {
    event.respondWith(publicNavigation(request,url));
    return;
  }
  if (['script','style','font','image'].includes(request.destination)) {
    event.respondWith(staticAsset(request));
  }
});

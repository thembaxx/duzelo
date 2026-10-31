# Duzelo PWA, SEO and theme release checks

## Security and honesty
The service worker caches only public GET pages and static assets, never /api, /app, /auth, /admin, cookies, payments or verification documents. Offline is a real network state; loading skeletons never claim a fabricated percentage. The native install prompt is displayed only when the browser actually supports the beforeinstallprompt event. Updates are user initiated.

## Device QA to complete before shipping
- Chromium desktop: offline reload of visited public pages; shell from cached /offline; private routes never appear from cache.
- Android Chrome: install, standalone launch, maskable icon, safe-area insets, theme.
- iPhone Safari: Share > Add to Home Screen, icon and background, orientation and OS theme.
- Firefox: graceful use where install APIs are absent.
- Light/Dark/System and manual override update the browser theme-color; never flash white on dark startup.
- Check 320px and 390px widths, keyboard/VoiceOver focus, reduced motion and service worker updates.
- Evaluate Lighthouse as measured, not assumed. Keep auth and payments disabled.

## References
https://web.dev/learn/design/theming
https://web.dev/learn/pwa/
https://interfacelineage.com/

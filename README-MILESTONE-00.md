# Duzelo Milestone 00 — application foundation

This Next.js 16 App Router application is a **prelaunch public foundation**, not a working marketplace. It implements truthful public route scaffolding, service category search, responsive navigation, semantic light/dark/system colour themes (persisted with `next-themes`), and a short reduced-motion-safe GSAP hero entrance. The complete product requirements remain in `01_PRODUCT_REQUIREMENTS.md`.

## Local setup

- Node.js 22+ (Vercel project configured for Node 24), npm 10+.
- Run `npm ci` from this repository root using its committed `package-lock.json`.
- Run `npm run dev`, then open `http://localhost:3000`.
- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Test desktop/mobile browsers when Playwright runners are configured; no browser automation results are claimed solely from static files.

## Implemented

- Accessible public home, categories, category details, search, service explanation, trust, appearance settings, 404 and footer.
- `Light / Dark / System` via semantic tokens, keyboard controls, persistent browser storage and initial HTML theme bootstrap by `next-themes`. System follows device changes.
- Prefer-reduced-motion rules, GPU-friendly CSS transitions and a scoped `@gsap/react` hero intro that is not used in transactional routes.
- Server redirects protect `/app/client`, `/app/worker`, `/app/settings` and `/admin` until real session middleware and authorization are implemented. **These redirects are placeholders, not authentication.**
- SEO metadata with `robots: noindex` until launch, PWA manifest and provisional scalable icon.

## Not implemented (do not enable)

Supabase, phone OTP, background jobs, worker verification, map/matching, location sharing, quotes, messaging, admin, checkout, and booking. No profiles, ratings, reviews, real workers, payments or verified credential claims are live. Never remove the server redirects without a complete real authorization implementation and negative access tests.

## Open verification gates

Run first-build checks in a networked environment and inspect any Vercel deployment logs. After installing browser tooling, capture 390×844 and 1440×900 screenshots in both themes, verify no hydration warnings, focus and search functionality, and reduced-motion. Add PNG icons (192 and 512) and a carefully scoped offline service worker after the privacy/cache review; the SVG icon and manifest are scaffolding only, not a claim that installability/offline behavior is complete.

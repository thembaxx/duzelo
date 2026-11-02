# Populated production demo — verification

Implemented on 2026-11-02 at the founder's request: photo-led listings, motion, a real Mkhondo basemap and six months of fictional booking history. Architecture, data separation and image licences are in [PRODUCTION_DEMO.md](../../demo/PRODUCTION_DEMO.md). The demo is available at `/demo`; real marketplace capabilities keep their existing launch gates.

## Actual local outcomes

Node 24.19.0; existing pinned Next.js/React/TypeScript/MapLibre packages and lockfile unchanged. No new dependency was installed. Fresh `npm ci` and backend/native regression runs are delegated to the existing PR CI jobs; they are not claimed as local runs.

| Command | Actual outcome |
| --- | --- |
| `npm run format` and `npm run format:check` | PASS, Oxfmt; final check covered 319 source/test files |
| `npm run lint` | PASS, Oxlint |
| `npm run typecheck` | PASS, Next route generation and strict TypeScript |
| `npm test` | PASS, 297 tests in 33 files after review; [actual output](review-unit.log) |
| `npm run build` | PASS, optimized production App Router build; [actual output](review-build.log) |
| `npm run test:public` | PASS, 15 browser tests after review, including desktop 1440×900 and mobile 390×844; 68.97 seconds; [actual output](review-public-browser.log) |
| `node scripts/check-boundaries.mjs` | PASS, client/server transitive import boundaries |
| `npm run test:db:static` | PASS, static contracts; does not substitute for pgTAP |
| `npm audit --audit-level=high` | PASS, zero reported vulnerabilities |
| `npm run security:check` | PASS, repository/browser pattern scan; local scan had no injected canary, CI supplies its existing canary |
| `NODE_USE_SYSTEM_CA=1 E2E_BASE_URL=http://127.0.0.1:3001 node scripts/demo-visual-check.mjs` | PASS; 25 page/viewport checks, 42 real OpenFreeMap requests with no HTTP failures, zero browser exceptions and all eight sample pins inside both map viewports; [JSON](visual-check.json), [actual output](review-real-map-visual.log) |
| Local hosted Supabase / full Docker integration stack | NOT RUN. No hosted seed or migration, no paid resources, no sensitive flag activation. Existing CI performs PostgreSQL and native auth regressions. |

The browser tests exercise search/category/sort, saves, profile service selection, a new booking, reload persistence, scripted conversation, rescheduling, arrival/work/client completion, sample rating, cancellation confirmation and focus return, history, reset, disabled storage, corrupted storage, map keyboard focus, theme retention and map failure fallback. They assert no real mutation API requests. Axe checks cover core demo pages in both themes and both target sizes, plus completed booking/message views and a narrow reduced-motion view. This is automated accessibility evidence, not a claim of exhaustive screen-reader or Safari testing.

CI's deterministic map style fixture intentionally avoids a public network dependency. The separate visual check used **real geographic tiles** and normal TLS without route interception. It checked widths 320, 390, 768, 1024 and 1440 for overflow on the homepage, discovery, profile, booking overview and booking detail. Positron and published Fiord basemaps retain their attribution. These maps are approximate examples, not tracking or navigation to real workers.

## Screenshots

Captured from the production build with Playwright, not mockups or edited images. Desktop files are exactly 1440×900; mobile files are 390×844. The map screenshots frame the scrolled list/map region; the remaining captures show the page top. Entrances were allowed to settle. Real basemap requests are included in the JSON record.

| View | Desktop | Mobile |
| --- | --- | --- |
| Public homepage | [PNG](../screenshots/demo-home-desktop.png) | [PNG](../screenshots/demo-home-mobile.png) |
| Demo discovery | [PNG](../screenshots/demo-discover-desktop.png) | [PNG](../screenshots/demo-discover-mobile.png) |
| Map and selected provider | [PNG](../screenshots/demo-map-desktop.png) | [PNG](../screenshots/demo-map-mobile.png) |
| Dark map | [PNG](../screenshots/demo-map-dark-desktop.png) | [PNG](../screenshots/demo-map-dark-mobile.png) |
| Sample provider | [PNG](../screenshots/demo-profile-desktop.png) | [PNG](../screenshots/demo-profile-mobile.png) |
| Booking workspace | [PNG](../screenshots/demo-bookings-desktop.png) | [PNG](../screenshots/demo-bookings-mobile.png) |
| Booking detail | [PNG](../screenshots/demo-booking-detail-desktop.png) | [PNG](../screenshots/demo-booking-detail-mobile.png) |

Visual inspection corrected a mobile copy-space issue, wrapped bottom navigation, the public mobile photo placement, map preview alignment, muted message contrast, native input sizing and map attribution background. The provider's low-contrast Dark preset was replaced by published Fiord. Initial failing checks were rerun after fixes; the final browser run above passed all fifteen tests.

## Release and limits

PR-specific install/backend/native CI outcomes, merge SHA, Vercel deployment ID and post-merge live checks are recorded in the PR release evidence. No passing deployment or CI status is inferred from a local build.

The sample workspace is browser-local, not a shared multi-device production account. Storage-disabled visitors can still explore during the current visit. Old sample dates remain tied to the original workspace until reset. Providers, reviews, experiences, prices, job history and messages are fictional. Photos are illustrative stock; final brand photography remains provisional. The external basemap has a usable list fallback. Real auth/worker approval/matching/booking/payment readiness remains subject to the approved hosted setup and policies.

[Review notes](REVIEW.md). Raw logs above only normalize terminal escapes, line endings and trailing whitespace.

Review regression coverage additionally includes midnight in Johannesburg for both booking and rescheduling, accepted-create navigation, immutable arrival-message schedules, saved-state load recovery, duplicate favourites, complete seeded review timelines, completion-date chart buckets and missing ResizeObserver fallback. The final real-map script waits for the applied style background to match the fetched Fiord style, checks it differs from light, and asserts no map error before recording dark evidence. Initial logs are retained separately from the review logs linked above.

# Interactive production demo

The founder explicitly requested a populated production demo with photos, motion, maps, listings and six months of booking history on 2026-11-02. This authorizes **labelled fictional sample data**, not fake marketplace claims or activation of real-world operations.

Open `/demo` from the public homepage or navigation. No account is required. Eight fictional providers span the six launch service categories. Sixteen service scopes, sample reviews and fourteen initial bookings cover the preceding 178 days plus upcoming visits. Dates use Africa/Johannesburg and initialize relative to the first visit or reset. Previously saved workspaces keep their original history until reset.

## Working interactions

- Search, category filters and sort share URL state; list and map use the same filtered catalogue.
- Keyboard-selectable price pins preview providers; map camera and selection survive a theme change.
- Save/unsave providers; open full service profiles and illustrative photos.
- Choose a service, future day and SAST start time to create a sample booking.
- Reschedule or cancel a confirmed visit; simulate arrival, work completion and client confirmation.
- Try scripted questions and sample replies; leave one bounded sample rating after completion.
- Revisit completed jobs or book a provider again; reset restores the sample workspace.

Browser state is versioned, schema-validated and limited to known sample IDs, dates, statuses and event kinds. No free-text personal information is collected. Corrupt state restores a fresh demo with a notice; blocked storage falls back to memory with a notice. Tabs synchronize using browser storage events (last saved workspace wins). The dataset is limited to 200 bookings and 80 events per booking; reset is always available.

`src/features/demo` imports no server auth, payment, database or real booking command. All demo mutations stay in React/browser storage. The service worker excludes `/demo` routes and map requests, and demo metadata is noindex. This does not bypass guards for `/app`, `/admin` or any real API. No Supabase data is seeded and no sensitive flags are changed.

## Maps

MapLibre GL JS 6.16.0 is already installed. The demo uses the documented public OpenFreeMap instance, which requires no registration, API key or paid resource. Official quick start: https://openfreemap.org/quick_start/ ; public-instance terms: https://openfreemap.org/ . Positron and Fiord styles, sprites, glyphs and tiles load directly from `https://tiles.openfreemap.org`. Its source attribution remains visible: OpenFreeMap, © OpenMapTiles, data from OpenStreetMap contributors (https://www.openstreetmap.org/copyright).

All markers are **invented, coarse service-area examples** around Mkhondo, unrelated to actual people, homes or worker bases. No geolocation, tracking, geocoding or routing is requested. Opening the map exposes the browser's network address to the map host, as disclosed in the demo. Maps have navigation controls, accessible marker buttons, an equivalent list, reduced-motion camera movement, timeout/error messages and retry. An external basemap is not an SLA-backed marketplace dependency; list/profile/booking functions remain usable if it fails. Real matching and the separate MapTiler production configuration remain unchanged and gated.

Official MapLibre reference consulted: https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/ and its cooperative gestures example. The existing bundled CSP-compatible worker pattern is reused.

The provider's Dark preset had low-contrast labels in browser inspection. The demo uses the published Fiord style for dark mode instead, preserving attribution, geometry and camera. This does not change the gated real-discovery map.

## Photography and motion

Seven locally vendored WebP service/home photographs use the Unsplash licence, inspected on 2026-11-02: https://unsplash.com/license . It grants download, copy, modification, distribution and commercial use, without required permission or attribution, excluding image resale and compiling a competing image service. No Unsplash API is used. Stock pictures illustrate services and do not identify or endorse the named fictional providers. No sample photograph claims to document actual work. Final brand imagery remains provisional.

| Local asset | Original image URL |
| --- | --- |
| `public/demo/home.webp` | https://images.unsplash.com/photo-1600210492486-724fe5c67fb0 |
| `public/demo/cleaning.webp` | https://images.unsplash.com/photo-1581578731548-c64695cc6952 |
| `public/demo/garden.webp` | https://images.unsplash.com/photo-1416879595882-3373a0480b5b |
| `public/demo/electrical.webp` | https://images.unsplash.com/photo-1621905251189-08b45d6a269e |
| `public/demo/plumbing.webp` | https://images.unsplash.com/photo-1585704032915-c3400ca199e7 |
| `public/demo/painting.webp` | https://images.unsplash.com/photo-1562259949-e8e7689d7828 |
| `public/demo/repairs.webp` | https://images.unsplash.com/photo-1505798577917-a65157d3320a |

Downloaded variants use `auto=format&fit=crop&w=1400&q=82&fm=webp`. Next Image provides responsive derivatives and lazy loading; only leading hero photography is prioritized. Public credits and the fictional-data explanation are at `/demo/about`.

Motion is scoped to entrances, filtered cards, selected steps, image reveals, button feedback and native dialogs. There is no scrolling hijack, continuous animation or animated dismissal of errors/status. CSS preference queries respond immediately to reduced motion; map camera changes use jumpTo under that preference. Themes use the existing semantic tokens and preserve state, focus and map identity. No new package or external animation runtime is installed.

Verification and release evidence: [production demo evidence](../evidence/production-demo/README.md).

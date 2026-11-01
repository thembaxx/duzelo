# ADR 0005 — coarse worker discovery and configured maps

Date: 2026-11-01. Milestone 04. Isolated implementation; production discovery remains OFF.

## Privacy and data boundary

Discovery searches **public town markers**, not `private.worker_coverage.base_point`. Applying a user-controlled radius or exact distance to a private base would create a triangulation oracle even if the displayed marker were blurred. Both spatial inclusion and distance ordering therefore use `worker_cards.approx_marker`, which publication already binds to an active curated town centroid. The UI explains that distance is approximate distance to a public area, not a home, service-coverage guarantee, travel time or appointment.

The invoker-only `private.search_worker_cards` function uses PostGIS geography, `ST_DWithin` and the existing public-marker GIST index. No browser RPC, view, definer privilege or browser write grant is added. Current reviewed application/evidence eligibility, unexpired card, active categories and suspension gates apply before a result is returned. Public fields are name/bio, curated town/marker, current category-specific badges, identity/business review, advertised availability, public avatar reference and a distance **band**. Exact worker coordinates, addresses, coverage records, registration, phone, document keys and raw evidence are excluded. No worker or inventory is seeded outside disposable tests.

The M01 publication function omitted `is_available`, so cards used its default `true` even when the worker setting was false. This migration copies the actual setting, backfills mismatches and adds a publication-lock-protected consistency trigger. Availability means open to enquiries; the UI never claims a confirmed appointment. Other verification/edit/publication rules remain M03's boundary.

Input accepts a curated town, an explicit coordinate point, an owner-authorized saved address, or no location. GPS is requested only by a tap and rounded to 0.01° before leaving the browser; the server snaps coordinates again. Saved precise addresses are resolved privately and rounded before discovery. Bounds are South Africa's approximate extent, not an administrative-boundary certification. No exact search point is put into an app URL, analytics, shared cache or durable search log. Only non-sensitive category/town/sort/radius/boolean filters appear in the URL. A signed pagination cursor contains a query hash, bounded offset and ten-minute deadline, never coordinates or address text; changed filters, tampering and expiry are rejected. Every page rechecks current eligibility.

## Maps and interaction

Pin **MapLibre GL JS 6.16.0**, BSD-3-Clause, verified against current npm metadata and official v6 documentation. It supports the repository's Node 24 / Next.js 16.4.3 / React 19.3.1 / TypeScript 7.0.2 toolchain without a React wrapper. Use named exports and the documented standalone module worker URL through `new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url)`. The production build emits its dependencies. Secret scanning now includes `.mjs`/`.cjs`, as well as JS/maps/JSON.

Map code loads only after Map view is selected. The list is complete without WebGL or tiles. Once opened, the map instance stays mounted while the view changes. Theme changes fetch/validate the configured style document before applying it, retaining camera, selection, public markers and list state. An absent dark variant retains the configured readable light style with a notice. A failed style fetch retains the prior map; tile/context errors show explicit retry/list feedback. Controls do not animate authoritative state.

Markers are drawn only from sanitized public points. Deterministic, zoom-aware clustering of at most twenty visible-page cards keeps button anchors apart; anchors remain actual curated public points. A stable cluster signature prevents needless DOM replacement and focus loss on camera/theme updates. Counts explicitly refer to the current page, and the list exposes every profile in a cluster. Selecting a list/card or marker highlights the corresponding group; user selection may reveal an offscreen public point. Search pins are separate, draggable and explicitly placeable on the map, with equivalent manual coordinate inputs. Coordinates must be set before adding a MapLibre marker.

Desktop uses a split pane. Mobile uses a bounded map with a draggable/keyboard-operable expand/collapse list sheet. Map padding reserves sheet space; persistent attribution sits above all sheet states. The list, selection and filters remain available during map failure. Fresh searches cancel older requests and ignore stale responses; failures retain previous results with an explicit stale-data notice. Mutable discovery HTML/API responses are `no-store`, and `/explore` is excluded from the public service-worker cache.

## Provider choice and caching

The first hosted adapter is **MapTiler Cloud**, with no account or key created by this work. Styles must be explicit HTTPS URLs on `api.maptiler.com/maps/.../style.json` with an approved licence flag. Light is required before a dark variant. Browser map keys are deliberately public read-only keys and must be referrer-restricted and budgeted in the provider account. There are no guessed default style URLs, public OSM tile endpoints, Nominatim autocomplete or implicit third-party geolocation.

Geocoding has a separate **server-only** key and explicit approval gate. It sends a query only on Search places, using `/geocoding/{encoded-query}.json`, `country=za`, English, limit five, `autocomplete=false` and bounded extent. Redirects are rejected, response reads are bounded at 64 KiB with a six-second timeout, and output is restricted to labels and coarsened valid points. Provider exceptions/keys/queries are not logged. Failure or no results always leaves town/manual setup usable, including rural and unnamed locations.

MapTiler's terms distinguish personal temporary caching from shared server map-content caching. The app does not proxy/cache tiles or keep shared geocoding results. A personal component-memory cache reuses up to twenty place searches for five minutes, without extending freshness on a cache hit; it ends with the page and never writes LocalStorage, IndexedDB or CacheStorage. Displayed input/results may remain visible while the page is open. Map/provider attribution remains visible, including for geocoding results when no map is open. This implementation is not legal approval of a provider plan.

M02's durable HMAC rate-budget mechanism bounds anonymous search to a shared pilot budget of 60/minute and geocoding to 20/minute, with an additional shared-origin ceiling. It does not trust spoofable forwarding headers or persist raw IP/search coordinates. These are conservative shared budgets, not per-person fairness guarantees; provider account quotas and later abuse controls are still required before hosting.

## Saved addresses

Saving requires a real verified native session, client capability, explicit consent and a same-origin bounded strict command. The transaction rechecks live session/suspension, serializes actor/key replay and owner limits, writes only that owner's `private.client_addresses`, and appends a redacted audit event. Province is an explicit one-of-nine selection, rather than silently assuming Mpumalanga for an arbitrary point. Concurrent identical requests write once; authority injection, cross-origin requests and revoked sessions are denied.

Only owner address ID, label and town reach the selector. Street and exact point stay private and are never sent to a worker or map provider by this saved-address search. Another owner's ID is denied regardless of its existence; an expired native session cannot replay a completed save or resolve saved coordinates. Maximum ten addresses. This slice implements create/select; correction/removal and account retention/export/deletion operations must be finished before a public pilot, alongside later address/job workflows. A saved address does not create a job, verify a property or authorize disclosure.

## Local fixtures and hosted gates

`DISCOVERY_ENABLED=false` is the default. Enabling it requires the M02 Auth and M03 review configuration; hosted mode also requires `DISCOVERY_POLICY_APPROVED=true`. Map and geocoder approvals/keys are independent, so real list/town/manual search can work without configured tiles/geocoding. No location matching or job dispatch is enabled.

Isolated tests use actual MapLibre/WebGL against a self-authored CC0 background, **explicitly not a geographic basemap**, plus a separate loopback HTTP provider that exercises the MapTiler response contract. Synthetic map/provider settings are rejected in hosted mode. Discovery SQL fixtures represent only read-model test data and make no Storage-upload or real-person approval claim; the existing M03 tests independently exercise native uploads, ClamAV and manual review. Test fixture code refuses non-loopback database/Auth settings. No hosted provider delivery, production key validity, paid quota or physical-phone frame-rate result is inferred from these tests.

## Sources checked

- [MapLibre GL JS introduction and bundler/Next.js setup](https://maplibre.org/maplibre-gl-js/docs/), [npm package](https://www.npmjs.com/package/maplibre-gl) and [6.16.0 source/license](https://github.com/maplibre/maplibre-gl-js/tree/v6.16.0): v6 named exports and separate module worker.
- [MapTiler geocoding API](https://docs.maptiler.com/cloud/api/geocoding/): endpoint, parameters and required MapTiler/OpenStreetMap attribution.
- [MapTiler Cloud terms](https://www.maptiler.com/terms/cloud/): personal temporary cache, attribution and restrictions on shared/server map-content caching. Operator must review the actual plan/use before activation.
- [Supabase PostGIS guide](https://supabase.com/docs/guides/database/extensions/postgis): geography, metres, GIST and `ST_DWithin`.
- [Supabase changelog](https://supabase.com/changelog): October timezone update does not affect these numeric SA coordinates; November 10 CBC cipher deprecation does not require weakening the existing modern TLS defaults.

## Migration and rollback

CLI-created `20261101071452_discovery_search.sql` extends reviewed M01–M03 migrations. Blueprint SQL remains untouched. Tests replay/reset only disposable unlinked local databases. There is no hosted migration to roll back. Disable discovery/provider flags to withdraw the application feature; keep any legitimately saved private addresses/audit history under approved retention rather than dropping private tables. Publication remains M03's controlled operation. Before hosting: review migration/restore, dedicate a Supabase project, approve privacy/provider scopes, restrict provider keys/quotas, and verify real licensed styles/geocoding and device performance. Stop before M05 jobs/matching.

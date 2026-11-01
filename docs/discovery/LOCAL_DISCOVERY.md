# Milestone 04 local discovery

Production discovery, Auth and worker approval remain OFF. Use an **unlinked disposable checkout**, Node 24 and sufficient Docker disk/RAM for the existing native Supabase/Storage/ClamAV stack. Never load test fixtures into hosted projects or supply real identity/address data.

Follow [worker review setup](../workers/LOCAL_REVIEW.md) to start the pinned local ClamAV scanner, then:

```sh
npm ci
npm run auth:start
npm run db:reset
npm run auth:env
npx --no-install playwright install chromium
npm run test:auth
```

The ignored mode-0600 local environment enables discovery, a CC0 synthetic map background and the loopback geocoder contract fixture. The test runner starts/stops the separate HTTP fixture automatically; it builds the real production app, scans browser assets against actual ephemeral server-secret canaries and runs desktop/mobile native scenarios. No live SMS, MapTiler or public OSM/Nominatim request is needed. MapLibre uses real software WebGL in CI, not a substituted map component.

For interactive development, start the optional synthetic geocoder in another terminal and then the app:

```sh
node scripts/discovery-fixture-server.mjs
# Separate terminal:
node --env-file=.env.auth-test node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Open http://127.0.0.1:3000/explore. An empty directory is real: only an actually published current profile can appear. To publish a fictional local profile, complete the M03 owner/evidence/independent-MFA-review flow. Native discovery tests additionally create explicitly synthetic SQL read-model fixtures for paging/filtering; those fixtures are not real contractors or uploaded documents and their creation is not a browser action.

Use List view without GPS, choose a curated town, or enter a point manually. Only the Use my location button requests permission. Town/radius, category, open-to-enquiries and category-specific trade filters act on the server; distances are bands around public town markers. A search does not confirm service coverage or appointment availability. Map view loads only on demand, and its markers/list selection stay synchronized. The mobile sheet can be dragged or expanded/collapsed by a button. A place search for `Fictional rural farm` exercises the isolated HTTP adapter; `Unavailable provider` exercises failure. The background is explicitly synthetic, not a street map.

A real native phone fixture can create/select a private saved address after signing in (`0820000001`–`0820000006`, code `123456`, no SMS). The save form explicitly collects private street/rural directions, province and point with consent. It creates only that owner's address; search resolves and coarsens it on the server. There is no job submission, address disclosure, booking or payment. Address correction/removal operations remain a pre-pilot requirement.

| POST `/api/v1/discovery/:action` | Boundary |
| --- | --- |
| `search` | Public approved/coarse DTOs; no GPS required, bounded radius/page, query-bound signed cursor |
| `geocode` | Explicit provider gate, bounded HTTP adapter, coarsened results, no shared result cache |
| `address` | Verified live owner session/client capability, consent, actor-bound idempotency/audit, max ten |

All accept bounded strict same-origin JSON. `address` requires a 16–128-character `Idempotency-Key`. Search and geocoding use conservative shared pilot budgets, with 429/Retry-After. Mutable pages/API are no-store and bypass public offline caching. Provider errors leave manual and list routes usable; previous results are labelled potentially stale on search failure.

Hosted settings are in `.env.example`: `DISCOVERY_ENABLED`, `DISCOVERY_POLICY_APPROVED`, licensed `MAP_STYLE_LIGHT_URL` / optional dark URL plus `MAP_LICENSE_APPROVED`, and separate `GEOCODING_PROVIDER_APPROVED` / private `MAPTILER_GEOCODING_KEY`. Public style keys must be read-only, referrer-restricted and budgeted. Synthetic settings must never be copied to hosted mode. Dedicated Supabase hosting, actual provider-plan/privacy approval, real styles/geocoding and physical-device performance are unresolved activation prerequisites, not results of local tests.

See [ADR 0005](../adr/0005-coarse-discovery.md) for precision/oracle prevention, architecture, provider sources, cache limits and rollback. Stop before M05.

# Milestone 04 — coarse discovery and map/list search

Implemented 2026-11-01 on merged M03 `402de41`. Duzelo's editorial identity, original mark, Geist typography, Light/Dark/System and public PWA remain in place. No dedicated hosted Supabase project, real worker inventory, live map/geocoding key, SMS/payment delivery or billed resource was provisioned.

## Result and scope

Reviewed profiles can be searched without granting GPS: use a curated town, explicit approximate point, manual rural placement or an owner-authorized saved address. Category, public-area distance, open-to-enquiries, category-specific trade review, sorting and signed pagination run on the server. The MapLibre map synchronizes selection with an equivalent accessible list, with a desktop split pane and mobile result sheet. Provider failure, unsupported WebGL, denied GPS and offline search retain a usable list/manual path and explicit error feedback.

Spatial inclusion and ordering use **published public town markers**, never private worker bases. Applying radius filters to private bases would create a triangulation oracle even with blurred displayed markers. Search coordinates are coarsened; precise saved addresses stay private. No booking, service-coverage guarantee, location matching, opportunity dispatch or payment is implemented. Production Auth, worker approval and discovery remain OFF.

## Verification record

[GitHub Actions run 41288735705](https://github.com/thembaxx/duzelo/actions/runs/41288735705), application implementation **`446b8454a77d5fb0d12b1b2f1dd4fa1aac257062`**, passed all three jobs. [ci-results.json](milestone-04/ci-results.json) records command steps and timestamps; selected redacted [application](milestone-04/ci-verify.log), [database](milestone-04/ci-database.log) and [native acceptance](milestone-04/ci-auth.log) logs preserve observed results. The following handoff adds documentation/evidence and test refinements (page settling after reload and checking the mobile outage sheet in the viewport); exact final PR-head checks must pass before merge.

Local logs in [milestone-04](milestone-04/) record the same final application implementation. The local Docker VFS lacks room for the complete native stack, so database/Auth/Storage/ClamAV execution was performed only on disposable GitHub runners. Static SQL checks are not a substitute for that execution.

| Command / environment | Observed local outcome |
| --- | --- |
| `npm run format:check` | Passed |
| `npm run lint` | Passed, included in `npm run check` |
| `npm run typecheck` | Passed, included in `npm run check` |
| `npm test` | **214 passed**, 21 files |
| `npm run test:db:static` | Passed, structural SQL checks only |
| `npm run build` — sensitive features OFF | Passed, included in `npm run check` |
| `node scripts/check-boundaries.mjs` | Passed, transitive client/server imports |
| `npm audit --audit-level=high` | Passed, **0 vulnerabilities** at execution |
| `npm run security:check` | Passed, 260 source files and 30 browser assets; no local canary supplied |
| `npm run test:public` | **8 passed**, desktop/mobile public production-browser scenarios |

| Native CI command | Observed outcome |
| --- | --- |
| `npm ci` — three fresh jobs | Passed; pinned lockfile reproduced |
| `npm run db:start`, `npm run db:reset` | Passed; fresh reviewed migration replay |
| `npm run db:test` | **140 pgTAP assertions**, 6 files, passed |
| `npm run db:concurrency` | Both publication/revocation races passed |
| `npm run db:advisors`, `npm run db:lint` | Passed; no security issues or application schema errors found |
| `npm run db:explain` | Existing private coverage probes and new public town-marker GIST probe passed |
| `npm run auth:start`, `npm run auth:env` | Passed; real local Supabase Auth/Storage and private ignored environment |
| `npm run test:auth` — healthy pinned ClamAV 1.5.4 | Auth/worker/discovery-enabled production build passed; three browser-secret scans passed; **8 full cases passed**, desktop + mobile |

The CI `verify` job also passed all formatting, lint, typecheck, 214 units, static SQL, boundaries, dependency audit, production build, canary scan and 8 public browser scenarios. Native cases cover the existing Auth/evidence flows and two complete discovery scenarios. Discovery assertions include 20+1 paging, scoped filters, denied/unsupported GPS, rural point coarsening, real WebGL, marker keyboard focus, theme paint/camera/selection, mobile overflow, sheet keyboard/drag state, axe list checks, actual HTTP 503 tiles, geocoder failure/cache/rate limits, offline stale results and cache exclusions. Real native OTP enables owner address creation/select; concurrent identical saves produce one ID/audit, cross-owner resolution/authority injection/cross-origin writes fail, and expired sessions cannot resolve or replay saved addresses.

Pattern and canary scans do not constitute a complete security audit. The native runner separately scans browser assets against its actual ephemeral rate-limit secret, private Storage key and inert server geocoding canary, including MapLibre's `.mjs` assets.

## Acceptance boundaries

- SQL and server schemas bound radius, coordinates, page size and cursors; private functions remain unavailable to browser roles. Publication copies actual availability instead of the legacy default `true`, backfills existing mismatches and guards consistency under the existing publication lock.
- Public data excludes worker base coordinates, private coverage, street/directions, phone, evidence paths and registration details. Saved address commands require explicit consent, a verified live owner session, client capability, strict same-origin JSON, a transaction, actor/key idempotency and redacted audit.
- Geocoding uses a fixed hosted adapter with bounded output/time, explicit submission and coarsened results. A personal RAM cache reuses results for five minutes without extending freshness on a hit. There is no shared result cache or durable query log. Shared pilot rate budgets fail with 429/Retry-After.
- MapLibre GL JS **6.16.0** is pinned after checking official v6 bundler/Next.js guidance and npm compatibility. Existing Next/React/TypeScript/Supabase versions are unchanged. Maps load on demand; explicit licensed light/dark styles preserve camera/selection, with readable light retained if no dark variant is configured. Attribution is visible above every mobile sheet state.
- Native discovery fixtures are fictional SQL read-model metadata, not real contractors or uploaded identity evidence. The existing M03 native cases independently exercise actual Storage, ClamAV and manual MFA review. The synthetic CC0 background is explicitly not a geographic basemap; a separate loopback HTTP fixture exercises the geocoding response contract. Both fixture settings are rejected in hosted mode.
- Mutable `/explore`, worker, Auth and API surfaces bypass public service-worker caching. Failed searches retain prior results labelled potentially stale. No public OSM tile service or Nominatim autocomplete is configured.

## Screenshots

Successful-run captures at the required viewport sizes use fictional names and an explicitly synthetic CC0 map. They contain no real person, address, cookie, signed URL, secret, trace or video. The four captures below were inspected for readability, overflow, attribution and privacy. They show selected viewport states rather than every interaction; the map uses software WebGL, not a real geographic basemap or physical phone.

| Surface | 390×844 | 1440×900 |
| --- | --- | --- |
| Dark map/list selection | [mobile](screenshots/discovery-map-mobile.png) | [desktop](screenshots/discovery-map-desktop.png) |
| Equivalent accessible list | [mobile](screenshots/discovery-list-mobile.png) | [desktop](screenshots/discovery-list-desktop.png) |

## Corrected failures and limitations

Earlier branch runs failed and were corrected: availability publication used a legacy default, a draggable MapLibre pin was added before coordinates were set, map pointer handling stole marker focus, a test used an empty-tile 404 instead of an actual provider 503, and mobile selectors matched hidden streamed markup. The native runner now terminates its separate HTTP fixture explicitly. A source review also corrected sheet drags being undone by the following click. Theme evidence waits for the synthetic dark background to be painted before checking camera preservation. A local public smoke failed when typing immediately after reload; waiting for page settling corrected it. These failures are not reported passing.

Hosted activation still requires a dedicated approved Supabase project and migration/restore review, existing Auth/worker privacy and operational prerequisites, provider-plan approval, restricted and budgeted public map keys, a separate private geocoder key, and real licensed map/geocoder verification. Shared pilot budgets are not per-person fairness guarantees. Physical Android/iOS frame rate, real provider quotas/delivery and production-scale spatial performance have not been measured. The GIST explain probe demonstrates index eligibility, not a production planner or latency guarantee.

Saved addresses support create/select only; correction/removal and retention/export/deletion operations must be completed before a public pilot. Search does not disclose addresses to workers. No hosted migration was executed. Disable discovery/provider flags for rollback, retaining legitimate private addresses and audit history under approved retention rather than dropping tables.

See [ADR 0005](../adr/0005-coarse-discovery.md) for research sources, privacy boundaries and migration details, and [local setup](../discovery/LOCAL_DISCOVERY.md) for reproducible isolated testing. Stop before Milestone 05.

# Milestone 01 acceptance evidence — 2026-10-31

Scope: reviewed **local database** foundation, following the founder's instruction to deploy the foundation and continue. Supabase CLI **2.122.0**, PostgreSQL **17.11**, PostGIS in `extensions`. The deployed application remains the verified M00 commit and has no database connection. [Vercel deployment record](vercel-deployment.md).

## Implemented

A fresh CLI-created migration (`supabase migration new foundation` → `20261031114309_foundation.sql`) was derived from a review of both SQL blueprints, not executed from the root reference files. It includes private-schema separation, default-deny/read-only browser access, non-recursive RLS, GIST indexes, actor-bound idempotency storage, inspection consent integrity, append-only evidence and a server-only worker-card publisher. Category/identity/business eligibility, curated coarse markers and publication expiry are enforced. Accepted quote/item and booking-reference immutability prevent retroactive rewriting. Business attachment requires the same owner identity.

Publication and invalidation serialize through a conservative transaction advisory lock, with fresh eligibility reads after waits. No user-facing worker approval, job matching or authentication action was enabled.

## Verification actually run

| Check                            | Exact command                                               | Observed result                                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial bootstrap                | `npm run db:start`                                          | Exit 0 after documented setup corrections; native local Supabase database and schema initialized                                                |
| Fresh migration replay           | `npm run db:reset`                                          | Exit 0; final migration and synthetic seed replayed on a reset local database; several reset/replay cycles exercised while hardening            |
| RLS/integrity/geospatial         | `npm run db:test`                                           | Exit 0; **80 pgTAP assertions across 3 files**, all passed                                                                                      |
| Publication race regression      | `npm run db:concurrency`                                    | Exit 0; **2 two-session races passed**: revoke-before-publish rejects stale eligibility; publish-before-revoke removes the committed card       |
| Security advisors                | `npm run db:advisors`                                       | Exit 0 with fail-on-warn; **no security issues found**                                                                                          |
| Application SQL lint             | `npm run db:lint`                                           | Exit 0; `public,private`, warning level and fail-on-warning; **no schema errors/findings**                                                      |
| Spatial plan                     | `npm run db:explain`                                        | Exit 0; natural and forced-eligibility plans use `worker_coverage_base_gist_idx`; `ST_DWithin` metre predicates and bounding prefilter retained |
| Clean install                    | `npm ci`                                                    | Exit 0; lockfile reproduced after CLI addition                                                                                                  |
| Formatting, code lint, strict TS | `npm run format:check`; `npm run lint`; `npm run typecheck` | Exit 0                                                                                                                                          |
| Application/security unit tests  | `npm test`                                                  | Passing suite, including local-only command guards and API exposure configuration regression; final count recorded in raw unit log              |
| Desktop/mobile production smoke  | `npm run test:e2e`                                          | Exit 0; **12 passed** at 1440×900 and 390×844, plus 320/768/1024 overflow smoke                                                                 |
| Production build                 | `npm run build`                                             | Exit 0; application routes/proxy compiled; no database/provider access                                                                          |
| Dependency audit                 | `npm audit --audit-level=high`                              | Exit 0; **0 vulnerabilities**                                                                                                                   |
| Leakage scan                     | `npm run security:check`                                    | Exit 0; repository and 14 browser assets scanned; inert server build canary absent from assets                                                  |

Raw outputs: [milestone-01/](milestone-01/). `app-results.json` records the timed clean-install/build/browser acceptance run; later documentation/SQL/test hardening did not change the UI. The final unit/format/lint outputs supersede the earlier count. `db-results.json` records final command outcomes without inferring elapsed times. Fixture EXPLAIN is **not** a performance benchmark.

pgTAP covers guest, client owner, approved matched worker, unrelated worker, pending worker, suspended worker and admin-browser denial boundaries; private addresses/evidence/financial access; lack of browser DML and self-publication; draft privacy and job-bound conversations; same-job quote/booking constraints; inspection-only separation; append-only audit; published category filtering; expiry/suspension/self-review rejection; and metre/longitude/GIST checks. The race harness restores synthetic fixture state after testing.

The separate database CI job runs local bootstrap/reset, pgTAP, concurrency, advisors, strict application SQL lint and EXPLAIN. Hosted CI status is reported with the PR separately from local evidence. No quota exhaustion or unavailable run is treated as success.

## Setup failures and precise limits

- The managed 8GB filesystem with Docker's configured VFS driver could not unpack the official multi-layer PostgreSQL image: **no space left on device**. No storage-driver, daemon or network-policy bypass was made. The same official PostgreSQL 17.11.0.006 filesystem was exported with checksum-verified Crane 0.22.1 and imported as a single layer with its entrypoint, command and environment preserved. The running engine reported PostgreSQL 17.11. This is an environment workaround, not a modified database implementation. Normal CI uses the pinned CLI's standard image flow.
- Storage initialization hit additional disk constraints and a public ECR rate limit. It is **disabled for M01**, along with Auth, Realtime, analytics and functions. No fake Storage tables were created. Private evidence references are modeled; real private buckets, file validation, signed URLs and Storage-policy tests remain M03. Temporary image/download caches were cleaned; the headless browser used for tests remained available.
- With Auth disabled, the CLI initializes an ID-only `auth.users` baseline. An initial seed using email fields failed and was corrected to synthetic **non-login identities**. No credentials, OTPs or fake successful sign-ins are supplied. Real local Auth migrations/fixtures and session tests remain M02.
- `supabase db query` rejected a multi-statement prepared query. EXPLAIN scripts therefore run through `psql` in the explicitly named local database container, without remote URLs or credentials.
- An unrestricted `db lint` returned third-party PostGIS dynamic-SQL/optional-raster findings despite exit 0. Those raw findings are retained as `sql-lint-extension-findings.txt` and are **not called a clean lint**. The enforced application-schema lint excludes installed extension internals and fails on warnings. Only the tested geography APIs are verified here; optional PostGIS functions were not repaired or certified.
- Real HTTP Data API, login/OTP, hosted advisors/configuration, Storage API, email/SMS/payment provider, physical-device installation and staging beta tests were **not run**. Database policy tests use native PostgreSQL roles/claims; the API schema/grant configuration is checked separately. No live Supabase project was created or linked, no remote migration ran, and application capabilities remain OFF.

## Security/review and rollback

The original PRD, instructions and SQL blueprints are unchanged. Local scripts refuse a hosted-project link and do not pass through remote/reset arguments. Fixture identities and coordinates are synthetic. Every public/private application table has RLS; private-schema usage is revoked from browser roles; private functions are invoker-only with an empty search path; there are no definer helpers or privileged views. Standard service-role access still bypasses RLS and is not a substitute for future per-request authorization/MFA/idempotency.

Reviewed publication race ordering, accepted evidence mutability, schema grants, default privileges, cross-reference integrity and source/bundle leakage. No application privileged database adapter, provider write or permissive UI command was added. A database superuser can change schema/disable triggers; append-only controls do not claim to defeat that administrator.

Local rollback: stop the disposable local stack and reset/recreate it from the prior reviewed migration set. Do not drop a hosted schema or apply this seed remotely. A future hosted rollback requires a reviewed forward repair plus backup/restore plan. **Milestone 01 stops here; Milestone 02 awaits instruction.**

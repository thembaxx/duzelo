# Milestone 03 — worker profiles and private manual review

Implementation verified 2026-10-31; handoff 2026-11-01. Based on merged M02 `f6684db`. The current editorial identity, original mark, Geist typography, Light/Dark/System and public PWA are preserved. No hosted Supabase database, real identity file, live worker approval, SMS/payment delivery or billed scanner was provisioned.

## Result and scope

Real individual/business draft → service pricing/private coverage → scanned/scrubbed native Storage upload → revision-bound submission → independent MFA review → separate sanitized publication. Reasons/expiry/history, short audited document leases, category-specific denial, suspension/expiry withdrawal and retryable provider deletion are implemented. The cleanup queue includes paused accounts and abandoned draft uploads without permitting their review/document access.

Ten category definitions preserve the confirmed PRD taxonomy and the existing restricted electrical category. They are migration data, not fabricated workers. Public listings exist only after the real command flow; native fixtures and screenshots are explicitly fictional. Location matching, maps, jobs and payments remain later milestones. Production Auth and worker approval default OFF.

## Exact proof

[GitHub Actions run 41246201467](https://github.com/thembaxx/duzelo/actions/runs/41246201467), executable head **`5e5f9ebf965896cc0b4b61a602b512ac4c9cde04`**, passed all three jobs. [ci-results.json](milestone-03/ci-results.json) records command steps and timestamps. Selected redacted [application](milestone-03/ci-verify.log), [database](milestone-03/ci-database.log) and [native acceptance](milestone-03/ci-auth.log) lines preserve observed outcomes. The following handoff commit contains documentation/evidence only; PR checks gate its exact final head before merge.

| Command / environment | Observed outcome |
| --- | --- |
| `npm ci` — three fresh CI jobs | Passed, pinned lockfile reproduced |
| `npm run format:check` | Passed locally and CI |
| `npm run lint` | Passed locally and CI |
| `npm run typecheck` | Passed locally and CI |
| `npm test` | **179 passed**, 16 files, locally and CI |
| `npm run test:db:static` | Passed locally/CI; does not replace SQL execution |
| `npm run build` — Auth/worker OFF | Passed locally/CI; `npm run check` includes it |
| `node scripts/check-boundaries.mjs` | Passed locally/CI, transitive server-only imports checked |
| `npm audit --audit-level=high` | Passed locally/CI, **0 vulnerabilities** at execution |
| `npm run security:check` | Passed locally/CI; source/browser patterns and build-secret canary |
| `npm run test:public` | **8 passed**, existing public production-browser scenarios, locally/CI |
| `npm run db:start`, `npm run db:reset` — disposable CI | Passed; fresh replay of all reviewed migrations and local fixtures |
| `npm run db:test` — disposable CI | **122 pgTAP assertions**, 5 files, passed |
| `npm run db:concurrency` — disposable CI | Both publication/revocation races passed |
| `npm run db:advisors` — disposable CI | Passed, no security issues found |
| `npm run db:lint` — disposable CI | Passed, no application-schema errors found |
| `npm run db:explain` — disposable CI | Both spatial candidate plans use coverage GIST index; no discovery feature implemented |
| `npm run auth:start`, `npm run auth:env` — disposable CI | Passed; native Auth/Storage and private ignored local environment |
| `npm run test:auth` — disposable CI, healthy pinned ClamAV 1.5.4 | Auth/worker-enabled production build passed; actual rate secret and Storage key absent from browser assets; **6 full native cases passed**, desktop + mobile |

[local-check.log](milestone-03/local-check.log) records local lint, typecheck, all 179 units, structural SQL checks and build on executable head `ff9c1c0`; its only following executable change scopes an existing browser assertion to active markup. Separate local format, boundaries, public-browser, audit and secret logs are in the same directory. Local build used an inert build-secret canary; native CI separately scanned against actual ephemeral server credentials. Pattern scans are not a complete security audit.

The managed workspace's small Docker VFS volume could not hold the full native stack during M02. M03 native database/Auth/Storage/ClamAV proof therefore ran on isolated GitHub runners; no local native execution is reported passing. No hosted migration or production-provider behavior is inferred from these tests.

## Critical assertions exercised

- Existing wrong OTP, resend/backoff, strict schema/origin, both-mode persistence, native session expiry/refresh/global revocation, suspension and MFA-bypass cases remain green.
- Individual/business schemas, fixed/starting/quote prices and integer cents, authority injection rejection, explicit location permission/manual fallback, private base/radius/towns/travel fee persist through real commands.
- MIME/magic/size/dimension checks and EXIF removal; real native ClamAV rejects the harmless EICAR signature before stored metadata exists. Scanner protocol tests cover partial replies, infected/error/closed connections; configuration tests reject unsupported scanner/retention settings.
- Concurrent same-key uploads reconcile to one stored object. No browser raw Storage access, no cross-worker evidence binding, no ID-to-portfolio relabelling, and no silent retention extension. pgTAP deliberately introduces broad permissive Storage policies plus grants and proves restrictive bucket policies still deny reads/inserts/replacement.
- Owners get only their own short-lived signed access; guests/unrelated accounts/support staff/AAL1 and self-review fail closed. Approval/publication require the correct independent MFA reviewer and recent audited image access. New links are capped by the retention deadline, and replay cannot extend the original lease.
- Public HTML/RSC omits private base coordinates, registration number, phone, paths and raw photo metadata. Identity files return 404 from the public-media API; only reviewed current public JPEG bytes are served, with `no-store`.
- Trade rejection removes plumbing while cleaning remains publishable. Identity changes, suspension and expired evidence withdraw public data; revision edits require fresh evidence and reject stale decisions. Reasons/history persist and review events cannot be altered/deleted.
- Expired native objects are actually removed; repeated deletion is idempotent. Cleanup works through the real admin queue even when the worker account is paused. UI does not imply an automatic cron.
- Next.js can stream `notFound()` with status 200 after headers start. Browser assertions verify the not-found content, absence of the worker and absence of the publication row, instead of equating status alone with data denial. Native media endpoints retain explicit HTTP denial status.
- Axe WCAG 2/2.1 A/AA checks on evidence and public profiles, phone overflow checks and mobile triage/desktop decision visibility pass. Existing public theme, keyboard, reduced-motion, offline/cache and narrow-width checks remain green. Protected/mutable worker routes bypass the public service-worker cache.

## Screenshots and review

Native successful-run viewport captures, with fictional names and a synthetic solid-color sample image, are committed below. No real person, ID, signed URL, cookie, environment, factor secret, trace or video is included. Review screenshots precede link creation. Captures show the top of each surface; they do not show every interaction state.

| Surface | 390×844 | 1440×900 |
| --- | --- | --- |
| Onboarding preview | [mobile](screenshots/worker-onboarding-mobile.png) | [desktop](screenshots/worker-onboarding-desktop.png) |
| Evidence step | [mobile](screenshots/worker-evidence-mobile.png) | [desktop](screenshots/worker-evidence-desktop.png) |
| MFA reviewer triage | [mobile](screenshots/worker-review-mobile.png) | [desktop](screenshots/worker-review-desktop.png) |
| Published local fixture | [mobile](screenshots/worker-public-mobile.png) | [desktop](screenshots/worker-public-desktop.png) |

Captures were inspected for legibility, local-only disclosure, privacy and layout. Mobile review is triage; actual approval/publication is exercised at desktop width in both cases. Founder references remain mapped in `DESIGN.md`; no brand sign-off is claimed.

## Corrected failures and limitations

Earlier branch runs failed and were corrected before this accepted run: grant-only Storage assumptions (replaced with durable restrictive RLS/access tests), select/hidden-streamed-markup selectors, PostgreSQL v4's removed array helper, an audit timestamp column mismatch, and HTTP-only streamed-not-found expectations. Those earlier runs are not reported passing.

Hosted activation still requires a dedicated approved Supabase project, reviewed SMS/CAPTCHA/operator identities, service-specific trade rules, privacy/retention policy and staffed review/deletion operations, a securely reachable TLS scanner with fresh signatures, backups/restore and release approval. Signed links are bearer leases up to 60s; an already issued lease cannot be individually recalled after later suspension/retention shortening without object deletion. Photos are JPEG/PNG only, no PDF. A mistaken draft avatar currently requires reopening as a new revision after submission; individual discard is deferred. Expiry conservatively withdraws a card until an operator republishes remaining eligible categories. No scheduled cleanup/republisher is claimed.

See [ADR 0004](../adr/0004-worker-evidence.md) and [local operations](../workers/LOCAL_REVIEW.md) for exact settings, two-phase upload/deletion, lifecycle limits, migration and rollback. The new migration is forward-only and unhosted; never drop audit/evidence history or replay local resets against a hosted project. Stop before Milestone 04.

# ADR 0006 — private requests and bounded invitations

Date: 2026-11-01. Milestone 05. Production requests and matching remain OFF.

## Request and command boundary

The six-step client wizard saves a versioned server draft before changing steps, with an explicit save/resume path. A direct request uses the same domain, with a server-resolved selected worker. Photos are optional under the controlling PRD; up to eight are supported. Budget is optional and uses integer ZAR cents. Time windows use SAST in the UI and timestamp offsets on the wire. Urgent defaults end within two hours and before the end of the current South African day. The server rejects invalid, stale or out-of-range windows.

`public.job_requests` contains owner-readable request details, not street coordinates. A consented snapshot in `private.job_locations` contains the exact point, street and access notes, including copies of owner-authorized saved addresses. A town-only fallback stores no invented coordinate and clearly labels matching approximate. Unsupported saved-address towns require manual correction. Private drafts are not persisted in browser storage or URLs. Failed actions retain their idempotency key in memory; an unknown submission outcome locks editing until retry or reload.

Native verified identity, completed onboarding, current account capability and non-suspension are required on every read/command. Commands recheck the live native session and account inside their transaction, before returning cached idempotent responses. An actor/key lock, publication/revocation lock, owner row lock, strict input, durable rate budget, version check and redacted audit protect writes. Account reads avoid a row lock that would invert M02's suspension lock order. No client-supplied actor, status, approval or authoritative amount is trusted.

## Matching and dispatch

`private.job_candidates` is an invoker-only server function; browser roles cannot use the schema/function. It rechecks current M03 manual approval and retained evidence/category eligibility, completed onboarding, active mode, suspension, profile availability, current trade credentials, both block directions, safety restrictions, no self-match and requested-time conflicts. Coverage uses PostGIS geography, GIST and `ST_DWithin` on private coverage. A broad constant 150 km index prefilter precedes each worker's actual radius and town restrictions. Town-only matching uses an explicit allowlist/public-town fallback, without fabricating distance. No exact worker base is returned.

Scores use actual category specificity, normalized coverage distance or town-only fit, existing response history (neutral for new workers), availability, current trade review and approved portfolio. Within five-point score bands, lower recent exposure and older/absent invitations rotate priority deterministically. There are no invented ratings or completion histories. Candidate selection is bounded at 250. Current selected recipients are evaluated directly before that bound can exclude them.

A normal request creates at most five invitations per wave and three waves total. New invitations enforce three per worker per hour and the worker's daily preference (default six, maximum twelve). Direct requests create at most one invitation to their selected provider, with no widened fallback. Unique job/worker rows, transaction locks and outbox deduplication prevent duplicate fanout. Job/invitation deadlines, current eligibility and blocking are rechecked when viewed or acted on.

First-wave dispatch runs on submit. Later waves are owner-triggered through **Check next invitation wave**, after twenty minutes for urgent requests or four hours otherwise. A positive response/quote pauses later waves. **No unattended hosted scheduler was provisioned**; closing the request does not advance a wave. The UI states this limitation.

The transactional outbox currently delivers only real in-app notices, respecting current recipient eligibility and notification preferences. Dedupe links one notification to one outbox row; ineligible rows become dead letters. The payload contains request/match references, never street, coordinates or photo keys. No SMS, email, push, queue provider or delivery account was contacted. Invitation counts mean rows created, not guaranteed delivery or a worker response.

## Preview and media boundary

Restrictive RLS permits only request owners to read `job_requests` directly and denies browser `job_matches` / `job_media` access. This deliberately tightens M01's original matched-worker row access: workers must use the current server DTO and eligibility check. It prevents stale matches and score/path disclosure through PostgREST. Private tables and the private `job-requests` bucket are not exposed, including under future broad permissive policies.

Worker previews contain service, supplied work details, public town, requested windows/contact availability, optional budget, protected photo references, expiry and a non-sensitive eligibility explanation. Exact point, street, access notes, worker base, raw Storage path, internal score and client identity are excluded. View/decline/block and private schedule/urgency/cap preferences persist through authenticated commands. Viewing cannot extend a deadline. Expiry and ineligibility revoke previews and photo access immediately on read.

Photos reuse M03's bounded multipart, magic-byte, ClamAV and Sharp pipeline: JPEG/PNG input, canonical JPEG output, EXIF removed, maximum 3 MiB and eight pending/stored reservations. Two-phase immutable hash/path reservations reconcile interrupted or duplicate Storage uploads. Owner removal persists purge intent, calls real Storage deletion, then records completion. The authenticated no-store image proxy rechecks live owner/current-match access and retention; no signed URL or object key reaches the browser.

User-authored description, contact-window text and photo pixels can voluntarily contain identifying information. Upload guidance asks clients to exclude it; EXIF removal is not OCR or semantic redaction. Physical retention deletion, orphan reconciliation and operational monitoring must be scheduled before a hosted pilot. Access expiry alone is not physical erasure.

## Configuration, migration and operations

`JOB_REQUESTS_ENABLED` and `LOCATION_MATCHING_ENABLED` default false and must be enabled together with the existing validated Auth/worker/scanner/private Storage configuration. Hosted mode additionally requires `JOBS_POLICY_APPROVED=true` and an integer `JOB_MEDIA_RETENTION_DAYS` from 1 to 90. Invalid combinations fail closed. Local fixtures use seven days and are loopback-only. No dependency was added; pinned Next/React/TypeScript/Supabase/MapLibre versions and lockfile are unchanged.

CLI-created `20261101092247_guided_jobs_matching.sql` extends reviewed migrations. Blueprints are untouched. Tests replay only disposable unlinked databases. No hosted migration or real identity/job data was used. Disable both request/matching flags to withdraw the capability; retain legitimate data/audit under approved retention instead of dropping tables. Dedicated Supabase hosting, restore review, approved privacy/retention operations and scanner health remain activation blockers.

The native fixtures seed fictional current review/read-model metadata for candidate scale and ranking; this is not a claim that those fixtures uploaded evidence or became real approved workers. Independent M03 cases still exercise actual native evidence upload, scanning and independent MFA review. M05 tests use actual OTP, PostgreSQL, Storage, ClamAV, production Next build and browser UI against that isolated stack.

## Sources checked

- [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis): geography/metres, GIST and `ST_DWithin`.
- [Private Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control): private buckets, RLS and authenticated server access.
- [Supabase server-side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs): native server verification and cookie refresh remain M02's boundary.
- [Supabase changelog](https://supabase.com/changelog): current platform compatibility reviewed. November 10 CBC cipher deprecation does not require weakening modern TLS verification.

Stop before Milestone 06: quotations, inspection/location grants and booking are not implemented.


# ADR 0004 — worker applications and private evidence

Date: 2026-10-31. Milestone 03. Accepted for isolated testing; hosted activation remains gated.

## Boundary

Use the existing pinned Next.js 16.4.3 / React 19.3.1 / TypeScript 7.0.2, Supabase SSR 0.12.7 / JS 2.118.0 / CLI 2.122.0 and PostgreSQL 17 baseline. Sharp **0.35.5** is pinned for full image decoding, orientation, bounded resizing and JPEG re-encoding. No new Auth system or public upload bucket is introduced. Read the [M02 identity ADR](0003-authentication.md) first.

An individual or business owner saves a real private draft, with canonical category IDs, positive integer-cent fixed/starting prices or an absent custom price. All confirmed PRD categories are represented; electrical remains an additional restricted category from the existing service catalog. Locksmithing, plumbing and electrical require category review; this conservative gate does not assert that every task in those categories legally needs the same credential. Hosted activation still requires scope-specific professional/legal review.

The private base, radius, town allowlist, possible travel fee and business registration stay on the server. Only the owner receives their editable draft. Administrator review receives a deliberately smaller DTO without base coordinates, registration number or object paths. Public workers use the existing sanitized, curated-town `worker_cards`, current eligible categories and reviewed media; no location search/matching or booking is implemented here.

## Evidence lifecycle

`private.worker_applications` owns a monotonically increasing review revision. Editing a submitted/reviewed/returned application withdraws publication, expires old claims and creates a new revision. Editing an unsubmitted draft keeps its revision. Submission never approves anything. A pending application requires retained ID evidence, business evidence if applicable and category evidence for every restricted service.

Accept JPEG/PNG **photos only**, maximum **3 MiB** and **25 megapixels**, minimum 32×32. PDFs, SVGs, animations, MIME/magic mismatches and undecodable images fail closed. Before decoding, send bounded raw bytes to a trusted ClamAV `INSTREAM` adapter; only the exact clean verdict succeeds. `FOUND`, scanner errors, timeout and unavailable scanner never create a stored asset. Then Sharp normalizes orientation, fits within 1800×1800 and re-encodes JPEG without EXIF/XMP/IPTC. Stored JPEG is also capped at 3 MiB. This protects against common upload hazards; antivirus is not a guarantee against every malicious file or text embedded inside photographs.

A durable upload intent records an opaque randomized key and sanitized hash before native Storage upload with `upsert:false`. Retries reconcile an existing object by hash. A second live-session/revision check marks it stored and attaches the claim. Unfinished objects stay inaccessible and are eligible for operator cleanup after one hour. Immutable content/purpose/path/scan identity cannot be repurposed from an ID into a portfolio photo. Per-revision limits: 24 images, one avatar, six portfolio images, three per evidence kind/category; total retained limit 60. A draft has no individual discard control yet; a corrected photo can be added within evidence limits, or the application can be reopened as a new revision after submission.

`worker-evidence` is private with native MIME/size limits. Explicit **restrictive** RLS policies on `storage.objects` and `storage.buckets` deny anonymous/authenticated access to this bucket, even if a future broad permissive policy is added. Standard Storage grants may be restored by platform startup: an absence-of-grants assertion alone is not a durable Storage boundary. Tests deliberately add permissive policies and grants inside a rolled-back transaction and prove denied reads/writes. The server-only service key is used only after command authorization.

An owner or an independent active owner/verification administrator with native AAL2 may request a document link. Every request is audited; the same actor/key reuses the original deadline, never extends it. Native signed URLs last at most **60 seconds**, capped by the current retention deadline. URLs are bearer capabilities during that lease and cannot be recalled individually: a later suspension/retention shortening can leave an already issued link usable for the remaining lease unless the object is removed. Links are not stored in audit/idempotency rows, logs, offline caches or browser storage. Native tests and artifacts suppress URL tokens.

Public avatar/portfolio bytes are proxied from the same private bucket only after explicit review/publication, with a fresh current eligibility check and `no-store`; identity/business/trade images can never use that endpoint. Review must inspect photographs for printed contact, address, ID or other private information: metadata scrubbing does not remove visible text.

## Review and publication

All mutations use strict input schemas, same-origin checks, actor/key hash binding, live native session/suspension checks, database transactions and append-only audit. The existing worker-publication advisory lock serializes review/edit/publish/revocation; actor-key locks precede it consistently with M02. No `SECURITY DEFINER` or browser write grants are added. The existing PostgreSQL/session boundary remains the trust root; UI mode, user metadata and query parameters do not grant rights.

Independent reviewers require active `owner`/`verification` membership plus verified native MFA. Support membership, AAL1 and self-review fail closed. Approval requires an audited access by that reviewer to every relevant image within the last hour; the operator must actually inspect the opened file. Reasons, expiry/next-review date, reviewer and revision are stored in immutable review history. Trade approvals require a date. Mobile allows triage and audited access; decision/publication forms require a larger screen, while server checks apply at every viewport.

Publication is a separate confirmed action after ID/business review, public text/service-scope inspection, and audited access to all proposed public photographs. Rejected trade claims exclude only that category; identity/business rejection or requested changes withdraws the profile. Suspension, relevant verification changes, changed content and evidence lifecycle invalidate existing cards. Read-time eligibility and `safe_until` prevent time passing from leaving expired evidence public. Expiry conservatively withdraws the cached card; an operator can republish remaining eligible categories. This milestone does not add a scheduled republisher or silently change existing bookings.

## Retention and hosted gates

Local synthetic evidence expires after seven days. Hosted mode requires an explicitly approved `VERIFICATION_RETENTION_DAYS` (1–365), `VERIFICATION_POLICY_APPROVED=true`, Auth/provider prerequisites, a server-only secret key and a trusted **TLS-verified** scanner endpoint. These flags are operator attestations, not evidence of legal compliance. Production Auth and worker approval remain OFF. No hosted migration, real document, real worker approval, live SMS/payment call or paid resource was created by this milestone.

Expired files immediately fail access/publication checks. Removal is an explicit MFA-confirmed two-phase operator command: durable `purge_pending` and withdrawal, native Storage deletion, then terminal `purged` and document deletion timestamps. Retrying reconciles confirmed missing objects. It is not represented as automatic deletion; operations must schedule/staff cleanup and define lawful audit retention before hosting. Purged evidence cannot be restored or silently retained longer.

## Sources checked

- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) and [private bucket fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals): private objects require authorized retrieval; RLS and grants are separate; service credentials bypass RLS.
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs): preserve the supported M02 server/browser separation.
- [Supabase changelog](https://supabase.com/changelog): October 2026 TLS CBC deprecation does not require weakening the existing TLS-verification defaults.
- [Sharp output documentation](https://sharp.pixelplumbing.com/api-output/): default output removes metadata. Tests decode output and verify EXIF absence.
- [ClamAV 1.5.4 clamd manpage](https://github.com/Cisco-Talos/clamav/blob/clamav-1.5.4/docs/man/clamd.8.in): NUL-terminated INSTREAM command, length-framed chunks, zero-length terminator and clean/infected/error replies.
- [Official ClamAV Docker](https://docs.clamav.net/manual/Installing/Docker.html): isolated CI pins 1.5.4 image digest `sha256:bda39705e291105049c3936e2803ac90b955172af8030f94f05dce1252df6c6d`. CI uses bundled signatures for reproducibility; a hosted operator must maintain fresh signatures and private transport/TLS termination.

## Migration / rollback

The new CLI-created `20261031203711_worker_verification.sql` follows reviewed M01/M02 migrations; reference blueprints remain untouched. Replay/reset runs only on disposable, unlinked local databases. No hosted schema has been applied. Schema additions are forward-only; do not drop evidence/audit history or restore stale cards to roll back a UI release. Keep `WORKER_APPROVAL_ENABLED=false` to disable application flows, and independently withdraw published database cards through an audited operator procedure if activation had occurred. Hosting requires reviewed migration/backup/restore and retention operations first.

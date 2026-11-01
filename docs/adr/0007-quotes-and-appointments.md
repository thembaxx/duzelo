# ADR 0007 — immutable quotes, appointments and inspection consent

Date: 2026-11-01. Milestone 06. Production quotations and bookings remain OFF.

## Agreement boundary

A sent quotation is a worker-authored proposal, not an appointment or payment. Saving appends a new private draft version; it does not alter an already sent offer. Sending the latest draft supersedes that provider's prior unsent/sent versions, records a response and stops invitation waves. Clients see genuine published offers and retained history; other workers never see competitors' terms. Workers retain their own quote history after losing eligibility, with original request titles/descriptions and other providers' booking identifiers withheld. The same title policy applies to history lists and appointment projections. Current selected participants retain active appointment details after approval/safety checks; marking a provider unavailable for new invitations alone does not hide their current appointment.

Terms and line items are immutable once written. Lifecycle status may change, but an accepted quote cannot be rewritten or withdrawn. A worker can create at most twenty versions per request. Every active control calls a session-validated server command: no client-supplied owner, approval, status, total or currency is authoritative.

The application reuses M05's verified native identity, current database role/onboarding/suspension checks, publication lock, owner row lock, actor/key idempotency, durable rate budgets and redacted audit. A new optional before-replay hook runs after live authorization and before returning a cached response. It is used for exact-location reads, whose cached result contains only an acknowledgement, never an address. Private projection and permission checks therefore run again even for a previously successful key.

Current M03 manual approval, retained category/trade evidence, safe public card, both accounts, blocks, safety restrictions, private coverage and direct-request recipient gates apply when sending, accepting and confirming. The quotation domain separates current eligibility from M05 invitation expiry: a first response needs a live invitation; a responding worker may amend within seven days of a published response. Other still-live invitees can respond after the first quote, but quoted requests cannot dispatch more waves.

## Money, time and consent

Line quantities use integer hundredths and unit prices use integer ZAR cents. BigInt arithmetic rounds each line half up, sums labor/materials and travel, calculates declared VAT and bounds the resulting total at R1 million. All browser-supplied totals are rejected; the server recalculates on save and acceptance. An independent deferred PostgreSQL trigger validates published terms against their immutable lines. TypeScript targets ES2020, supported by the existing modern Next.js/browser toolchain, so integer arithmetic is explicit without adding a dependency.

VAT may be not charged, added at 15% or included at 15%. This is the provider's declaration, not verified registration or a tax invoice. Estimate assumptions and exclusions remain visible; an accepted estimate is not a guaranteed final price. Later price/scope changes require a separately agreed change order, which is outside M06. Professional tax/consumer-policy review remains a hosting prerequisite.

Work windows must start in the future, within ninety days, last at most twenty-four hours and have an earlier offer expiry within seven days. Inspection windows are within seven days and at most eight hours. The UI uses SAST; the server stores timezone-aware instants. Pending bookings reserve the proposed time and must be confirmed before its start. They are never auto-confirmed. If the start passes, the UI explains that confirmation is unavailable and offers decline/cancellation; automatic follow-up is an operational prerequisite, not a claimed background service.

A priced acceptance locks the request and quotation, rechecks version/expiry/eligibility/schedule and recalculates the amount. One transaction accepts one offer, rejects or supersedes competing versions, revokes inspection grants, creates one `pending_worker` booking, expires other invitations and appends events, audit and generic in-app notices. Unique job/booking and quote/job/provider references remain enforced. Worker confirmation is a distinct command with fresh approval and schedule checks; only then does the job become booked. Direct requests use the same policy.

A shared worker appointment lock serializes reservations. Database schedule guards and a GiST exclusion constraint prevent overlapping active bookings; the same guard considers private hard blocks and authorized inspection visits. Accepted M06 appointment windows cannot be silently changed. Existing legacy SQL test records remain historical fixtures, not callable booking shortcuts.

## Inspection and exact-location access

An `inspection_required` proposal has no work subtotal or work total. An optional visit fee is separate, with no payment collected. The client must independently consent to the proposal, disclosed fee and precise-address access. Approval creates a quote-bound private grant, never a work booking or acceptance of a final price. Access opens no earlier than one hour before the visit and expires at the visit's end. Grant terms cannot be extended, reassigned or restored after revocation; a changed visit needs a new proposal and fresh consent.

Revoking an already revoked grant returns an acknowledgement without advancing the request version or delivering another notice, including with a fresh idempotency key.

A later priced quote supersedes the inspection proposal and revokes its grant. It still needs a new client acceptance and worker confirmation before normal work booking. Closing the request or choosing a work quote revokes all inspection permissions. No inspection indication silently becomes a binding full-work quote.

Exact addresses are fetched only by an explicit same-origin authenticated POST. A selected confirmed worker, or the expressly authorized worker inside the current inspection window, must still pass current approval/account/safety checks. Current inspection access is one private invoker-only SQL function. Its internal clock argument supports deterministic policy tests; the application always uses the live `clock_timestamp()` default, and browser roles cannot execute it or inject a clock into the API. PostgreSQL `now()` stays fixed at transaction start, so it cannot enforce expiry after a queued transaction waits. The response also checks the view deadline after commit, before returning any precise fields. A native held-transaction regression crosses a real grant expiry without editing the immutable grant.

That explicit worker response contains the private street, point and notes. It is no-store. Quote/booking responses and worker pages omit those fields, as do URLs, notifications, idempotency responses and browser storage. The client retains access to their own private request editor under M05. Privacy checks reload the quotation route so its HTML/RSC is tested independently of that earlier authorized owner page. The temporary React view clears after at most sixty seconds or the grant deadline, and can be hidden immediately. Already disclosed information cannot be recalled. Confirmation does not expose a worker's private base or verification files.

Restrictive RLS denies direct browser reads of quotes, lines, bookings and booking events, including under future broad permissive policies. Trusted server DTOs verify the current participant and omit private fields. These restrictions deliberately tighten the foundation's original party SELECT policies. Private grants and precise locations remain outside the Data API. Request photos keep M03/M05 scanner, retention and protected-proxy boundaries; continued access after a response requires current eligibility and an active relevant agreement.

## Cancellation and notifications

The selected worker may decline a pending request; either party may cancel a pending/confirmed pre-work appointment. Events preserve the actor, previous/new status and participant-reported reason. A no-show reason becomes available thirty minutes after the proposed start and is explicitly not a finding of fault. These commands do not charge, refund, impose a penalty or decide a dispute.

Closing a quoted request rejects remaining offers, expires invitations and revokes inspection access without creating a booking. The one-booking-per-job invariant is retained even after cancellation/decline: the client starts a new request to seek a new appointment. There is no automatic replacement provider or consent-free rematching.

Notifications persist through the transactional outbox into actual in-app notices with deduplication and current account/preference checks. They contain a generic update and resource reference, never precise location or user-authored scope. No SMS, email, web push, payment provider or delivery service is contacted. Notices are history; opening the saved agreement checks its current state.

## Migration, verification and operations

CLI-created `20261101211506_quotations_and_booking.sql` extends reviewed migrations, with no blueprint execution. It adds immutable proposal terms, bounded grants, price/schedule guards, `btree_gist` in the extensions schema and restrictive read policies. No dependency or lockfile changed. Only disposable, unlinked local databases are reset. No hosted migration was executed.

`QUOTATIONS_ENABLED` and `BOOKINGS_ENABLED` both default false. They require reviewed M05 infrastructure together; hosted mode additionally requires `BOOKINGS_POLICY_APPROVED=true`. Other sensitive gates stay OFF. The local test runner enables both only with actual loopback Auth/PostgreSQL/Storage/ClamAV. Extra fixed OTPs remain inside the no-delivery local allowlist.

Native matching scale uses explicitly fictional current review/read-model metadata. Independent M03 cases still exercise real native upload, scanning and independent MFA review. Historical expired quotes and past appointments may be restored as isolated test fixtures; they do not claim an actual visit, approval or no-show. Deterministic grant-clock assertions exercise the same private SQL function used by the application. Native permission replay tests use real server sessions and persisted revocation.

Before hosting: dedicate and approve Supabase, review migration/restore and existing privacy/retention/scanner prerequisites, approve quotation/inspection/consumer/tax policies, and configure deletion/reconciliation, pending-appointment follow-up and monitoring. Disable both agreement flags to withdraw the feature; retain legitimate accepted terms/events under approved policy rather than deleting history. No production-scale latency or physical-device/Safari claim is made.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase server Auth](https://supabase.com/docs/guides/auth/server-side/nextjs), [Supabase changelog](https://supabase.com/changelog), [PostgreSQL 17 clock semantics](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT). Current TLS changes do not justify disabling certificate verification.

Stop before M07 conversations, work progress, rescheduling and completion. Payments remain M08.

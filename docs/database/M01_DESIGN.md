# Duzelo Milestone 01 — schema and access-control decisions

**State: unverified database candidate, NOT applied to any hosted Supabase project. Do not merge until the migration-reset, pgTAP and advisor gates pass.**

## Model

- `public` holds account profiles, manually published worker cards, service taxonomy and job workflow records.
- `private` holds exact client addresses, job locations, worker home/coverage, verification evidence paths, administrator membership, inspection grants, bank/provider/payment records, outbox, command idempotency and audit logs.
- `extensions.postgis` provides geography points and GiST spatial indexes.
- No customer or worker can directly INSERT/UPDATE/DELETE domain rows. The authenticated server command layer planned for Milestones 02–08 must recheck session, ownership, role, status, quotas and payment invariants; a `service_role` key bypasses RLS, so never put one in browser code or a public endpoint.
- No `SECURITY DEFINER` helpers and no private Data API schema. RLS is enabled on every app table. Public SELECTs require explicit grants and scoped policies; separate sanitized review API is required to publish reviews.
- Administrative membership is provisioned by an approved operator. Membership does not automatically grant Data API access. Verification requires a separate active owner/verification admin; workers cannot approve their own credentials.
- Worker cards cannot be published unless worker status is approved, the account unsuspended, identity evidence reviewed and current, service offerings active, and category-specific trade evidence reviewed where required. Any verification change deletes the card; suspension or status changes delete it too. Expired credentials hide it via RLS until cleanup.
- **Milestone 01 deliberately publishes no location coordinates at all.** `worker_cards.approx_marker` is forcibly NULL. Later MapLibre discovery must migrate to a reviewed, coarse **town-centroid** lookup model; it must not copy `private.worker_coverage.base_point` into public cards.
- Matching preview is restricted to workers who own active approved cards and have unexpired, active invitations for the requested category. Unknown workers cannot use `requested_worker_id` alone to bypass a match.
- Audit and booking event history are append-only by a trigger even if a privileged app command attempts UPDATE/DELETE.

## Decisions held for later milestones

- Server-side command API, OTP, SMS provider, signed Storage URLs, private document buckets, and MFA are NOT implemented.
- Payment integration is NOT enabled and no escrow semantics are claimed.
- Business teams are phased; current business links require the owner to be the same worker identity.
- No runtime Supabase credentials or project URL are added to Duzelo or Vercel.
- The reference `02_SCHEMA_BLUEPRINT.sql` and `03_RLS_BLUEPRINT.sql` are source material only, not deployable migrations.

## Local verification workflow

Run `node scripts/verify-db-baseline.mjs` as an inexpensive review aid, then use a **new isolated local database** with Supabase CLI `supabase db reset` twice and `supabase test db`. Verify pgTAP case outcomes, RLS policies and suspicious privilege grants under real role impersonation. Run security and performance advisors on the dedicated project, not an unrelated application. Inspect `supabase/tests/manual/geo_explain.sql` against a representative (fictional) dataset. The open PR must remain unmerged until the real database and deny tests are green.

The repo's developer has not selected which Supabase organization should own the new project. Project creation may add billing; no project can be created or charged without the required organization/cost confirmation.

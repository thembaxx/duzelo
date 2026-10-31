# Duzelo Milestone 01 — PostGIS database and RLS staging gate

**Status: UNVERIFIED migrations; no Supabase project has been created or modified.**

The 2026-10-31 Supabase changelog includes breaking changes about default Data API exposure. This migration deliberately uses grants only on selected public tables and requires row-level policies. Consult [current Supabase docs](https://supabase.com/docs/guides/api/securing-your-api) before deploying.

## Environment isolation

Duzelo requires a **new dedicated project**, not existing Tally or Subzero data. The connected Supabase account currently lists only the **themba** organization; the operator must explicitly select an organization and approve any non-zero project cost before creating this project. Never write schema to existing unrelated Supabase databases.

Use local PostgreSQL/Supabase for migration testing first. This workspace lacks a running Supabase CLI and container runtime; do not treat static validation or Vercel builds as SQL/pgTAP execution.

## New migrations

- `20261031153500_initial_schema.sql`: versioned baseline derived from the reference `02_SCHEMA_BLUEPRINT.sql`, **not copied blindly**. 36 public/private tables, PostGIS under `extensions`, sanitized town-centre worker cards, identity/trade status guards, composite quote/booking FKs, private points, admin roles, financial ledger, immutable audit.
- `20261031153600_access_controls.sql`: role grants, RLS read policies, no direct client mutation privileges, no anonymous access to private schema.
- `seed.sql`: fictional taxonomy only, no people, credentials, ratings or bookings.
- Two transactional pgTAP tests: guest, owner, unrelated client, matched worker, draft/suspended worker and admin; approval, address authorization, GIS indexes, private schema, append-only evidence and quote FK.
- `npm run db:contract`: fast **structural checks only**, not a PostgreSQL execution environment.

## Mandatory local verification before any hosted migration or merge

1. Install an audited/pinned Supabase CLI release and compatible container runtime, then `supabase --help` and `supabase migration --help`. Review migration filenames against CLI-generated conventions.
2. From repo root, run `supabase start`. Run `supabase db reset --local` against the **local** database only (destructive locally) and verify both migrations and seed complete.
3. Run `supabase test db` to execute **all** pgTAP assertions. Intentionally invert one policy and demonstrate at least one test fails, then restore policy.
4. Run `supabase db lint --local` and `supabase db advisors` or equivalent. Inspect invalid foreign keys, functions, leaked grants, RLS recursion and dangerous security definer functions.
5. Query `pg_class`/ACL to prove **every public/private application table** has RLS enabled, all unrelated authenticated users see zero private records, and no client has DML privileges. Verify `spatial_ref_sys` is **not** installed under `public`.
6. Test `ST_DWithin` with GIST/EXPLAIN and fictional rural-area geometry. Verify no location coordinates in browser network payloads.
7. Only after local success, create an isolated Duzelo project in the selected organization, run migrations first on a non-production environment, re-run advisors/role tests, and record results.

## Non-negotiable blockers before enabling live accounts/discovery

- Migrations/pgTAP must be executed against a real isolated database and all critical cases pass.
- Introduce safe storage buckets and explicit storage authorization rules before any ID uploads.
- Implement a server-side command layer with authenticated actor, explicit role checks, transactions, idempotency keys and auditing. A service-role key bypasses RLS and may **never** reach the client.
- Schedule independent verification expiration/unpublishing (time passing does not fire DB update triggers). No real worker can be publicly discoverable before this works.
- Approved category status and worker cards must not be assumed real until manual verification workflows are built; `featureFlags` remain off.
- Never expose private schema in the Data API.

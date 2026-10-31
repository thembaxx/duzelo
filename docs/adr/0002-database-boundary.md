# ADR 0002 — Read-only Data API and private command boundary

Date: 2026-10-31. Scope: Milestone 01 local database foundation. Supabase CLI 2.122.0 / PostgreSQL 17. The root SQL files remain reference artifacts.

## Decisions after blueprint review

- Keep a modular monolith and read-only browser roles. All application tables have RLS. No anonymous/authenticated DML grants or write policies. Disable automatic table exposure/grants for future tables. The local API exposes only `public`.
- Exact addresses/coordinates, coverage, verification evidence, business registration, inspection grants, staff membership, payout/payment/provider records, notification outbox and audit remain in `private`, with no browser schema usage. Even an administrator's browser cannot directly read private evidence; future commands must validate identity, MFA, ownership/capability and reason, then return minimal DTOs.
- Use `SECURITY INVOKER` throughout. There are no definer policy helpers or privileged views. Policies form a directed dependency graph: profiles → matches → jobs → bookings → events; membership → conversations/messages. Policies do not call back into dependent tables.
- Direct and dispatched requests use the same `(job_id, worker_id)` match authority. Quotation FK, same-job/worker composite booking FK, booking uniqueness, priced-vs-inspection guards, immutable accepted quotes/items and immutable accepted booking references prevent contradictory cross-links. Transactional acceptance/idempotency behavior is implemented in milestone 06, not claimed here.
- Public worker cards are server-controlled publication projections. A private invoker publisher requires approved/non-suspended worker, an independently reviewed identity and valid category-specific credentials from active staff. Business workers additionally require business review. No user metadata or self-review grants publication. Public markers must equal curated coarse area centroids. Visible services must belong to published category IDs.
- Eligibility changes unpublish cards. Publication/expiry calculation and invalidation serialize through one conservative transaction advisory lock; volatile eligibility reads take a fresh snapshot after any wait. Two-session tests cover revocation before and after publication. This deliberately prioritizes correctness over publication throughput during the pilot. A server-derived `safe_until` hides expired cards even before a cleanup job runs. Changes to staff, businesses, categories or areas conservatively unpublish cards; later commands may republish after validation. Trade expiry can leave another eligible category publishable. Genuine completed-job/rating aggregates are deferred; baseline constraints require zero/null rather than allowing invented statistics.
- Audit, ledger and booking events are append-only via revoked DML grants plus mutation/truncate-rejecting triggers. Actor/resource references retain evidence. Ordinary service-role commands cannot rewrite audit history. A database superuser can ultimately alter schema/triggers; this is not claimed as tamper-proof against the database administrator.
- Private inspection grants require the owning client and an invited worker, with bounded expiry constraints. Grants do not expose exact locations via Data API; future audited commands enforce time/revocation.
- Credentials, real private rows and generated schema dumps must stay out of build inputs and public assets. Synthetic seed SQL is source material only: application builds do not execute it or serve it publicly. Fixture seeds run only through explicit local development/test scripts and do not create usable OTP/password logins. With Auth disabled, Supabase supplies an id-only auth.users baseline; M02 must migrate/enable the real Auth service and create its own login fixtures.

## Deferred command controls

MFA, live identity/revocation, row locks, command request hashes, atomic outbox writes, actor-bound idempotency, file validation and provider reconciliation remain mandatory in their milestones. Existing tables are not permission to enable those features. `service_role` bypasses RLS: every future server command must authenticate/authorize before accessing data. There is no application privileged database client yet.

## Sources reviewed

- https://supabase.com/changelog.md — current index; relevant October 2026 Postgres/timezone fixes and upcoming TLS cipher change.
- https://supabase.com/docs/guides/database/postgres/row-level-security.md — explicit grants, RLS, view/definer risks and indexes.
- https://supabase.com/docs/guides/database/extensions/postgis.md — dedicated extensions schema, geography/GIST and indexable ST_DWithin.
- Installed CLI `--help` for init, migration new, db start/reset/query/advisors and test db; all local flags verified before use.

See milestone evidence for the exact installed database version, replay, pgTAP/advisor and EXPLAIN outcomes. A small fixture EXPLAIN is not a production performance benchmark.

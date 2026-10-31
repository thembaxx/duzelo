# Milestone 01 — test fixtures and verification

All accounts, job requests and address examples in `supabase/tests/database/01_rls_guards.test.sql` are fictional. The test runs in an explicit transaction and always rolls back. No account is created by the production seed migration.

## Prerequisites

- New isolated, empty Supabase project, with owner-selected organization and approved cost.
- **Pinned CLI: Supabase v2.122.0** (stable release 23 October 2026). Use `npx --yes supabase@2.122.0 --version` and then the same version for `start`, `db reset`, `test db` and `db advisors`; inspect `--help` on the installed version. Docker and local Postgres 17 support required. Do not point test commands at production.
- `supabase start`, `supabase db reset`, `supabase test db`, `supabase db advisors` (or connected Supabase security/performance advisors).

## Acceptance gates

- Cold `supabase db reset` twice, with matching results; both migrations and seed apply repeatably only to an isolated test DB.
- `supabase test db` must report **all pgTAP assertions passing**, across anonymous, client, matched worker, unrelated worker, suspended worker and a nominal admin who is *not* automatically privileged.
- Inspect `supabase/tests/manual/geo_explain.sql` on a representative data set: GIST index exists, acceptable ST_DWithin plan; no exact point is in public payload.
- Security advisors clean or findings independently resolved; also run performance advisors.
- Negative checks: no client write grant, no cross-tenant job/quote/message/document access, self-verification or business-owner linking, SQL cross-reference constraints and append-only audit updates.
- Browser 390×844/1440×900 QA: existing interface, theme persistence, search, reduced-motion and protected-route fallback.
- No credential or private data emitted in a public schema, SQL seed or Next.js bundle.

**Until these gates are observed on an actual dedicated database, the migration remains UNVERIFIED and the PR MUST remain open.** SQL parser/static checks or an unrelated Supabase project cannot substitute for a genuine migration reset and authorization tests.

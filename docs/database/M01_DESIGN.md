# Duzelo Milestone 01 — reviewed isolated database baseline

**State: open PR. No Duzelo-hosted Supabase instance created or modified.**

The database portion of this PR uses the source migration and deterministic fictional tests from [PR #2](https://github.com/thembaxx/duzelo/pull/2). The source branch passed GitHub Actions run [41199771269](https://github.com/thembaxx/duzelo/actions/runs/41199771269), including PostgreSQL 17 reset, 80 pgTAP assertions, two concurrent publication races, security advisors, SQL lint and GiST EXPLAIN. That evidence applies to the SOURCE branch, not automatically to this integration branch.

This PR deliberately retains Duzelo's existing main-branch React/Next.js UI, including Geist Serif, theme and animation. It does NOT merge the unrelated, alternate Milestone 00 foundation from PR #1.

## Security contract

- Exact addresses, worker home bases/coverage, verification files, financial records and administrative membership remain in the non-exposed private schema.
- PostGIS resides in extensions. Public worker location is a curated coarse town marker, never the private base. No browser DML grants.
- Worker cards require a transactionally serialized, admin-controlled publication command and reviewed credentials. Workers may not self-verify.
- Public job reads are restricted by actual participation and conservative RLS. Audit, ledger and booking evidence cannot be retroactively rewritten.
- Stage paid/sensitive functions OFF. No phone OTP, worker bookings, checkout or production auth/storage credentials.
- No fictional real-world worker data is published. Local fixtures are synthetic and local-only.

## Verification needed before merge

1. New branch-specific GitHub Actions database job: `npm run db:start`, `db:reset`, `db:test`, `db:concurrency`, `db:advisors`, `db:lint`, `db:explain`.
2. The app's normal Vercel `npm run check` (includes static migration contract, lint, type, unit and build).
3. Rerun local migration reset independently if the source/schema changes. Do not assume passing PR #2 means this port passes until branch checks report success.
4. No remote Duzelo database or organisation will be created without the user selecting the organisation and confirming nonzero quoted cost.

Only merge when both database and application checks pass. Do not apply migration to tally-sync, subzero or any other existing user's Supabase project.

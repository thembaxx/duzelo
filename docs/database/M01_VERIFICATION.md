# Duzelo Milestone 01 — reviewed isolated database baseline

**State: merged into main via [PR #7](https://github.com/thembaxx/duzelo/pull/7) on 31 October 2026. No Duzelo-hosted Supabase instance created or modified.**

The database portion of this PR uses the source migration and deterministic fictional tests from [PR #2](https://github.com/thembaxx/duzelo/pull/2). The source branch passed GitHub Actions run [41199771269](https://github.com/thembaxx/duzelo/actions/runs/41199771269), including PostgreSQL 17 reset, 80 pgTAP assertions, two concurrent publication races, security advisors, SQL lint and GiST EXPLAIN. That source evidence was supplemented by independent integration-branch testing: [run 41220272585](https://github.com/thembaxx/duzelo/actions/runs/41220272585), with two successful fresh database resets, 80/80 pgTAP checks, both concurrent publication/invalidation races, advisors, SQL lint and spatial EXPLAIN; and the application quality gate and 2/2 Playwright desktop/mobile smoke tests. Merge SHA: `03dc10c06bf6e28712043f71dac53b48e0fddd2e`.

The merged implementation retains Duzelo's existing main-branch React/Next.js UI, including Geist Serif, theme and animation. It does NOT merge the unrelated, alternate Milestone 00 foundation from PR #1.

## Security contract

- Exact addresses, worker home bases/coverage, verification files, financial records and administrative membership remain in the non-exposed private schema.
- PostGIS resides in extensions. Public worker location is a curated coarse town marker, never the private base. No browser DML grants.
- Worker cards require a transactionally serialized, admin-controlled publication command and reviewed credentials. Workers may not self-verify.
- Public job reads are restricted by actual participation and conservative RLS. Audit, ledger and booking evidence cannot be retroactively rewritten.
- Stage paid/sensitive functions OFF. No phone OTP, worker bookings, checkout or production auth/storage credentials.
- No fictional real-world worker data is published. Local fixtures are synthetic and local-only.

## Verification completed before merge

1. Passed integration-branch GitHub Actions database job: `npm run db:start`, `db:reset`, `db:test`, `db:concurrency`, `db:advisors`, `db:lint`, `db:explain`.
2. Passed the normal Vercel `npm run check` (includes static migration contract, lint, type, unit and build).
3. Fresh reset performed twice, 80 pgTAP assertions and two race tests passed on the merged source branch. **Rerun locally if the schema changes.** Docker image-pull limits surfaced temporarily during CI but eventually recovered; treat future image failures as infrastructure errors, never as validation passes.
4. No remote Duzelo database or organisation will be created without the user selecting the organisation and confirming nonzero quoted cost.

**Both the database and app checks passed before PR #7 merged.** Do not apply the migration to tally-sync, subzero or any other existing user's Supabase project. The remaining gate is **new hosted project selection, approved billing (if any), staging provision and isolated deploy/secret management.** The test result is not a production database deployment.

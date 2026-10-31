# Local database baseline (Milestone 01)

This folder is for isolated development. It is not linked to any hosted Supabase project. The deployed foundation does not use it. Supabase CLI is pinned in the npm lockfile. Read `docs/adr/0002-database-boundary.md` before changing the schema.

```sh
npm ci
npm run db:start
npm run db:reset
npm run db:test
npm run db:concurrency
npm run db:advisors
npm run db:lint
npm run db:explain
```

The command wrapper rejects a hosted-project link, passes explicit `--local` where supported and accepts no additional arguments. Reset destroys **local test data only**. Do not run `db push`, `link` or a remote reset. `seed.sql` contains only synthetic, non-login adult fixture identities and synthetic addresses/coordinates. Never use it for hosted provisioning.

The original SQL blueprints are untouched. The fresh CLI-created migration is a reviewed derivative with stronger integrity, privacy, publication and append-only constraints. Auth, Storage, realtime, analytics and functions are disabled. API configuration exposes `public` only and disables automatic new-table grants; `private` is never in the exposed/search-path list. No Storage service or buckets are initialized in this database-only milestone. Evidence references stay private; milestone 03 must add private buckets, policies, file validation and signed-access commands before enabling Storage.

Migration evolution is additive: reset proves replay on a disposable database; rollback of a deployed database would require a separately reviewed forward repair and backup/restore plan. Dropping schemas is not a production rollback procedure. No remote migration is authorized by this local milestone.

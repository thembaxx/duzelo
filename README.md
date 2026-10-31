# Duzelo — Codex build pack

Status: specification and implementation blueprint; **not a deployed application**, production-ready migration, or legal certification.

**Design update (2026-10-31):** Light/Dark/System theme support and accessible motion are confirmed Milestone 00 build requirements. See [`docs/design/MOTION_AND_THEMES.md`](docs/design/MOTION_AND_THEMES.md) for the implementation contract, UX choreography and test gates. These changes are specifications, **not running UI features**.

**Duzelo** is a working name only. Complete CIPC trademark, domain, marketplace name and app-store clearance before making it permanent. The visual direction is provisional until the founder supplies reference photos.

Read in this order:

1. `01_PRODUCT_REQUIREMENTS.md` — complete PRD, experience, architecture, domain flows, security, tests, operations, launch.
2. `02_SCHEMA_BLUEPRINT.sql` — initial PostgreSQL/PostGIS schema **blueprint**. Must be reviewed, completed for production, applied to a local Supabase instance and migration-tested before deployment. Not a substitute for access-control tests.
3. `03_RLS_BLUEPRINT.sql` — default-deny / read-only client RLS examples. Requires schema blueprint first. Execute only after privilege review; no client-side direct writes. All financial records remain in private schema, fetched through authorized server DTOs.
4. `04_CODEX_MILESTONES.md` — ordered, copy-ready Codex tasks with acceptance gates.
5. `.env.example` — environment contract; no real credentials.

## Foundational constraints

- Single Supabase auth identity may be client, worker, or both.
- All privileged writes go through a server command layer; never trust a role or verification status from a browser. `service_role` must never be shipped to the client. The application is responsible for per-request authorization before using privileged SQL.
- Personal addresses, exact worker base locations, identity documents, payout details and raw provider payloads must **not** be returned via public endpoints.
- Online checkout uses an abstraction and is disabled until the South African merchant / settlement / refund workflow is independently validated. No escrow promises.
- No fabricated reviews or qualifications; no auto-verified workers.
- Every milestone must pass relevant lint, typecheck, tests, production build and negative authorization checks.

Generated 2026-10-31.

6. `AGENTS.md` — drop-in permanent Codex guardrails for the repository.
7. `00_START_HERE_CODEX_PROMPT.md` — single starter prompt for Codex.

**IMPORTANT:** The SQL files are migration design references, not tested migrations; PostgreSQL syntax parsing and migration execution could not be run in the current container. Codex must create a fresh Supabase CLI migration and test it against an isolated local database. The pack contains no deployed app or live service accounts.
8. `05_VALIDATION_AND_REFERENCES.md` — what was checked, what remains unverified and external documentation.

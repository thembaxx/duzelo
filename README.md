# Duzelo

Good help, close to home.

Milestone 00 application foundation with a Milestone 01 local database baseline for a South African local-services marketplace, starting in Piet Retief / Mkhondo. **Preview only:** no accounts, workers, bookings, matching or payments are active. Duzelo is a configurable working name. The founder’s references inform provisional tokens; no final logo or brand clearance is implied.

## Run locally

Use Node **24.19.0** (`nvm use`) and npm **11.9.0**. Exact direct versions and the npm lockfile are committed.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. All configuration is optional for this milestone. Blank Supabase settings work; **do not supply production credentials**. Public environment changes require a rebuild. The reserved `SUPABASE_SECRET_KEY` is server-only and unused. There is no privileged database adapter.

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run security:check
npx --no-install playwright install chromium
npm run test:e2e
```

Playwright starts the production server itself on port 3000; build first and keep that port free. On Linux, missing browser libraries may require an administrator to run `npx --no-install playwright install --with-deps chromium`. CI installs them on its isolated runner. `npm run check` groups formatting, lint, typecheck, unit and leakage scanning; **E2E and production build remain separate required checks**. There is no automated application deployment workflow. The founder subsequently authorized the [recorded Vercel foundation deployment](docs/evidence/vercel-deployment.md).

## What works

- Responsive public navigation, service taxonomy/detail pages, how-it-works, trust, help/install and limited legal preview notices.
- `/auth/sign-in` accurately reports unavailable authentication. `/app/client`, `/app/worker`, `/admin` always redirect server-side to it; changing cookies, selected mode or query parameters cannot grant access.
- English (`en-ZA`), dictionary fallbacks for `zu` and `ss`, ZAR and Africa/Johannesburg configuration. Unreviewed translations are not offered as functional languages.
- Tailwind 4, generated/adapted shadcn/ui Button/Card/Badge, configurable wordmark and semantic CSS tokens.
- PWA manifest and placeholder letter icons, production service-worker registration, update notice and generic offline fallback. Browser-menu installation on supported HTTPS/localhost origins. Only `/offline.html` is cached. Private routes/APIs bypass the service worker; no sensitive runtime caching.
- Zod environment validation, immutable OFF feature gates, server-only compiler guards, transitive client-import checking and CI.

All ten sensitive feature flags in `.env.example` accept only unset or literal `false`. Attempting to enable one fails validation. This is a development guardrail, not an authorization system. Full Supabase SSR refresh (`proxy.ts`), verified identities, database capability/suspension checks and admin MFA belong to Milestone 02; the unused read-only Supabase factory must not be wired into authentication before those exist.

## Controlling specifications

Read [AGENTS.md](AGENTS.md), [product requirements](01_PRODUCT_REQUIREMENTS.md), [ordered milestones](04_CODEX_MILESTONES.md) and the two SQL blueprints. **SQL is unexecuted reference material, not a migration.** The original nine supplied files are preserved in the baseline commit; the original README is also at [docs/build-pack-readme.md](docs/build-pack-readme.md). `MANIFEST.json` describes the original pack, not current application hashes. Its `.env.example` was not attached; the application example was reconstructed from the PRD and is not claimed to match that checksum.

## Architecture and evidence

- [Architecture](docs/architecture.md) and [toolchain decision with sources](docs/adr/0001-foundation-toolchain.md)
- [Security and permissions](docs/security.md), [domain boundaries](src/features/README.md)
- [Design decisions](docs/design-decisions.md) and [reference analysis](docs/design/reference-analysis.md)
- [Milestone 00 validation, exact outcomes and blockers](docs/evidence/milestone-00.md)
- [Changelog](CHANGELOG.md)

The application remains at Milestone 00; reviewed **local-only** migrations, synthetic non-login identities, RLS/pgTAP and geospatial checks are included for Milestone 01. See [local database setup](supabase/README.md) and [Milestone 01 evidence](docs/evidence/milestone-01.md). No hosted database, provider integration or real account workflow is configured. Stop after Milestone 01 until further instruction.

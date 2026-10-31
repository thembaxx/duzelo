# Duzelo

**Good help, close to home.**

Duzelo is an early-stage, mobile-first local-services marketplace for South Africa, starting with a Piet Retief/Mkhondo pilot. This repository now includes a **runnable Next.js 16 / React 19 prelaunch foundation**, along with the full product and engineering specifications.

> **Not yet a live marketplace:** Accounts, worker verification, worker matching, quotes, bookings, real messaging, location sharing, admin actions and payments are disabled. No worker has been verified or bookable through this implementation. Duzelo is a provisional brand pending clearance.

## Run locally

Prerequisites: Node.js 24 and npm 10 or later.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`.

### Quality commands

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

The optional browser smoke suite runs against a separate local or authorized deployment after installing Playwright's Chromium browser:

```sh
npx playwright install chromium
npm run build && npm run start
# In another terminal:
npm run test:e2e
```

To target an existing accessible deployment, set `E2E_BASE_URL` to its base URL. Tests do not bypass Vercel deployment protection.

## Implemented in Milestone 00

- Responsive home, service categories and detail pages, working category search, How it works, Trust and safety, appearance settings, prelaunch sign-in information and 404.
- Light, Dark and System themes; persisted choice, OS system following and semantic CSS tokens using `next-themes`.
- Accessible header/mobile navigation, focus styles, reduced-motion support, subtle CSS state transitions and a scoped GSAP hero entrance.
- Server-side redirects of `/app/client`, `/app/worker`, `/app/settings` and `/admin` until real Supabase session and role verification exists. **Redirects are not a replacement for secure backend authorization.**
- npm lockfile, Tailwind/PostCSS, TypeScript, Oxlint/Oxfmt, Vitest unit tests, opt-in Playwright browser smoke and manually triggered GitHub workflow.
- PWA manifest and provisional SVG icon. **Offline caching and PNG icon support are not complete**; do not call this an installable/offline-ready PWA.

No Supabase, payments, identity documents, storage buckets, geocoding keys or private user data are used in this milestone. Site indexing is disabled until launch.

## Product specifications

The files below remain authoritative for later milestones:

1. [01_PRODUCT_REQUIREMENTS.md](01_PRODUCT_REQUIREMENTS.md) — comprehensive PRD, workflows, architecture, access controls and acceptance gates.
2. [02_SCHEMA_BLUEPRINT.sql](02_SCHEMA_BLUEPRINT.sql) — untested PostgreSQL/PostGIS design blueprint. Do **not** apply directly to production.
3. [03_RLS_BLUEPRINT.sql](03_RLS_BLUEPRINT.sql) — untested restrictive RLS blueprint; server authorization required in addition.
4. [04_CODEX_MILESTONES.md](04_CODEX_MILESTONES.md) — progressive implementation plan.
5. [docs/design/MOTION_AND_THEMES.md](docs/design/MOTION_AND_THEMES.md) — motion, theme and accessibility contract.
6. [AGENTS.md](AGENTS.md) — contributor/Codex security and validation requirements.
7. [README-MILESTONE-00.md](README-MILESTONE-00.md) — foundation verification notes.
8. [05_VALIDATION_AND_REFERENCES.md](05_VALIDATION_AND_REFERENCES.md) — earlier blueprint validation limitations.

## Principles

Keep sensitive features fail-closed and server-authorized. Never claim escrow, real verified workers, working checkout or live availability without evidence. Avoid exposing exact addresses, worker home bases, identity documents, bank data or secret keys. Maintain real keyboard access, mobile performance and text-based action feedback in both colour schemes.

The app is prelaunch, and the founder will supply photography/design references when available.

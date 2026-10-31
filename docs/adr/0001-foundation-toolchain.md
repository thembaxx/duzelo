# ADR 0001 — Foundation toolchain and safe bootstrap

Date: 2026-10-31. Status: accepted for Milestone 00; branding remains provisional.

## Evidence and selection

Checked official documentation and npm `version`, `engines`, and `peerDependencies` before installation. Registry queries are point-in-time observations, not a promise that these remain latest. All direct dependencies are exact; `package-lock.json` fixes the transitive graph.

| Tool                      | Selected version | Compatibility evidence                                                                                                                                                       |
| ------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node / npm                | 24.19.0 / 11.9.0 | Execution runtime; Node 24 LTS line is used in CI and `.nvmrc`                                                                                                               |
| Next.js                   | 16.4.3           | Registry stable; Node ≥20.9; React 19 accepted; App Router/manual install documented                                                                                         |
| React / React DOM         | 19.3.1           | Matched stable pair; DOM peers require React ^19.3.1                                                                                                                         |
| TypeScript                | 7.0.2            | Registry stable; verified with Next type generation, `tsc --noEmit` and production compilation                                                                               |
| Supabase JS               | 2.118.0          | Node ≥22; runtime satisfies this                                                                                                                                             |
| Supabase SSR              | 0.12.7           | Requires Supabase JS ^2.114.0; exact paired versions satisfy it; SSR APIs remain beta/documentation-sensitive                                                                |
| Tailwind / PostCSS plugin | 4.3.3            | Matched pair; CSS-first tokens                                                                                                                                               |
| shadcn CLI                | 4.23.0           | Generated Button/Card/Badge using existing-project configuration; source owned locally; generator removed after generation to avoid unnecessary transitive advisory exposure |
| Oxlint / Oxfmt            | 1.90.0 / 0.75.0  | Native TS/React/Next.js/JSX accessibility plugins and TSX/CSS/JSON/YAML/Markdown formatting documented; verified here                                                        |
| Vitest                    | 5.0.5            | Node ^24 allowed; domain/security tests run in Node                                                                                                                          |
| Playwright                | 1.64.1           | Node ≥20; desktop/mobile Chromium emulation, matching managed browser                                                                                                        |

No experimental compiler, React canary dependency, CSS-in-JS, ORM, geocoder, payment SDK, map library, database CLI, push provider or broad state-management library is needed for this scope. MapLibre is retained as a confirmed later choice. Supabase clients are unused adapters with publishable keys only; there are no network calls to a Supabase project in M00.

## Decisions

Use a manually initialized Next.js App Router app in `src/` to preserve the controlling build pack. Strict TypeScript includes unchecked-index and exact-optional-property checks. npm is already available and provides a reproducible clean install. Oxlint/Oxfmt cover this app’s file types and rules without requiring experimental JS plugins; no ESLint/Prettier fallback is needed after local checks. The preserved build pack is excluded from formatter writes.

Next 16 uses `proxy.ts` for SSR token refresh. Do **not** ship a partial enabled auth path: M00 guards deny all identities and there is no Supabase refresh proxy or OTP endpoint; the M00 proxy only rejects protected route requests before streaming. M02 must add cookie refresh using `getClaims()`, verify fresh identity when needed with `getUser()`, use database-owned capabilities and enforce MFA for administrators. `getSession()` or user-editable metadata cannot authorize requests. Never publicly cache responses that carry auth cookies.

Dictionary-based localization avoids an unnecessary routing dependency in an English-only milestone. `zu`/`ss` dictionaries remain empty and fall back to English. Country-specific display formatting stays centralized.

A small custom service worker caches only a credential-free generic offline document. It does not implement push, offline data sync or page caching. Manifest and placeholder letter icons provide install scaffolding. Full update/real-device resilience work remains Milestone 10.

## Official sources consulted

- https://nextjs.org/docs/app/getting-started/installation — Node/TS requirements, React pair, manual installation and separate linting (retrieved 2026-10-31).
- https://supabase.com/docs/guides/auth/server-side/nextjs — redirected to creating-a-client; `@supabase/ssr`, cookie methods, `proxy.ts`, token verification and cache cautions (retrieved 2026-10-31).
- https://ui.shadcn.com/docs/installation/next — existing Next project, aliases and Tailwind prerequisites (retrieved 2026-10-31).
- https://oxc.rs/docs/guide/usage/linter/plugins — Next.js, React, TypeScript and JSX accessibility plugin coverage (retrieved 2026-10-31).
- https://oxc.rs/docs/guide/usage/formatter — supported formats and dedicated formatter workflow (retrieved 2026-10-31).
- https://nextjs.org/docs/app/guides/progressive-web-apps — manifest, browser installation, service-worker security headers (retrieved 2026-10-31).

Registry inspection command: `npm view <package> version engines peerDependencies --json` for each named tool. Peer engine constraints and local verification, rather than documentation examples alone, establish the tested combination. See validation evidence for limitations.

# Milestone 00 acceptance evidence

Date: 2026-10-31. Scope: foundation only. Runtime: Linux, Node 24.19.0, npm 11.9.0. Repository: https://github.com/thembaxx/duzelo. Baseline pack commit: `802882d`. No public deployment or provider/database provisioning.

## Final local verification

Exact commands, exit codes and elapsed times are also in [results.json](results.json). Full final command output is retained in [logs/](logs/). The final production build and scanner ran with an inert server-only test canary supplied through `SUPABASE_SECRET_KEY` / `SECURITY_SCAN_CANARY`, not a credential.

| Check                           | Exact command                                                                                                                           | Result                                                                                                                                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean lockfile install          | `npm ci`                                                                                                                                | Exit 0; 11.41s                                                                                                                                                                                                                                                 |
| Formatting                      | `npm run format:check`                                                                                                                  | Exit 0; all matched files formatted                                                                                                                                                                                                                            |
| Lint and boundaries             | `npm run lint`                                                                                                                          | Exit 0; Oxlint and transitive client/server check                                                                                                                                                                                                              |
| Strict TypeScript               | `npm run typecheck`                                                                                                                     | Exit 0; `next typegen && tsc --noEmit`                                                                                                                                                                                                                         |
| Unit/security                   | `npm test`                                                                                                                              | Exit 0; 4 files / 10 tests passed                                                                                                                                                                                                                              |
| Dependency scan                 | `npm audit --audit-level=high`                                                                                                          | Exit 0; **0 vulnerabilities**, including development dependencies                                                                                                                                                                                              |
| Production build                | `npm run build`                                                                                                                         | Exit 0; App Router static/SSG/dynamic pages and denial proxy built                                                                                                                                                                                             |
| Leakage scan                    | `npm run security:check`                                                                                                                | Exit 0; repository and 14 browser assets, server canary absent from assets                                                                                                                                                                                     |
| Production desktop/mobile smoke | `npm run test:e2e`                                                                                                                      | Exit 0; **12 passed**, 2 Chromium projects, 14.18s                                                                                                                                                                                                             |
| Diff whitespace                 | `git diff --check`                                                                                                                      | Exit 0                                                                                                                                                                                                                                                         |
| Negative runtime configuration  | `AUTH_ENABLED=true node node_modules/next/dist/bin/next start --port 3101`; repeated with a test-only `NEXT_PUBLIC_SUPABASE_SECRET_KEY` | Both returned HTTP 500 and logged redacted validation rejection; no test secret echoed. Next binds before instrumentation runs and leaves its process running; validation blocks serving the app rather than exiting the process. Test processes were stopped. |

Final acceptance run used `NEXT_TELEMETRY_DISABLED=1`. Environment/scanner canary: `LOCAL_BUILD_CANARY_NOT_A_CREDENTIAL_M00` (intentionally public inert string). Screenshots were captured from the production server. Recorded durations are observations, not performance benchmarks.

## Browser coverage

Playwright 1.64.1 / managed Chrome Headless Shell 156.0.8078.4. Desktop viewport **1440×900** and mobile viewport **390×844** (Chromium mobile/touch emulation). Each project exercises:

- Home content, real category navigation, keyboard skip link and focus, no page errors/console errors on this journey.
- Home axe WCAG 2 A/AA and 2.1 AA smoke: no detected violations. This is not full accessibility certification.
- Nine public/signed-out pages, one H1 each, no horizontal overflow, links return successful responses and unknown categories return 404.
- Client, worker and admin routes return HTTP 307 plus `no-store` even with forged identity/role cookies, headers and query parameters.
- Manifest/icons load; service-worker cache contains **only `/offline.html`** after navigating public and auth pages; public offline fallback works; auth navigation fails offline rather than returning a cached auth page; reconnect returns home.
- Keyboard mobile menu, truthful English/isiZulu/siSwati availability information.
- Additional no-overflow smoke at widths 320, 768 and 1024.

Screenshots (exact viewport dimensions; not full-page):

- [Mobile 390×844](screenshots/home-mobile.png)
- [Desktop 1440×900](screenshots/home-desktop.png)

Both screenshots were visually inspected. The founder’s images informed the tokens and component shapes, not fictional marketplace data or copied assets. See [reference analysis](../design/reference-analysis.md).

## Installation/generation history and resolved failures

The initial exact framework install was:

```sh
npm install --save-exact next@16.4.3 react@19.3.1 react-dom@19.3.1 @supabase/ssr@0.12.7 @supabase/supabase-js@2.118.0 zod lucide-react class-variance-authority clsx tailwind-merge @radix-ui/react-slot server-only
npm install --save-dev --save-exact typescript@7.0.2 @types/node@24 @types/react @types/react-dom tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3 oxlint@1.90.0 oxfmt@0.75.0 vitest@5.0.5 @playwright/test@1.64.1 @axe-core/playwright shadcn@4.23.0
npx --no-install shadcn add button card badge --yes
npm uninstall cn radix-ui
npm install --save-exact client-only
npm uninstall --save-dev shadcn
```

All exited 0. Resolved versions are pinned in `package.json` and `package-lock.json`; the final `npm ci` is the reproducibility check. Generated components were adapted to the existing local class utility and scoped Radix Slot. Removing the generation-only CLI removed six low/moderate transitive advisories without downgrading or force-fixing the application.

`npx --no-install playwright install --with-deps chromium` initially failed because this environment cannot authenticate as root. `npx --no-install playwright install chromium` then succeeded; existing system libraries supported the managed browser. The first E2E run began before that download completed and failed to launch browsers. No passing result was attributed to it.

Initial validation failures were corrected and rerun: accessible status markup/pure render lint; Zod invalid-URL refinement could throw before redaction; Vitest ESM config warning; Next’s late streamed redirect returned 200 (now denied before rendering by proxy plus server guards); service-worker first activation caused an unwanted page reload (now only an existing controller replacement reloads). Final browser results above supersede those failed attempts; they were not hidden or treated as passes.

## Security/diff review

Blueprint SQL and controlling specifications are byte-preserved. The original README is byte-preserved in `docs/build-pack-readme.md`; root README now documents the app. Supplied manifest checksums were compared for every attached original artifact. `.env.example` was listed in the manifest but not attached, so it was reconstructed, not falsely checksum-verified.

Reviewed the staged scope for public/private imports, credentials, fake authorities/data, route bypass, cache policy and migrations. No database migrations, worker records, address fields, privileged Supabase client, live provider adapter, mutation API or Server Action is present. Auth stubs never issue sessions. The regex/graph leakage checks are bounded regression checks, not an exhaustive audit or penetration test. No races in booking/payment commands are tested because those commands do not exist.

## Deferred checks and blockers

- **Milestone 01:** SQL syntax/runtime, local Supabase reset/migrations, PostGIS, grants/RLS/pgTAP, database integration and advisors were **not run**. They are outside M00, and the blueprints remain unexecuted.
- **Milestone 02 onward:** OTP/SMS deliverability, live SSR refresh/revocation, real capability/MFA checks, worker approval, matching, quotes, bookings, payments, notifications and provider integration tests were **not run or enabled**.
- Physical Android/iOS installation, Safari/WebKit/Firefox, real-device performance, full screen-reader audit, service-worker update lifecycle and production TLS were **not tested**. Chromium verifies manifest/offline scaffolding only.
- External brand/trademark/domain, merchant/legal/privacy validation and final imagery/sign-off remain open. Preview legal notices are not approved marketplace policies.
- Hosted CI is separate from the verified local results. Its status is reported with the PR; an unavailable or failed Actions run is never inferred green.

Rollback: revert the foundation PR; unregister the service worker/clear site data when testing. There is no migration or deployed resource to roll back. **Milestone 00 stops here; Milestone 01 requires a new instruction.**

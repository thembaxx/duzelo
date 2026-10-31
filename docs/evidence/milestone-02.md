# Milestone 02 — integrated account and design acceptance

Date: 2026-10-31. [PR #14](https://github.com/thembaxx/duzelo/pull/14).

Based on current main `2e1b1da`, preserving its editorial identity, original mark, Geist typography, Light/Dark/System controls, public PWA and existing tests. The reviewed M01 migration and seed are unchanged. A separate formatter-only commit normalizes pre-existing source to the repository's configured Oxfmt command; behavior is reviewed in the following commit.

## Implemented scope

Native local phone OTP, +27 normalization, generic responses, durable retry budgets, HttpOnly SSR refresh, fresh-user/session guards, same-identity client/worker modes, mandatory consent, transactional audited/idempotent owner settings, draft-only worker creation, suspension/global sign-out and operator-bootstrapped administrator TOTP/AAL2.

The founder's images and [Noe's thread](https://x.com/noechague/status/2116243745821937803) informed source-mapped choices, radio cards, mode links and phone progress in the current theme. `DESIGN.md` preserves the references and retrieval limits. Existing branding is preserved; there is no Marked account/MCP connection or borrowed artwork. PWA first-control reloads no longer clear form drafts, loopback development can register the worker, and onboarding bypasses its cache.

## Exact integration proof

[GitHub Actions run 41237200746](https://github.com/thembaxx/duzelo/actions/runs/41237200746), head `c63cb3e04f4fef63f82420c977be0f1ec19dc7fb`: **all three jobs passed**. `milestone-02/ci-results.json` records exact steps/timestamps; summary files preserve redacted result lines. Subsequent documentation/copy handoff commits are also gated by the PR checks before merge.

| Command / environment | Observed outcome |
| --- | --- |
| `npm ci` — 3 clean CI jobs | Passed, lockfile reproduced |
| `npm run format:check` | Passed locally and CI |
| `npm run lint` | Passed locally and CI |
| `npm run typecheck` | Passed locally and CI |
| `npm test` | 145 passed, 12 files, locally and CI |
| `npm run test:db:static` | Passed locally and CI; structural check does not replace SQL execution |
| `npm run build` — Auth OFF | Passed locally and CI (`npm run check` includes build) |
| `node scripts/check-boundaries.mjs` | Passed locally and CI, including transitive server-only imports |
| `npm audit --audit-level=high` | Passed locally and CI, 0 vulnerabilities |
| `npm run security:check` | Passed locally and CI; source/browser patterns plus CI build-secret canary |
| `npm run test:public` | All 8 existing public production browser scenarios passed locally and CI |
| `npm run db:start`, `npm run db:reset` — isolated CI | Passed; fresh replay of reviewed migrations |
| `npm run db:test` — isolated CI | 93 pgTAP assertions, 4 files, passed |
| `npm run db:concurrency` — isolated CI | Both existing concurrency cases passed |
| `npm run db:advisors` — isolated CI | Passed, no security issues found |
| `npm run db:lint` — isolated CI | Passed, no application schema errors found |
| `npm run db:explain` — isolated CI | Both candidate plans use worker-coverage GIST index |
| `npm run auth:start`, `npm run auth:env` — isolated CI | Passed; native local stack, ignored permission-restricted environment |
| `npm run test:auth` — isolated CI | Auth-enabled production build and actual server-secret canary scan passed; all 4 full native Auth scenarios across 1440×900 / 390×844 passed |

Individual local check/build/public-browser logs are committed under `milestone-02/`. The managed workspace's 7.9GB Docker VFS storage could not hold the full native stack, so database/Auth verification ran on GitHub's isolated runner. Failed local storage attempts are not reported passing. No live SMS provider was contacted.

## Assertions exercised

- Wrong OTP, resend cooldown, strict extra-field rejection, cross-origin refusal and five-attempt lockout; correct fixed fixture OTP issues a real native session.
- One ID persists across client/worker modes, worker status stays draft, settings persist across reload and theme changes preserve the live form draft/selected mode.
- Same actor/key/payload performs one write/audit; key reuse with changed input returns conflict.
- HttpOnly/Lax cookies, native refresh-cookie persistence using an expired SDK cache hint with untouched signed tokens; native session `not_after` expiry and global sign-out/replayed cookies are denied separately.
- Suspension blocks workspaces and commands; signup/admin query hints cannot grant staff rights; private membership plus native TOTP/AAL2 is required.
- Phone-only admin setup fails closed until a verified operator email exists. An explicitly fictional local email fixture exercises native MFA; this does not test email delivery/linking.
- Rejected worker gets no job/match/published-card entitlement. Browser roles cannot update capabilities/suspension or call/read private SMS/rate data. Baseline RLS/privacy/integrity and concurrency checks still pass.
- Axe WCAG 2 A/AA and 2.1 AA checks at sign-in/onboarding; existing public keyboard, theme, reduced-motion, category filtering, offline/cache and 320px overflow scenarios remain green.

Auth artifacts disable traces/videos/failure screenshots. Only blank sign-in and explicitly fictional onboarding screenshots are retained. No `.env.auth-test`, cookie state, MFA key or raw provider response is committed. Source/browser pattern scanning is evidence, not proof of absence of every possible secret.

## Screenshots inspected

- [Public home 390×844](screenshots/integrated-home-mobile.png) / [1440×900](screenshots/integrated-home-desktop.png).
- [Local sign-in 390×844](screenshots/auth-sign-in-mobile.png) / [1440×900](screenshots/auth-sign-in-desktop.png).
- [Dark fictional onboarding 390×844](screenshots/auth-onboarding-mobile.png) / [1440×900](screenshots/auth-onboarding-desktop.png).

## Release limits

Production Auth stays OFF. Hosted organization/project selection, TLS database credentials, live SMS delivery, production hCaptcha, administrator email ownership/recovery and release legal terms require operator/provider setup and tests. Native TOTP's email requirement and the inert local provider gate are documented in ADR 0003. Notification preferences do not activate delivery.

No hosted schema change, payment provider, matching, worker approval or M03 document flow is enabled. Stop before Milestone 03.

# Security scope and guardrails

M00 has no credentials, account collection, production data, SQL execution, provider calls or write endpoints. All workspaces are inaccessible. Real authorization is a later milestone; an always-denying stub is not a completed auth system.

## Enforced now

- Server-only poison imports in configuration, identity/guards and Supabase server adapter. `npm run lint` additionally checks transitive local imports from client components. Unit regression proves a server module hidden behind a barrel is rejected.
- All sensitive feature gates are immutable OFF, validated at server startup and rendering. Unset or literal `false` is accepted; malformed/true flags fail closed. Public-prefixed privileged environment variable names are rejected. Zod errors are redacted.
- Only a publishable Supabase key is accepted for the optional public client contract. Privileged keys have no adapter and no business operation. No `getSession()` or `user_metadata` authorization exists.
- Client/worker/admin pages reject everyone, including forged headers, cookies and query role hints. Dynamic protected routes and auth have `private, no-store` response headers.
- Service worker caches only `/offline.html`. No runtime page/API/static-asset caching. `/app`, `/admin`, `/auth`, `/api` bypass interception entirely. RSC/prefetch responses do not enter cache. No notification subscriptions or geolocation.
- No browser production source maps. Repository and `.next/static` leakage scan for private keys, known credential patterns and service-role JWTs, with an optional build canary. This pattern scan cannot prove the absence of every possible secret.
- Baseline clickjacking, MIME, referrer and restricted permissions headers. CSP limits frame ancestors, objects, base and form actions. A full nonce-based script CSP is deferred and is not claimed here.
- CI uses read-only GitHub permissions, pinned actions, clean installs, checks, audit, production build and production browser smoke. CI has no deployment or production environment credentials.

## Threats tested

Forged identity on every workspace; attempts to enable any unfinished gate; malformed environment origin; transitive client import of a server module; manifest/icon availability; only generic document in Cache Storage; public offline fallback; accessibility and navigation smoke at desktop/mobile sizes.

## Required before later features

Verified cookie sessions and `proxy.ts` refresh; per-resource ownership, trusted capabilities, suspension and administrator MFA; secure cookie attributes and CSRF/origin controls on mutations; rate limits/CAPTCHA; database RLS/grants and storage policies; idempotency/transaction/race tests; audited document access; legal/provider review. Exact private addresses, worker bases, verification evidence, payout details and raw financial/provider events must never be exposed by public DTOs.

Database integration/pgTAP, real session refresh, revocation, provider webhooks, penetration testing and actual device installation have not been exercised in this milestone. Do not run the blueprint SQL against a project.

# ADR 0003 — native phone sessions and account commands

Status: implemented for isolated local verification; hosted authentication stays OFF.

## Decision

Use the existing pinned Next 16.4.3 / React 19.3.1 / TypeScript 7.0.2 and Supabase SSR 0.12.7 / JS 2.118.0. Supabase CLI remains 2.122.0. Add PostgreSQL driver `postgres` 4.0.0 (Node ≥20, compatible transaction typing with installed TypeScript); commit the exact lockfile. Do not fork Supabase Auth or invent sessions.

`proxy.ts` calls native `getClaims()` and persists refresh cookies to both the request and response. Server components and commands independently verify signed claims, fresh `getUser()`, phone confirmation, the native `auth.sessions` row/expiry and database capability/suspension state. An old signed access token after global sign-out does not grant access. Refresh headers and private responses use no-store. HTTP-only, same-site Lax cookies replace browser token access; Secure is required for HTTPS. The RSC adapter is read-only, route handlers write cookies. Identity is never cached across requests.

Public taxonomy is independent of Auth. A local-only configuration accepts only loopback app/Auth/database endpoints and fixture phones. Hosted mode requires HTTPS, a server-only publishable key, TLS-verified PostgreSQL, approved SMS configuration and hCaptcha keys. `SMS_PROVIDER_APPROVED` is an operator release assertion, not proof of delivery or a provider health check. Hosted hCaptcha is verified server-side for the configured hostname and forwarded to native Auth. Hosted delivery and CAPTCHA still need a configured-provider test before release.

The direct PostgreSQL pool is server-only and privileged; it bypasses RLS. Account commands must therefore derive the actor from the verified session, not input. Profile/preferences writes recheck native session and suspension inside a transaction, use actor-bound idempotency keys/request hashes and append immutable redacted audit events. Capabilities can be added but cannot approve a worker. The first worker row is always draft. Browser roles retain no DML grants. Provider MFA enrollment/challenge/sign-out use native Auth's transactions and audit records.

OTP sends have generic responses, a shared-origin budget and HMAC-hashed phone/action buckets, advisory-lock serialization, a 60-second send cooldown and five verification attempts per 15 minutes. The app deliberately does not trust arbitrary IP forwarding headers. Native Auth's own limits are additional controls. This does not claim a sophisticated per-IP abuse detector. Failed code responses are generic; public JSON bodies are bounded and mutations require exact same-origin JSON. Critical-alert SMS remains OFF.

## Local phone adapter and MFA compatibility

The CLI requires an enabled SMS provider to expose native phone routes even when test OTPs and a send hook exist. Local config uses inert Twilio-shaped placeholders **only to enable that native gate**. The private invoker send hook allows three fixture numbers and returns without delivery. Fixed OTP `123456` belongs only to those isolated fixtures. No live provider is contacted. Never copy this local adapter or credentials into hosted configuration.

The native Auth TOTP implementation generates its account label from `user.GetEmail()`. A phone-only account cannot complete that upstream setup. Require an independently verified email for operator-bootstrapped administrator accounts before enrollment; never fabricate an address or auto-verify it in the application. The UI fails closed with an operator prerequisite message. Ordinary phone accounts need no email. The local test operator supplies an explicitly fictional verified-email fixture to exercise real native TOTP; this is not an email-delivery or account-linking test. Public Google/email signup and linking remain OFF. Native MFA must yield AAL2 and a verified factor, in addition to active private membership, before `/admin` opens. There are no administrative business mutations yet.

## Operations and rollback

`supabase/operations/bootstrap-admin.sql` is a manual approved-operator transaction, never a signup/seed action. Supply an existing independently verified phone/email identity and a redacted reason; inspect the affected row and audit event. Arrange email ownership verification through approved Supabase operator procedures before running it. The app has no self-admin API or automatic identity merge. Recovery/re-enrollment must remain a reviewed operator process.

Disable `AUTH_ENABLED` to close account access. Remove active admin membership to revoke staff access. Do not drop the additive profile columns or rewrite Auth tables as a production rollback. Local tests are destructive only to disposable fixtures and reject a linked checkout. No hosted schema migration or auth-provider provisioning is included.

## Sources read

- https://supabase.com/docs/guides/auth/phone-login — phone OTP, provider configuration and test phones.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client — SSR clients, Next proxy refresh and response cookies.
- https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook — private send adapter permissions and hook contract.
- https://supabase.com/docs/guides/auth/auth-mfa/totp — enrollment/challenge/assurance.
- https://github.com/supabase/auth/blob/master/internal/api/mfa.go and `internal/models/user.go` — TOTP AccountName/email prerequisite checked against native local failure and passing verified-email test.
- Installed `@supabase/auth-js` source — claims verification, refresh expiry behavior and typed MFA APIs.
- https://github.com/porsager/postgres — driver v4 transaction API, Node support and TLS configuration.

See milestone evidence for observed CI outcomes and the managed workspace disk limitation.

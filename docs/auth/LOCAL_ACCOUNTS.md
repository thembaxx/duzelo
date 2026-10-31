# Milestone 02 isolated accounts

Production phone Auth remains OFF. `src/features/auth` now implements native local Supabase OTP/session handling, account modes, owner preferences, suspension, global sign-out and administrator MFA. Existing `src/lib/auth` validators and return-path contracts remain intact; account commands use fixed internal destinations and fresh native identities rather than trusting a client-provided snapshot.

Use Node 24, Docker and an **unlinked disposable checkout**:

```sh
npm ci
npm run auth:start
npm run db:reset
npm run auth:env
npx --no-install playwright install chromium
npm run test:auth
```

Reset destroys local fixture data. The generated `.env.auth-test` is ignored, permission-restricted and never printed/uploaded. Tests build with explicit local configuration and scan browser assets with the actual server-secret canary. For interactive development:

```sh
node --env-file=.env.auth-test node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Open http://127.0.0.1:3000. Local fixture phones `0820000001`, `0820000002`, `0820000003` use `123456`; no SMS is sent. Inert Twilio-shaped configuration enables the CLI's native phone route; a private allowlist hook overrides delivery. Never copy this configuration to hosted settings. Native Auth owns real users/sessions/factors; M01 synthetic IDs cannot log in.

`AUTH_ENABLED=false` is the default. Explicit local mode rejects non-loopback endpoints. Hosted mode additionally requires approved SMS, server-verified hCaptcha, HTTPS and TLS-verified PostgreSQL; provider delivery, CAPTCHA, legal release terms and organization/hosted database setup still need operator review/testing. Do not use unrelated existing projects or create billed resources implicitly. Public Google/email Auth and other sensitive capabilities stay OFF.

`onboard` and `preferences` are same-origin JSON commands with strict schemas, actor-bound idempotency hashes, native session/suspension rechecks inside transactions and append-only audit. They can add owner capabilities and a worker **draft**, never verification, jobs or payment rights. Notification settings persist preferences but do not send messages.

Admin membership is a manual approved-operator operation in `supabase/operations/bootstrap-admin.sql`. It requires an existing independently verified phone/email identity, a redacted reason and audit inspection. Native TOTP requires the verified email label; the app never invents or self-verifies it. Native AAL2 and active private membership are required for `/admin`; no business mutation is exposed there. The native test uses an explicitly fictional operator-owned email fixture, not a delivered-email test.

See [ADR 0003](../adr/0003-authentication.md), [design/source mapping](../../DESIGN.md) and [verification evidence](../evidence/milestone-02.md). The newer current-main brand, fonts, themes, PWA and public routes are preserved. Account surfaces use those semantic tokens; they have no decorative GSAP choreography. The Auth-OFF public smoke suite is now self-starting via `npm run test:public`.

Stop before Milestone 03. No hosted migration, provider account, matching, payment or worker approval is authorized by these local tests.

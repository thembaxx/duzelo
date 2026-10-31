# Duzelo — Milestone 02 organization and phone-auth security gate

**Status: pre-provisioning preparation only. No hosted Duzelo project, SMS account or production credentials configured.** Keep `featureFlags.phoneAuth` disabled.

## A separate Supabase organization first

1. Sign in to [Supabase dashboard](https://supabase.com/dashboard/new) as the owner of Duzelo. In the organization selector choose **New organization**, named **Duzelo**, on the **Free** plan if eligible. **Stop before project creation or payment checkout.** The connected Supabase integration can list organizations and create projects, but not organizations.
2. Confirm organization ownership in the dashboard. Keep the existing `themba` organization (`tally-sync`, `subzero`) entirely out of scope; do not transfer, pause, reuse, migrate or alter their projects.
3. Verify the new organization appears in connected Supabase `list_organizations`. Only then request a project cost quote for that **specific new organization** using the Supabase tool. **If the quote is not zero, obtain explicit founder approval before confirmation or provisioning.** Do not assume an extra free quota: Supabase's two Free projects are shared across the organizations where the person is an owner/administrator, and paused projects are treated separately.
4. After project cost approval (if needed), create a **new isolated** `duzelo` project in an appropriate supported region selected with the founder. Record its project ID and plan; restrict access, billing alerts and API exposure. Never commit IDs, URL secrets or project keys into app source.
5. Apply the reviewed migrations from `supabase/migrations` against the new empty project only after preflight. Compare migrations/extension placement, run security and performance advisors, verify RLS grants, test permissions against fixtures without exposing personal data, and separately validate staging. Seed scripts are **fictional development fixtures**; do not deploy them to a live user environment.

**Why Free still needs a billing review:** Supabase organization billing is separate, but free project entitlement is shared across the user’s organizations. A third active project may require a paid subscription. Do not assume the cost or silently upgrade.

## Phone OTP implementation gate (after isolated project exists)

- Use current pinned, documented `@supabase/supabase-js` and `@supabase/ssr`, reviewing compatibility with this repository's Next.js App Router/Proxy API. Add them and their lockfile together in a subsequent scoped PR, rather than adding unused dependencies now.
- Supabase Auth must be enabled **only in an isolated staging project first**, with a selected SMS provider and test numbers; real SMS can incur per-message costs, so request approval first. Never commit provider credentials.
- Normalize locally supplied South African numbers to E.164 using `normalizeSouthAfricanMobile()`, rejecting other international country codes for the initial launch. This checks formatting only; the provider still determines deliverability and owns verification.
- Implement real `signInWithOtp({ phone })` + `verifyOtp({ phone, token, type: 'sms' })`. Test first with configured provider test phone numbers, not a fake success screen; never expose the test OTP in production. Provider success must not be inferred from a redirect.
- Add CAPTCHA, per-IP and per-number throttles, generic enumeration-safe errors, SMS abuse/spend limits, maximum verification attempts, a 60s UX resend countdown, safe retry/backoff and uniform failure messages. The **server/Supabase** must enforce the controls; `resendCountdownSeconds()` is UX-only and cannot authorize sending.
- Use cookie-backed server-side sessions with Next.js 16 `proxy.ts` to refresh/verify claims. Prefer verified `getClaims()` or `getUser()` for authorization; do not trust `getSession()` payloads or user-editable `user_metadata`. Add session-expiry, account-suspension, dual-role and admin MFA bypass-denial tests. One user is one identity whether they are client, worker or both.
- Profile updates must use session-validated, idempotent server commands rather than direct anonymous/authenticated writes; Milestone 01's deliberate DML-deny RLS remains in place. Client/worker mode is a **view preference**, never proof of permission. Admin membership stays server granted and staff actions require MFA.
- Retain secure, accessible public prelaunch UI until actual OTP provider, staging auth, RLS, CSRF/session and mobile/desktop E2E checks pass; do not display a fake active login form or expose role routes early.
- Before enabling production phone auth, document owner approval, billing, rate limits, POPIA purpose/transparency notices and tested failed/expired OTPs. Then change the feature flag in a narrowly scoped, verified launch PR.

## Evidence

- [Supabase organization / Free entitlement](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase new organization](https://supabase.com/dashboard/new)
- [Phone login and provider requirements](https://supabase.com/docs/guides/auth/phone-login)
- [Phone auth tests](https://supabase.com/docs/guides/auth/testing-auth-flows)
- [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Next.js SSR auth clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

## Pre-provisioning checks

```sh
npm ci
npm test -- src/lib/auth/phone.test.ts src/lib/auth/readiness.test.ts
npm run check
```

None of these checks verifies real SMS, database authentication or session cookie behaviour. Those require a dedicated isolated Supabase project and live integration tests.

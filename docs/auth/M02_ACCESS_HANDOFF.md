# Duzelo M02 — workspace guards, navigation, and organization isolation

**State:** local TypeScript security contracts and unit tests; **no active phone sign-in, session adapter, account writes or remote Supabase project**. Keep `featureFlags.phoneAuth=false` and all gated marketplace features off.

## Implemented as preparation

- `src/lib/auth/navigation.ts`: canonical, *allowlisted* internal post-login paths only; rejects external/protocol-relative URLs, encoded path separators, traversal, fragments, queries and ambiguous slashes. Do not use arbitrary `next` redirect strings.
- `src/lib/auth/access.ts`: explicit server-verified authorization inputs for workspace navigation. Client and worker are onboarding/UI modes, not authorization claims. Admin pages require an active membership row *and* successful MFA. Suspended users are denied across all workspaces.
- Each helper has negative unit tests. The helpers are deliberately **not wired to live routes** until the Supabase SSR auth adapter is implemented and tested. The current public placeholder and server redirects remain fail-closed.

## Required trusted inputs when the new Duzelo Supabase organization/project exists

1. Inspect Supabase org membership and quote the cost for an isolated `duzelo` project in that org, asking for explicit approval of any nonzero cost before provisioning. Never reuse `themba`, `tally-sync` or `subzero`.
2. Verify new project's PostGIS migration, service grants and RLS independently; use a dedicated staging environment and test phones.
3. Install and pin `@supabase/ssr` / `@supabase/supabase-js` with lockfile; build Next.js App Router cookie session integration. Every request must establish the user from trusted `getClaims()` or `getUser()` and check account suspension from the database.
4. Resolve `private.admin_members` only from server-privileged, MFA-validated code. Do **not** trust `user_metadata`, a client-provided `role`, the active UI mode or a bare JWT admin claim.
5. Use `authorizeWorkspace` for navigation-level access **after** trusted data lookup. Actions require tighter per-command authorization, real admin scope and Postgres transaction checks. `read_only` staff must not gain writes.
6. Run integration tests proving invalid OTP, resend throttles, identity switching, suspension, session expiry, worker-mode isolation, admin bypass denial, safe redirect rules, CSRF protections, mobile/desktop accessibility and reduced motion.

## Rollout constraints

- The project has not yet been provisioned; any actual SMS provider may incur cost and needs approval.
- The helper `parseAccountMode` only controls view preference; worker publication/verification/booking permission must remain server-authorized.
- Do not wire helper functions into untrusted Next.js middleware and assume this protects database data. RLS and server-side authorization remain mandatory.
- All routes remain nonoperational until owner-approved launch checks complete. No fake OTP, fake session or fake approved worker.

See [organization and OTP provisioning checklist](./M02_ORGANIZATION_AND_OTP.md).

# Duzelo — ordered Codex implementation prompts

**Purpose:** Give Codex one milestone at a time. Attach/read `01_PRODUCT_REQUIREMENTS.md`, `02_SCHEMA_BLUEPRINT.sql` and `03_RLS_BLUEPRINT.sql` before writing any code. Each prompt below is standalone enough to paste into a **new** Codex task within the repository. This is the intended build order, not a request to spawn all agents on the same database migration.

## Permanent instructions for Codex (`AGENTS.md` seed)

```text
You are building Duzelo, a South African local-services marketplace, starting in the Piet Retief/Mkhondo area. Treat 01_PRODUCT_REQUIREMENTS.md as the product source of truth; SQL blueprint files are reference material that require migration review/testing, not permission to blindly deploy. Preserve all confirmed founder decisions. Keep implementation modular, mobile-first and accessible. Duzelo is a provisional name; artwork and design references will be supplied later.

Security invariants: never ship privileged Supabase keys, expose exact private addresses/worker bases/verification documents/bank data, permit self-verification, trust client-specified actor IDs/status/amounts, or represent Paystack as escrow. All privileged writes go through session-validated server-side commands with ownership/role checks, transactions, idempotency and audit. Private schemas and buckets stay unexposed. RLS denies unauthorized reads. For dangerous or unclear provider/legal assumptions, feature-flag the capability and report the blocker.

Use current stable supported Next.js, React, TypeScript and Supabase libraries; consult actual docs before installation, pin versions and commit lockfiles. Keep dependencies minimal. Use Zod, Tailwind, shadcn/ui, MapLibre, Vitest, Playwright and pgTAP where justified. Do not introduce UI-only fake workflows; every active control must do something real.

Before changing code: inspect existing repo state and tests. Before each PR/handoff: run formatting, lint, TypeScript, unit, integration, RLS/pgTAP where relevant, Playwright critical desktop/mobile scenarios and production build. Report exact commands and results; if a check could not run, disclose it. Review the diff for leaked private data/secrets, authorization, race conditions and migration safety. Prefer small PRs with clear changelog and acceptance evidence. Do not merge a failing or unverified security/payment change; CI quota exhaustion is not a passing check.
```

---

## Milestone 00 — repository bootstrap and architecture decisions

**Paste into Codex:**

```text
Initialize a fresh production-quality Next.js App Router + React + TypeScript repository named 'duzelo' (working name). Read the attached PRD and blueprints. Use supported stable versions after checking current docs; record versions/ADRs. Create the directory structure described in the PRD, strict tsconfig, pnpm or npm lockfile, Tailwind, shadcn/ui base, accessible design tokens, Oxlint/Oxfmt or conventional lint/format if compatibility dictates, Vitest and Playwright. Configure app metadata, basic SEO, localization scaffolding for English/isiZulu/siSwati and mobile-first responsive shells for public/client/worker/admin with mock-free navigation. Add environment variable validation, `.env.example` with placeholders, fail-closed feature flags, `AGENTS.md`, docs, CI workflow and security guardrails preventing server-only code imports into client bundles. No secrets and no external production account writes. Use placeholder wordmark only, not a fabricated final logo. Verify type/lint/unit/E2E smoke and production build; report results and create a scoped PR.
```

**Gate:** app loads public, signed-out, client, worker and admin shells (protected routes can be inaccessible pending auth); responsive 390×844/1440×900; no secrets in shipped JS; clear docs.

## Milestone 01 — database baseline, geospatial and RLS security

```text
Implement Supabase local development and reviewed SQL migrations from the attached schema/RLS blueprints. Do not blindly apply the reference scripts: normalize schema as needed, enable PostGIS in the extensions schema, add private admin_members, command_idempotency and inspection_access_grants, prevent invalid quote/booking cross-references and protect immutable audit records. Create fresh migrations with the installed Supabase CLI and pin tool version. Keep exact addresses, worker coverage, documents, payout accounts and provider events in non-exposed private schema. Every table in exposed public schema must have RLS enabled and explicit grants. Browser roles get only needed SELECT grants; all writes go through server authorization commands. Implement worker card publication as server-controlled sanitized read model; category-specific trade verification. Avoid recursive RLS policies, unqualified definer functions and privileged views. Create pgTAP tests for guest, owner, client, matched worker, unrelated worker, suspended worker and admin. Include seeded fictional accounts and addresses, GIST indexes and EXPLAIN of ST_DWithin candidates. Verify local reset/migration and deny/allow tests; run Supabase security advisors; create PR only when safe.
```

**Gate:** every exposed table has RLS, no public/private-data leak, migrations repeat on empty database, tests demonstrate negative authorizations and avoid RLS recursion.

## Milestone 02 — authentication, shared roles and onboarding

```text
Implement Supabase phone OTP with supported SMS provider adapter, local test phone numbers, E.164 +27 normalization, captcha/rate limiting, retry/backoff and generic account enumeration-safe error handling. Use current @supabase/ssr session/cookie design matching installed Next.js version. One user may be client, worker, or both without duplicate identity or privilege escalation. Build accessible client/worker mode switch and client initial onboarding, auth guard, signout/session expiry and limited account suspension handling. Add profile edit and notification preferences. Admin users are bootstrapped server-side by approved operator, require MFA for privileged actions and cannot self-create through signup. Google/email optional behind flags; if implemented, verify identity when linking rather than implicitly merging. Write unit, integration and Playwright tests including wrong OTP, resend limits, dual-role persistence, expired session and admin bypass; create PR after verified checks.
```

**Gate:** real phone test login works locally/sandbox; role switching is a view change, never authorization; rejected worker not entitled to verified actions.

## Milestone 03 — worker profiles, categories, location coverage and manual verification

```text
Implement real worker onboarding and administrator verification flow. Individual or business owner profile, category selection, fixed/starting/custom service offerings, private base point, radius/town allowlist and possible travel fee, service portfolio, credentials and private ID file uploads. Enforce server-validated MIME/size/magic bytes, EXIF removal for photos, private Storage signed URLs and strong bucket policies. Worker may submit for review but never set approval status. Admin MFA page lists pending evidence, opens short-lived audited document access, approves/rejects/requests changes per category, records reasoning, credential expiry and audit events. Publish sanitized worker_cards with only approximate town marker after checks pass, unpublish on suspension/credential expiry. Add public profile card and verified trade badge only where reviewed. Exercise denial tests for anonymous/unverified/self-approved users, document access isolation and PII in public payload; validate on phone and desktop.
```

**Gate:** public discovery sees only manually approved real profiles with no exact base/ID details; documents inaccessible to another user.

## Milestone 04 — worker discovery, maps, geocoding and manual location fallback

```text
Build MapLibre-based discovery map and equivalent accessible list search. Configure hosted tile/style and compliant geocoding provider via adapter; never rely on public Nominatim autocomplete or unlimited public OSM tile servers. Location permission only after explicit tap; allow town search, saved addresses, manual placement and failed GPS fallback. Server returns only sanitized approved worker card DTOs with coarse markers. Support category, approximate distance, availability, verified category, sort and pagination; map/list synchronized with mobile bottom-sheet and desktop split-pane. Build spatial search using PostGIS geography/GIST and ST_DWithin. Add geocode caching/rate-limits without storing unnecessary precise discovery coordinates. Test rejected location, browser unsupported, tiles offline, manual rural address, spoofed coordinates, disclosure in network/HTML, keyboard map alternative, mobile smoothness and map attribution.
```

**Gate:** users can find workers without granting geolocation; exact worker base never leaves trusted server.

## Milestone 05 — guided job requests, smart matching and opportunity dispatch

```text
Implement persistent guided client job wizard and direct-worker request using the same core job domain: category, job details, 1–8 media, urgency, time slots, optional budget, private address or manual pin, review and submit. Separate public town from private exact location; make drafts recoverable. Implement server-side eligibility gates (manual approval, valid trade category, availability, blocks, radius/town, no self-match, no duplicate), deterministic score with fairness rotation, bounded invitation waves, idempotent match rows and notification outbox. Matched workers see private but *coarsened* job previews, can decline, inspect eligibility and see expiry; no exact street until confirmed booking or authorized logged inspection grant. Direct requests invite only the selected provider. Stress-test duplicate submits, parallel dispatch, zero matches, unknown address, urgent timing, suspended worker, precision leakage, and category-specific credential gate. Create tests and PR.
```

**Gate:** real match within relevant radius, clear empty-state, no delivery to ineligible worker, no unbounded SMS fanout.

## Milestone 06 — quotations, inspection authorization and request-to-book

```text
Implement worker quote builder: line items, labor/materials/travel fees, fixed price/estimate/inspection-required type, exclusions, tax presentation, expiry, immutable quote versions, withdrawal and amendments. Recalculate ZAR integer cents on server. Client compares genuine quotes and chooses one; atomic transaction accepts quote, rejects/supersedes competing offers, creates one booking with pending_worker status and appends audit/notifications. Worker explicitly confirms or declines and sees schedule conflicts. Build a separate inspection flow: explicit client-approved time-bound exact-location grant, optional disclosed inspection fee, and requirement for a later priced quote before normal work booking. Verify concurrency using row locks/version checks and `Idempotency-Key`; direct booking uses same worker-approval policy. Test 2 simultaneous accepted quotes, stale revisions, expired quote, wrong worker, manipulated total, unwanted address exposure and no-show cancellation UI. PR after relevant checks.
```

**Gate:** exactly one booking per job and double-click safe; no inspection quote silently becomes binding full-work price.

## Milestone 07 — secure conversations, booking timeline and work completion

```text
Implement job-bound conversations created only between authorized job parties, Supabase Realtime or polling fallback, server-set sender IDs, member-only messages, pagination, notifications and abuse/report controls. Private attachments signed and authorized; no unsolicited messaging. Add booking lifecycle timeline, worker start/status, client/worker reschedule proposals, scope change orders requiring both-party acceptance, worker completion evidence, client confirmation, correction request and dispute escalation. Optional phone/WhatsApp CTA only after confirmed booking and explicit contact-sharing consent. Do not enable live continuous location tracking. Configurable completion reminder window must never silently release payment or waive disputes. Build admin evidence audit. Test cross-user read/write denial, attachment expiry, offline retry, out-of-order events, report/block, rejected reschedule, customer disputes and keyboard-accessible chat.
```

**Gate:** all actions persisted, status is transparent and unrelated users cannot access conversations, contact info or evidence.

## Milestone 08 — direct payments, provider-gated online checkout and reconciliation

```text
Implement the hybrid payments domain, first with cash/EFT recorded as off-platform/self-reported and optional dual-party acknowledgement. Add payment intents, integer-cent ledger, explicit outstanding amount and receipt proof with proper labels. Build Paystack payment adapter but keep PAYMENTS_ENABLED=false until documented South African merchant-of-record, refunds, KYC, split/settlement and legal feasibility reviewed. For sandbox checkout only, initialize transaction on server with amount from accepted quote/booking, return hosted checkout URL, verify raw-body HMAC-SHA512 signature using timing-safe compare, dedupe webhook receipts, independently verify transaction reference/amount/currency/merchant before status transition, handle retries/out-of-order events, refunds and reconciliation by scheduled job. Client redirects are not payment confirmation. Never store card numbers, expose secret key, claim escrow or auto-pay worker on completion. Add financial audit and admin discrepancy UI. Test forged webhooks, repeated success events, failed/refunded charge, partial payments, timeout, split discrepancy and concurrent retries. Report external blockers honestly.
```

**Gate:** direct-payment pilot fully works; online checkout sandbox verified; production remains disabled without merchant approval.

## Milestone 09 — reviews, trust, disputes, moderation and full admin

```text
Implement mutual 1–5-star verified-booking reviews, moderation without fabricated positive scores, and separate safety reports from service/payment disputes. Only completed booking participants may review one another, with server-enforced uniqueness and privacy. Admin dashboard requires role + MFA and offers identity/trade approval, worker suspensions, dispute evidence/resolution, safety triage, payments/reconciliation, notification failures, activity metrics, category configuration and append-only audit log. Never show ID documents/bank data in generic analytics. Add automatic trade credential expiry scanning and approved worker unpublishing. Add self-service data export/deletion request workflow respecting lawful evidence retention, plus privacy/terms/help pages. Test staff cross-role access, hidden reviews, fraudulent self-review, suspended worker and audit history.
```

**Gate:** a live support operator can safely approve, reject, resolve or suspend without breaking existing evidence and rights.

## Milestone 10 — notifications, PWA, resilience, localization, SEO and polish

```text
Complete reliable in-app/email outbox processing with deduplication, retries, dead letters, quiet hours and preferences. Add service worker/manifest/icons/install flows, accessible offline shell and safe update notification; never cache sensitive private pages, OTPs, identity documents or geocoding secrets. Add web push and critical SMS only after provider/consent validation and integration tests. Improve real mobile navigation, map/list bottom sheet, low bandwidth, compressed images, skeletons, empty/error/permission-denied screens, keyboard flow, motion reduced support, translations infrastructure with English copy, and targeted town/category SEO. Maintain honest verified badges and no exact personal location in HTML metadata. User will provide inspiration photos: integrate their visual direction into tokens/components when available without derailing verified functionality. Run Lighthouse/real-device checks, accessibility checks, Playwright on mobile/desktop, network/cache inspection and production build.
```

**Gate:** graceful offline/low-data UX; no broken push/map fallback or sensitive cache leakage; all actual design assets licensed/consented.

## Milestone 11 — staging beta, threat modeling, launch readiness and operation

```text
Set up isolated local/staging/production environments with feature flags and safe sample data. Deploy staging to Vercel with separate Supabase project and sandbox providers. Run all end-to-end workflows using adult fictional fixtures: client job creation, verified worker match/quote/booking/chat, direct payment, sandbox online transaction, completion/review, dispute/admin action. Test geolocation denied, rural manual address, webhooks replay, rejected/suspended worker, ID document denial, account deletion, restoration of backups, alerting and outbox failure recovery. Review current SA POPIA, ECTA, CPA, regulated-trade credential, tax, contractor status and merchant settlement validation with appropriate counsel/provider; record blockers and feature-flag unsafe parts. Write operator playbooks, onboarding scripts, support escalation, metrics dashboard, release notes and launch checklist. Do NOT self-certify legal compliance or mark unrun checks passed. Present a go/no-go report, rollback instructions, links to verified builds and exact command/test evidence.
```

**Gate:** all pilot-critical and security checks pass, required provider/legal validations recorded, admin staffed, no critical blocker; no public launch or money movement on assumptions.

## Milestone 12 — later iterations, intentionally not MVP blockers

```text
After real pilot metrics and customer interviews, propose evidence-based priorities: two-way calendar sync, repeat job templates, property-manager workspace, business/team employee invitations and permissions, fair dispatch optimization, deposits/installments subject to payment compliance, multicity rollout, more languages, stronger identity verification integrations, built-in invoice PDF, and native mobile packaging if justified. Write separate ADRs and migration plans. Keep the original security/privacy invariants and avoid premature AI, live tracking or escrow assumptions. Do not implement without approved scope.
```

---

## Recommended orchestration

- Run milestones 00 and 01 sequentially; they establish the foundation and authorization model.
- Milestone 02 follows database identity schema.
- 03 and the UI shell of 04 can run in parallel if branches avoid same files; merge only after verified.
- 05 depends on approved worker availability and PostGIS.
- 06 depends on 05; 07 depends on 06 state machine.
- Direct payment part of 08 can begin after 06; online provider work remains gated.
- 09 and notification UI can be developed in scoped parallel branches after the core job state model is stable.
- 10–11 complete resilience, release evidence and operations.

Each PR must include: changes made, tests actually run, screenshots at 390×844/1440×900 for UI tasks, RLS negative tests for data tasks, linked issues, known risks and rollback/migration note. User can supply inspiration images later and choose an updated brand without requiring a new product discovery round.

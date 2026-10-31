# DUZELO — LOCAL SERVICES MARKETPLACE
## Product Requirements Document & Codex Engineering Specification

**Version:** 1.0 draft | **Date:** 2026-10-31 | **Initial market:** Piet Retief / Mkhondo, Mpumalanga, South Africa | **Status:** Discovery complete, design inspiration photos pending, not yet implemented

> **Naming:** Duzelo is a provisional recommendation, not a cleared trademark. Possible tagline: **Good help, close to home.** Verify trademarks, CIPC records, domain availability, app store names and social accounts before product launch. Use `DUZELO` as a replaceable brand configuration value rather than hard-coding it throughout the codebase.
>
> **Design photos:** Founder will supply inspiration later. Until then adopt a provisional clean, premium, approachable design system. Do not invent visual references, generate fake worker imagery, or claim design sign-off. After reference photos arrive, document extracted colors/layout traits and propose token-level changes without changing the agreed workflows.
>
> **Status legend:** **[C] Confirmed** by founder's three discovery rounds; **[A] Assumption / implementation recommendation**; **[V] External legal, provider, business or brand validation required**. All defaults can be revised without rewriting the domain engine.

---

# 1. Executive summary

Duzelo is a mobile-first, installable Next.js marketplace connecting households and small businesses needing local jobs done with vetted individual tradespeople and service businesses. Customers find nearby workers via map or list, or create a structured job post automatically offered to relevant nearby workers. Providers respond with fixed prices, estimates or inspection-dependent quotations, communicate inside the platform, agree on scheduling, complete work and receive mutual reviews. The platform records both online and direct payment methods, subject to provider approval. One Supabase Auth identity can act as client and worker; switching mode never requires a duplicate account.

**[C] Pilot:** Piet Retief/Mkhondo and neighboring communities, with a data model not bound to a single town.

**[C] Categories:** plumbing, locksmithing, window installation, painting, home repairs, cleaning, gardening, installations and maintenance; category tree supports future additions.

**[C] Commercial model:** free pilot; monetization after validated product-market fit. No subscriptions, lead charges or commissions in pilot.

**[C] Main user roles:** client, individual worker, worker operating as/for a service business, and administrator. Client and worker are *capabilities* of the same person, not mutually exclusive accounts.

**[C] Geography:** location permission optional, MapLibre map, search by town/area, server-side nearby matching, worker radius + coverage towns + possible travel fee. Public map locations are approximate; exact addresses remain controlled.

**[C] Trust:** manually reviewed identity, relevant trade credentials and business checks before approved worker goes live. Genuine mutual reviews after recorded completed jobs. Abuse reporting and disputes.

**[C] Delivery:** full platform specified upfront, implemented in safe, testable phases. Do not attempt all advanced functionality in the first release.

**[A] Differentiator:** reliable coverage and practical service for smaller towns where directory search, informal WhatsApp groups and local referrals can be fragmented; good handling of low-connectivity and affordable Android devices.

**[A] MVP validation targets** (adjust after user research): recruit 25–40 manually vetted workers across 6–8 categories; onboard 100–150 prospective customers; measure first 50 genuine job requests and at least 20 confirmed completions; track p50/p90 match latency, quote response time, repeat bookings, cancellation/dispute rates, activation and channel costs. Targets are business hypotheses, not forecasts.

**Non-goals for v1:** native apps, continuous GPS tracking, public exact address pins, autonomous AI quote generation, true escrow, wallet / stored value, multi-country and multi-currency, employer payroll, automated ID approval, fully fledged field-service enterprise software, live video calls, bidding gamification or inflated/fake listings.

# 2. Customer problems, personas and principles

## Problem statements
1. Clients struggle to discover reliable, available local workers with transparent service boundaries, location and pricing.
2. Skilled individuals and small businesses depend on word-of-mouth and need an affordable way to get discovered, win jobs and build a verified track record.
3. Chat threads, quotes, deposits, schedules and work evidence are disconnected; misunderstandings and disputes are hard to resolve.
4. Exact customer addresses and worker residential locations can be sensitive and should not appear in public search results.

## Personas
- **Client / homeowner:** discovers help, urgent leak or planned maintenance, values trust, speed, price clarity and private address.
- **Client / property manager:** posts repeat and multi-property jobs, compares quotes, needs status records and receipts; multiple saved properties [A, phase 2].
- **Individual tradesperson:** works across a radius, may have irregular connectivity, wants low-friction onboarding, good matching, job history and reputation.
- **Service-business owner:** advertises under company brand, quotes and receives appointments; employee dispatch [C: later phase].
- **Platform verification administrator:** checks evidence, requests corrections, suspends fraudulent listings, audits access.
- **Operations/support agent:** triages reports, protects customers and workers, handles disputes, monitors payments and notifications.

## Principles
Trust over acquisition; address privacy by default; show clear status and next action; separate *request* from *quote* from *booking* from *payment*; never imply online payment safety not actually supported by provider; no deceptive urgency, hidden cost or fake availability; progressive disclosure and graceful low-bandwidth behavior; keyboard and screen-reader accessibility.

# 3. Requirements traceability

## Confirmed decisions — Rounds 1–3
| Domain | Decision |
|---|---|
| Area | Piet Retief/Mkhondo and surrounding towns, expandable to wider South Africa |
| Discovery | Both browse/compare workers + direct request AND publish a structured job and receive quotes |
| Roles | One identity can be client, worker or both; individuals and service businesses |
| Categories | Expanded home repair, maintenance, cleaning, gardening and installations |
| Request form | Guided category, description, photos, location, urgency, date and budget |
| Matching | Automatically notify relevant nearby workers |
| Pricing | Fixed offerings, quote requests, estimates, inspection-required |
| Booking | Request-to-book; worker accepts/rejects |
| Timing | Urgent/same-day and scheduled jobs |
| Communication | In-app secure chat; optional phone/WhatsApp *after booking* |
| Service area | Worker base + travel radius + towns; travel fees possible |
| Completion | Worker declares complete, client confirms/disputes, fallback review window |
| Reviews | Mutual reviews after verified completed bookings |
| Payment | Direct and optional in-app checkout, no launch commission |
| Auth | Phone OTP, optional Google/email later or concurrently if configured |
| Worker vetting | Admin/manual ID, relevant trade and business review before activation |
| Location privacy | Public approximate area, exact address after booking or approved inspection |
| Map | MapLibre + hosted maps/geocoding |
| Notifications | In-app, email, web push, SMS for critical alerts |
| Admin | Full verification/moderation/disputes/payments/analytics/audit access |
| Businesses | Business profiles in first release; team assignment/employee accounts later |
| Language | English first; i18n ready for isiZulu and siSwati |
| UX | Premium, modern, trustworthy, mobile-first, photo-inspired refinement pending |
| Stack | Next.js + Supabase Auth + Postgres/PostGIS + Supabase Storage |
| Delivery | Phased implementation with a comprehensive end-state plan |

## Assumptions made to finish discovery [A]
- Browser PWA, South African rand (ZAR) only, Africa/Johannesburg displayed timestamps with UTC in storage.
- Pilot serves adults (18+) only; no minor registration. Legal counsel should validate age restriction and enforcement.
- No open public job board during pilot: `open` jobs are distributed only to verified/eligible matched or expressly invited workers. A public feed can be added later with separate privacy policy.
- A customer may have several saved private addresses; permission to use browser location is requested only after an explicit tap, not on initial load.
- Workers can specify availability and vacation status; real-time live GPS tracking is not part of MVP.
- Customers cannot read a worker's private address or ID documents. Workers cannot see the customer's exact address before a confirmed booking or an explicitly approved, logged inspection access grant.
- Admin review decisions require MFA and an immutable audit event. Workers cannot approve themselves.
- Bookings can be confirmed without payment; clients explicitly select cash/EFT or optional online checkout after agreement.
- No claim of guarantees, insurance, background checks, trade license validity, or payment protection unless independently verified.
- A 48-hour completion-response window is a *proposed policy* for prompting review, **not** forced acceptance, irreversible settlement or waiver of legal consumer rights. Contested work remains disputable.
- Cancellation rules require plain-language consent and may vary before/after worker travel; no automatic penalties in pilot without legal review.

# 4. Feature inventory and release scope

| Capability | Pilot core | Later |
|---|---|---|
| Landing, location search, SEO town/category pages | Yes | Expanded content |
| Register via phone OTP; profile | Yes | Optional OAuth/email account linking |
| Switch client / worker mode | Yes | Team roles |
| Browse, filters, map/list, worker profiles | Yes | Saved searches, advanced rank |
| Worker onboarding, document upload, admin verification | Yes | Automated ID verification provider |
| Service offerings, rates, coverage, photos/portfolio | Yes | Promotions, repeat schedules |
| Guided job creation and private address | Yes | AI assist, reusable templates |
| Match nearby, invites, statuses, expiry | Yes | ML ranking and fairness tuning |
| Fixed quote, estimate, inspection quote | Yes | Detailed invoicing, complex variation pricing |
| Request-to-book and schedule | Yes | Calendar sync, team dispatch |
| Secure job messaging and basic file media | Yes | Voice/video, read receipts |
| Direct payment recording | Yes | Invoice exports and payment reminders |
| Optional provider-hosted online checkout | Gated after merchant validation | Deposits/instalments/platform commission |
| Job status and completion evidence | Yes | Recurring maintenance and warranties |
| Mutual job-linked reviews and moderation | Yes | Rich reputation system |
| In-app + email notifications | Yes | Push and SMS as budget/provider gates pass |
| Admin panel with approvals/reports/disputes/audit | Yes | Team support queues and advanced analytics |
| PWA installation, responsive UI, offline shell | Yes | Offline draft sync and native wrappers |
| Light / Dark / System appearance and accessible motion foundations | Yes (Milestone 00) | Further polish based on measured device performance |
| Reporting/data export/deletion workflow | Yes | Advanced user data portability |

**Feature flags**: `payments_online`, `sms_critical`, `web_push`, `google_oauth`, `team_dispatch`, `ai_assist`, `recurring_jobs`. Every disabled capability must have a complete graceful UI path, not a broken button.

# 5. UX and navigation

## Navigation architecture
**Public:** Home; Explore services; Service categories; Worker search/map; Worker profile; How it works; Trust and safety; Help; Terms/privacy; Sign in.

**Client desktop:** Dashboard; Find help; Post a job; My jobs; Messages; Notifications; Saved workers; Profile/addresses/settings.

**Client mobile bottom nav (max 5):** Home, Explore, Post (prominent), Jobs, Inbox. Profile, alerts and mode switch in top/account panel. Never hide critical cancellations or reports in ambiguous menus.

**Worker desktop:** Overview; Opportunities; Quotes; Calendar/Jobs; Messages; Services; Portfolio; Earnings; Verification; Settings.

**Worker mobile bottom nav:** Overview, Opportunities, Jobs, Inbox, Profile. Prominent `Switch to client` in account menu; show current mode clearly. Suspended/pending workers see onboarding/verification status but cannot receive matches, quote, or mark work done.

**Admin desktop only initially:** Overview; Worker approvals; Users/businesses; Jobs/quotes/bookings; Safety reports; Disputes; Payments/refunds; Notification health; Categories/configuration; Audit log. Responsive usable on mobile for urgent read-only triage, but sensitive actions require explicit reconfirmation and MFA.

## UX states
Every screen must have initial load/skeleton, loaded results, zero-results, permissions denied, validation errors, optimistic/rollback behavior, offline, error retry, expired session, suspended account and permission-denied states. Destructive actions get confirmation and reason text. Every job presents current status, last update, next recommended action and a history timeline.

## Detailed screen inventory
| Route (suggested) | Users | Main purpose/acceptance |
|---|---|---|
| `/` | All | Search, location control, category shortcuts, safety value prop, sign-in CTA |
| `/services` | All | Category tree and descriptions, no invented providers |
| `/services/[slug]` | All | SEO content, category-specific worker list |
| `/explore` | All | Map/list toggle, category, travel radius, availability, verification, sort |
| `/workers/[slug]` | All | Public sanitized worker profile, relevant verified trades, portfolio, jobs/reviews, direct request |
| `/how-it-works` | All | Separate client/worker onboarding explanations |
| `/trust`, `/legal/privacy`, `/legal/terms` | All | Honest trust claims, terms, contact, POPIA disclosure |
| `/auth/sign-in` and `/auth/verify` | Signed-out | South African +27 phone format, OTP resend/captcha/backoff, friendly errors |
| `/onboarding` | Signed-in | Name, consent, client mode / worker mode / both |
| `/app/client` | Client | Job statuses, recommended next action, saved addresses |
| `/app/client/jobs/new` | Client | Multi-step guided form: service, problem, photos, timing, location, budget, privacy preview |
| `/app/client/jobs/[id]` | Client | Quote comparisons, timeline, chat, booking, completion and review |
| `/app/client/jobs` | Client | Filterable status history with draft resume |
| `/app/client/addresses` | Client | Saved private addresses with privacy copy |
| `/app/worker` | Worker | Availability toggle, verification state, opportunities and active work |
| `/app/worker/onboarding` | Worker | Identity/business type, service categories, radius, credentials, portfolio and submit |
| `/app/worker/verification` | Worker | Approved/pending/needs changes with reason and resubmit |
| `/app/worker/services` | Worker | Fixed/starting-price offerings, categories, travel fees and visibility |
| `/app/worker/opportunities` | Worker | Eligible nearby matches, deadlines and quote CTA |
| `/app/worker/jobs/[id]` | Worker | Scope, communication, schedule, proof, quote and completion |
| `/app/worker/calendar` | Worker | Accepted dates, availability and conflict warnings |
| `/app/worker/earnings` | Worker | Online/direct self-reported labels and reconciliation, no misleading settled amount |
| `/app/inbox`, `/app/inbox/[id]` | Participants | Job-bound conversations and evidence, block/report controls |
| `/app/notifications` | Signed-in | Filter/read/mark all and deep links |
| `/app/settings` | Signed-in | Account/security, privacy, locale, mode, notification channels, export/deletion |
| `/admin` | Admin | Verification and safety queue, audit-safe metrics |
| `/admin/verifications/[id]` | Admin | Privileged document review, decision and expiration |
| `/admin/disputes/[id]` | Admin | Evidence timeline, notes, resolution recording |
| `/admin/payments` | Admin | Provider event reconciliation, discrepancies and refund tracking |

## Guided client job form (mobile-first)
1. Category + specific task; plain-language examples; urgent situation disclaimer for danger/emergencies.
2. Problem/title and detailed description; 1–8 optional photos, camera/gallery, EXIF stripped, server MIME validation.
3. Urgent today / scheduled / flexible; requested slot and timezone, preferred dates, contact availability.
4. Budget optional, price type explicitly approximate, not a commitment; inspection warnings.
5. Location: use my location, choose saved address, search town/place, or place pin manually. Display exact address only inside private confirmation step; publish coarse town only.
6. Review: summary, worker matching explanation, visibility of details, how prices and payments work, submit.
7. Success: job number, matching status, workers contacted, expected next step; never invent response deadlines or guaranteed coverage.

**Direct request:** same wizard prefilled with worker and category; restrict to the worker and no broad broadcast. **Open post:** use eligibility matching, offer capped invitations in batches. Do not create two separate booking engines.

## Worker onboarding
Identity -> choose individual/business -> profile and avatar -> service categories (category-specific credentials when needed) -> base point (private) and radius/towns -> fixed/estimate/quote service prices -> portfolio -> documents with scope and retention explanation -> preview public profile -> submit for admin review. Screen separates `Identity verified`, `Business reviewed`, and `Trade credential verified` **per category**, not one generic trust badge. Denied/expired evidence triggers category-specific restrictions rather than blanket false claims.

## Job and booking cards
Cards show category, coarse town/distance band rather than exact location, urgency, preferred time, quote deadline, budget if supplied, category-specific credential requirement, current action, unread messages, and verification context. Show money as `R 1 250.00`, totals include explicit labor/materials/travel/tax assumptions. For a quote requiring inspection show `Price after inspection` instead of `R0`.

## Mobile / desktop specification
- Layout: 360px to 430px phones; 768px tablets; 1024px+ sidebar and desktop master-detail; supports 320px without horizontal scroll.
- Mobile map: viewport-height bounded; a bottom sheet with worker cards, drag handle, list toggle, location control, category chips; selected marker and sheet card synchronized; never obstruct keyboard or permission modals.
- Desktop map: split layout, search/filter panel and detail pane; keyboard-accessible map alternative with sortable list.
- Tap targets at least 44×44 CSS px where practical; visible focus; accessible dialog titles; labels/field errors; functional escape/back; no inaccessible map-only controls.
- On weak networks: image compression, lazy photos, list-first fallback if map tiles fail, no layout shifts, optimistic state only where reversible. If device is offline, let user read cached shell/previously authorized non-sensitive summaries; do not pretend a payment or quote was transmitted.
- PWA: correct manifest/icons, installation instructions, service worker version/update experience, network-first protected data, static asset caching, never cache token/OTP/ID docs/private address HTML in public/shared caches. Push permission only after a meaningful user prompt.
- Appearance: accessible Light/Dark/System choice available before sign-in and in `/app/settings`, persisted without a flash or hydration mismatch; preserve map state, focus, wizard drafts and content during changes. All flows support reduced motion and semantic feedback, including administrative actions.

# 6. Visual design system (provisional [A])

**Visual target:** premium and calm, friendly to people unfamiliar with tech, visually trustworthy without resembling a bank or government portal. Use real worker photography only with explicit consent and honest captions. No synthetic worker photos presented as real accounts.

| Token | Initial value | Use |
|---|---|---|
| `--brand-900` | `#123D35` | Primary dark green / deep teal |
| `--brand-600` | `#0D9488` | Interactive accents / active controls |
| `--accent-200` | `#D4F4E5` | Soft positive surface |
| `--background` | `#FAFAF7` | Warm light neutral |
| `--surface` | `#FFFFFF` | Cards, dialogs, content |
| `--text-primary` | `#162520` | Content |
| `--text-muted` | `#5B6D64` | Secondary text, check contrast |
| `--border` | `#DAE3DC` | Dividers / input outlines |
| `--danger` | `#B42318` | Safety, validation errors |
| `--warning` | `#9A6700` | Pending and attention |

Geist or a suitably licensed premium font with system fallback; compact but readable typography, restrained squircle-like 12–20px corners, subtle borders not heavy shadows. Icons: consistent icon family across app; avoid emoji as primary navigation. Always test WCAG 2.2 AA contrast rather than assuming proposed palette passes.

**Confirmed update (2026-10-31):** Light, Dark and System colour schemes, an accessible Appearance selector, persisted preference and app-wide semantic tokens are **Pilot / Milestone 00 requirements**, replacing the earlier optional-after-pilot assumption. Interaction motion must be intentional, lightweight, GSAP-enhanced only when justified, compatible with `prefers-reduced-motion`, and secondary to task completion and secure business state. The complete architecture, provisional dual-palette values, interaction choreography, component boundaries and browser acceptance gates are in [`docs/design/MOTION_AND_THEMES.md`](docs/design/MOTION_AND_THEMES.md). Do not implement marketing-style pinned animations inside transactional, map, OTP, worker verification or admin screens.

**Founder's reference-photo integration protocol:** inspect each image for palette, hierarchy, spacing, typography, motion clues and illustration/photo treatment; distinguish inspiration from literal copying; propose three coherent UI directions only if requested; preserve all functional flows, accessibility and privacy constraints; document approved design tokens in `docs/design-decisions.md`.

# 7. Technical architecture

## Stack [C unless marked]
- **Next.js App Router, React, TypeScript**, Node.js server runtime, modern supported version pinned after checking actual release/documentation [A]. Do not blindly upgrade to experimental versions.
- **Supabase:** Auth phone OTP, managed PostgreSQL + PostGIS, private Storage buckets, Realtime for conversation state, SSR auth cookie integration with `@supabase/ssr`. Use supported SSR guidance for the installed Next.js major version (Next.js 16+ uses `proxy.ts`; older uses `middleware.ts`).
- **MapLibre GL JS:** hosted map style and tile provider; geocoding provider interface (`search`, `reverse`, `placeLookup`). Do **not** use public OSMF Nominatim for autocomplete; obey attribution and caching contracts.
- **Tailwind + shadcn/ui + accessible headless primitives [A]**, React Hook Form + Zod for validated forms, TanStack Query only for interactive caching, `next-intl` or equivalent dictionary-based i18n [A]. Semantic CSS theme variables with Light / Dark / System appearance and persisted preference are required from Milestone 00; scoped GSAP / `@gsap/react` motion is optional for appropriate public storytelling, with reduced-motion and cleanup. See `docs/design/MOTION_AND_THEMES.md`.
- **Paystack integration via adapter [A/V]** only after real SA merchant capabilities checked. Use provider-hosted checkout; no payment card details in own DB.
- **Notifications:** transactional provider(s) by adapters; server outbox + retries; email/in-app first, push/SMS gated.
- **Hosting:** Vercel Next.js server, Supabase database/storage, server-side webhooks and scheduled jobs; monitoring via provider logs and error tracking.
- **Testing:** Vitest (domain unit), Playwright (mobile/desktop E2E), Postgres pgTAP (RLS and constraints), webhook fixture tests, TypeScript/ESLint or Oxlint and formatter pinned to current supported stack.

## Architecture choice: modular monolith [A]
One deployable Next.js app with strict domain modules, repository adapters, server commands, jobs and integrations. Avoid microservices, Redis, worker queues and AI inference until real usage justifies them. Database handles transactional consistency. Background outbox processing can use a scheduled server endpoint initially; replace with robust queue if throughput grows.

```text
Client/PWA (browser)
    | authenticated HTTPS + Supabase session
    v
Next.js (server commands / route handlers / server components)
    | validation + authorization + idempotency + transactions
    +--> Supabase Auth (OTP, sessions)
    +--> PostgreSQL / PostGIS (private data, jobs, quotes, bookings, RLS)
    +--> Supabase Storage (private media)
    +--> Map style / tile + geocoding providers
    +--> Payment provider adapter (if enabled)
    +--> Notification outbox (email/push/SMS)
    +--> Admin evidence review / audit
    v
Read model / sanitized worker_cards and eligible job results
```

**Hard boundary:** Supabase publishable key can be sent to client; privileged secret/service role key must live only on trusted server code. All business mutations validate session and resource ownership/role on the server even though the key bypasses RLS. Exposed tables are read-only to client roles unless separately proven safe. Private schemas are never exposed to the Data API. Restrict privileged key scope operationally; do not expose it in logs, errors, build output or `NEXT_PUBLIC_*` variables. Keep database URL server-only.

## Proposed repository layout
```text
src/
  app/
    (public)/{page.tsx,services/,workers/,explore/,legal/,trust/}
    (auth)/auth/{sign-in/,verify/}
    (app)/app/{client/,worker/,inbox/,notifications/,settings/}
    (admin)/admin/{verifications/,disputes/,payments/,reports/}
    api/v1/{jobs/,quotes/,bookings/,messages/,payments/,me/,workers/}
    api/webhooks/paystack/route.ts
    api/internal/{notify/,reconcile/,expire/}/route.ts
  components/{ui/,layout/,map/,jobs/,workers/,forms/}
  features/
    auth/{schema,service,policy,tests}
    workers/{schema,service,repo,policy,matching,tests}
    jobs/{schema,service,repo,state-machine,tests}
    quotes/{schema,service,repo,policy,tests}
    bookings/{schema,service,state-machine,tests}
    messages/{schema,service,policy,tests}
    payments/{adapter,service,webhooks,tests}
    notifications/{outbox,channels,templates,tests}
    admin/{verification,disputes,audit,tests}
  lib/
    supabase/{browser,server,admin}
    geocoding/{provider,adapter}
    map/{formatting,privacy}
    validation/{identifiers,phone,money,files}
    security/{rate-limits,idempotency,authorization,csrf}
  locales/{en.json,zu.json,ss.json}
  styles/tokens.css
supabase/{migrations/,tests/,seed.sql}
tests/{e2e/,fixtures/,security/}
docs/{architecture.md,adr/,runbooks/,design-decisions.md}
```

Separate server-only and browser imports; lint prevents client importing privileged modules. Use server-side DTO projections instead of `select('*')` on sensitive tables. Use parameterized SQL and transaction boundaries for quote acceptance/bookings/payment transitions.

# 8. Domain model and storage

**SQL blueprint:** `02_SCHEMA_BLUEPRINT.sql` defines the baseline tables, FK constraints, indexes, PostGIS geography and enums. `03_RLS_BLUEPRINT.sql` defines a default-deny privilege model and representative SELECT policies. These are reference artifacts for Codex to harden and migration-test, NOT independently run/verified production migrations.

## Entities and cardinality
- `auth.users` (1) -> `user_profiles` (1), `worker_profiles` (0..1), `business_profiles` (0..many owned), `client_addresses` (0..many private).
- `service_categories` tree -> `worker_services` (many) -> `worker_profiles`; `worker_cards` is **sanitized denormalized read model**, only server-published for approved workers.
- `worker_profiles` -> `private.worker_coverage` (1), `private.worker_verifications` (many), `verification_documents` (many); identity and credential documents private.
- `job_requests` -> `private.job_locations` (1), `job_media` (many), `job_matches` (many), `quotes` (many versions), `bookings` (0..1 confirmed), `conversations` (per worker response/job).
- `bookings` -> `booking_events` (many), `change_orders` (many), `payment_intents` (many), `reviews` (up to one per party), `disputes` (many with staff review).
- `conversations` -> `conversation_members` (users), `messages` (many).
- `private.payment_intents` -> `private.payment_ledger` (many), `private.provider_webhook_events` (deduped receipt), `private.payout_accounts` (encrypted/tokenized). No direct client Data API reads of financial tables; use participant-authorized server DTOs.
- `notifications` (visible user inbox), `notification_outbox` (private async delivery), `audit_events` (private append-only review and moderation trail).

**Additional required schema hardening in milestone 1:** The reference SQL now includes private `admin_members`, `command_idempotency` and `inspection_access_grants` as initial tables, plus category-specific verified-trade IDs. Codex must still enforce admin MFA in the command layer, add storage policies, transaction locking, appropriate trade-expiry rules, fraud review, and export/deletion request records. Do not mistake the reference SQL for the entire finished implementation.

## Database design rules
- Monetary amounts stored as signed integer **cents**, currency fixed `ZAR`; never binary floats; support taxes/discounts as explicit line items if needed. Formatting only at view layer.
- Timestamps `timestamptz` UTC storage; render `Africa/Johannesburg`; time windows with valid start/end; handle midnight-crossing display.
- Spatial fields use `extensions.geography(Point,4326)` and GIST indexes; `ST_DWithin` radius in **metres**. Construct points with longitude FIRST, latitude SECOND. Use indexable radius query not `ST_Distance` in a WHERE filter.
- No exact address, worker home-point, ID number/document, bank number, phone, email or access instructions in public worker/job cards. Private schemas and private Storage buckets for these.
- All user-generated text escaped or sanitized appropriately; rich HTML not allowed in V1. Strip metadata/EXIF from uploaded public-facing images, resize and scan before publishing.
- Avoid DB-enum migration complexity when frequent statuses expected; initial enums in reference SQL are okay only with explicit migration/test discipline. Prefer domain-level narrow schemas with additive migrations.
- Add integrity checks: same-job matching and quote references, quote acceptance belongs to selected job/worker, booking uniqueness, published card only from approved worker, reviews only by distinct booking participants, state transitions only through service, credentials per trade, price totals recalc server-side, media belongs to authorized actor.
- Use `SELECT ... FOR UPDATE` within transactions to serialize acceptance, booking, payment and dispute changes. Reject stale optimistic versions with `409 Conflict`.
- `on delete cascade` only for safe child data; never cascade financial/audit evidence away during deletion requests. Retention/de-identification policy with legal preservation requirements.

# 9. Authentication, role model, identity and verification

## Authentication
- Primary route: Supabase Phone OTP via SMS [C]. Phone accepted in E.164; default country code `+27`; verify length/provider and support non-SA accounts only when enabled. OTP feedback must not reveal whether a phone is registered.
- Anti-abuse: CAPTCHA on trigger, phone/IP/device burst limits, resend countdown, lockout/backoff, provider spending caps, no OTP in logs or analytics.
- Optional Google and email [C optional] only after explicit provider configuration and verified account linking. **Never** automatically merge accounts only because two records have same display name; phone/email identity ownership verification required.
- New user chooses first mode, can later enable worker. `user_profiles` tracks public-facing preferences; capability determined by server-owned profile and admin-review state, not user-editable JWT `user_metadata`.
- OTP should not be considered strong assurance for privileged admin; require MFA before admin action and step-up verification for sensitive account/payment changes. Protect against SIM-swap for payout modifications.
- Session refresh from supported Supabase SSR integration. Server verifies user identity; for high-risk operations revalidate session/revocation. On suspension, revoke sessions/privileges and block new actions.

## Worker manual verification
1. Worker uploads ID evidence to **private** bucket; record reference and submission date. For restricted trades request category-specific qualifications/registrations where applicable.
2. Admin opens privileged review console. File request checks admin MFA and logs access; documents delivered with short-lived signed URLs, watermarked where reasonable, never rendered via a public image URL.
3. Admin approves/rejects/requests edits per claim (`identity`, `business`, `trade`, `reference`) and stores explanation, reviewer ID, timestamp, credential expiry.
4. Only after required checks pass does worker status become `approved`. Server publishes sanitized worker card and starts eligible matching. Rejected or suspended worker cannot receive offers, quote or accept bookings.
5. Expired high-risk trade credentials unpublish only affected service categories (and potentially worker until re-approved depending on policy). Existing confirmed bookings trigger support review, not silent cancellation.
6. Allow appeal and re-review with evidence. Document access and decisions retained according to a justified POPIA retention schedule.

**Verification badge taxonomy:** `Identity reviewed`, `Business reviewed`, `Trade credential checked: [named category]`. Never display `Background checked`, `insured`, `licensed`, `PIRB certified`, `guaranteed`, or `police clearance` unless source and scope verified. Sensitive identity attributes are never public.

## Business profiles [C phased]
In pilot an individual user may own a business profile, upload registration evidence and advertise as the business representative. The owner remains responsible for quotes/bookings. Post-pilot team memberships, employee permissions, dispatch, timesheets and payouts require separate explicit role-based authorization and invitations; do not silently grant all employees access to customer private addresses.

# 10. Geographic discovery, privacy and smart matching

## User location UX
- `Use my location` triggers permission when tapped; HTTPS and compatible browser required. On reject/error use manual town/address search and draggable map pin; show a visible retry control.
- Search location for discovery can be transient; store only if user chooses a saved address. Explain what data is stored and why. A geographic `distance` indicator must be a reasonable approximate service distance, not promise actual drive time.
- No background location collection or worker location tracking; the worker selects their coverage/base once and edits it manually. Admin can see precise worker base only for operational need, with audit.
- Public worker map markers use safe approximate **town/suburb centroids or deliberately coarse zones**, no individually reversible exact worker coordinates. Stable clustering and overlap handling; do not send exact coordinates and rely on front-end blurring.
- Public job previews show coarse towns only. Do not include exact address in notification payloads, cache entries, URL search params, analytics or map provider request logs when not essential.
- Exact address access after worker-approved booking; approved inspection grants are time-limited, logged and can be revoked before visit. An authenticated matched worker who has only been invited is **not** entitled to exact address.
- Clients can store multiple addresses; store precise coordinates and access instructions only in `private.client_addresses` and `private.job_locations`.

## Matching algorithm [A initial]
Eligibility gate, never overridden by scoring:
1. Worker `approved`, available, active service in exact/child matching category; valid category-specific required credential.
2. Worker not suspended/blocked/reported restricted; no duplicate match for same job; no self-matching or same user client/worker job.
3. Service request and worker coverage intersect. Use `ST_DWithin(private.worker_coverage.base_point, private.job_locations.exact_point, radius_km * 1000)` AND optional allowlist/town requirements, with trusted server access. If lat/long cannot be resolved, fall back to town search and flag approximate matching.
4. Worker schedule not already hard-blocked for requested appointment; urgent jobs require explicit availability if configured.
5. Respect client blocklist and worker blocklist; lock/unlock data must be access controlled.

Score eligible candidates, deterministic initially: `service relevancy 35`, `geographic proximity 25`, `recent response reliability 15`, `availability compatibility 15`, `verified relevant trade / portfolio completeness 10`. Fairness: rotate exposure among similarly scoring qualified workers; limit volume per worker; ensure newcomers get some exposure without inventing reviews; avoid hidden demographic proxies and bias. Expose match rationale such as `Serves Mkhondo • Plumbing • Available today`.

Dispatch max **5 workers per initial wave** [A], wait **20 minutes for urgent** or **4 hours for scheduled** before next bounded wave if no responses [A]; use safe caps and worker notification preferences, not endless SMS fanout. Re-check availability and job state immediately before sending. Race-safe unique `(job_id, worker_id)` and idempotent outbox. Match retention/expiry policy recorded.

**SQL concept (server-only):**
```sql
SELECT wc.worker_id
FROM public.worker_cards wc
JOIN private.worker_coverage cov ON cov.worker_id = wc.worker_id
JOIN private.job_locations loc ON loc.job_id = $1
WHERE $2 = ANY(wc.category_ids)
  AND wc.is_available
  AND extensions.ST_DWithin(cov.base_point, loc.exact_point, cov.radius_km * 1000)
ORDER BY wc.rating_count DESC, wc.worker_id
LIMIT 50;
```
This is a *candidate filtering sketch*, not a complete secure matching function. The actual query must run only within the authorized server-side matching job, include credential validity, blocks, fairness, schedule, city and trade requirements, and never return `loc.exact_point` to a client. Replace sample rating ordering with the fairness score above.

## Map/geocoder providers [V]
Use MapLibre with a commercial/hosted style and geocoder that permit the intended traffic, autocomplete, storing search results if needed, and attribution. Public OpenStreetMap tiles have usage limitations; public Nominatim expressly prohibits autocomplete. Do not use MapLibre itself as a geocoding provider; it is a rendering library. Geocoder must support manual pin placement to survive rural/incomplete address data.

# 11. Lifecycle state machines and business invariants

## Job request states
`draft -> open -> matching -> quoted -> booked -> in_progress -> completion_pending -> completed`; alternate branches `cancelled`, `expired`, `disputed` as appropriate. Not all steps mandatory for direct fixed-price services. A job is *not* simultaneously multi-booked. Accepted quote and selected worker immutable for that booking; later scope changes use change orders.

| Event | From | To | Actor / guard |
|---|---|---|---|
| Save draft | new | draft | Owner, valid partial schema |
| Submit post | draft | open | Owner, category/location/description valid |
| Dispatch workers | open | matching | Server matching eligibility, outbox |
| Receive at least one quote | open/matching | quoted | Verified matched worker only |
| Accept quote / request booking | quoted/open | quoted + pending worker booking | Client, quote unexpired, worker matches job |
| Worker confirms | pending worker | booked/confirmed booking | Chosen approved worker, schedule free |
| Worker starts | confirmed | in_progress | Selected worker, agreed start rules |
| Worker submits proof | in_progress | completion_pending | Selected worker, evidence or explanation |
| Client confirms | completion_pending | completed | Client, no open blocking dispute |
| Dispute | completion_pending/active | disputed | Authorized participant and policy window |
| Cancel / expire | eligible pre-completion state | cancelled/expired | Authorized party/system; record reason |

**State design detail:** `job_requests.status` and `bookings.status` are related but not interchangeable. Job represents the request lifecycle; booking represents the accepted appointment/worker. Maintain state changes in one transaction and append `booking_events`/audit records. If a quote is chosen while others are pending, mark competing quotes rejected or superseded and notify respectfully.

## Quote states
`draft -> submitted -> accepted | rejected | withdrawn | expired | superseded` with immutable version history. Only verified matched/invited workers can submit; worker cannot quote own client's job; client can accept one quote per job. Quote types: `fixed` (amount), `estimate` (amount plus assumptions), `inspection_required` (no binding final amount). Each line item has quantity and integer cents. Worker changes quote by new version; previous accepted totals not retroactively altered.

**Inspection flow:** if `inspection_required`, client must explicitly authorize a *site visit request*, travel/inspection fee if any, and time-limited precise-address access. After inspection worker submits a priced new quote; client must accept that quote to establish normal work booking. **Never** treat an inspection-only indication as a silently accepted final price.

## Booking states
`pending_worker -> confirmed -> in_progress -> completion_pending -> completed` with branches `declined`, `cancelled`, `disputed`. Client initiates booking; selected worker must approve [C], including direct requests. On rejection job can reopen matching (with customer consent) and previous quotes preserved as historical. Reschedules require proposal and acceptance, not silent mutation. Booking version incremented on any update; `409` on stale version.

## Completion and fallback review
Worker adds proof/photo and marks completion pending. Client receives prompts; can `Confirm`, `Report an issue`, or `Request correction` (a change to work status with audit). If no response after a configurable 48h *proposed* window, mark `awaiting review by support` or other policy-approved administrative state; do not auto-release funds, invent client consent or prevent consumer dispute rights. Completion and payment settlement remain separate concerns.

## Direct vs online payments
**Direct:** Cash or EFT agreed outside the payment processor. Worker marks `payment received` with optional receipt/reference; client confirms if they wish. Until both affirm or admin resolves, label `Self-reported`, not `Verified by Duzelo`. Support partial payment and outstanding balance without an escrow assertion.

**Online:** Only after merchant/provider validation, initialize on server for an agreed booking amount and currency; return provider-hosted checkout URL. `payment_intents` records `created/pending/succeeded/...`. Client redirect is never payment proof; server verifies provider status (webhook verified and/or server verify endpoint), amount, currency, reference, merchant ID and idempotency under DB transaction. Refunds/chargebacks/failed events recorded with ledger entries. No card data stored. No false claims that the platform holds funds or automatically transfers to workers after completion.

**Future revenue:** Define pluggable fee computation (currently `0` platform fee), potential subscription/lead/commission experiments disabled and requiring updated terms. Taxes, VAT registration and issuance of tax invoices need professional/legal review [V].

## Reviews, abuse and disputes
- Only participants of a *completed verified booking* can review the counterpart; max one review per direction, edit policy time-limited, no self-review. Moderation may hide abusive content but must not selectively suppress legitimate negative reviews. Do not gate review submission on a high score.
- Both sides can report. Separate `safety_report` (fraud/harassment/danger) from `dispute` (job/performance/payment). Lock sensitive actions and retain evidence after reports; route immediate physical danger to emergency services, not app mediation.
- Dispute timeline contains opened/reason, evidence requests, participant responses, admin decision, appeal path, payment-provider dispute/refund status as separate fields. Administrators can't silently rewrite a review or payment event.

# 12. Permissions, RLS, privacy and threat model

## Authorization matrix
| Resource / action | Guest | Client owner | Matched worker | Confirmed worker | Admin |
|---|---|---|---|---|---|
| Browse sanitized approved worker card | Allow | Allow | Allow | Allow | Allow |
| View specific private job | Deny | Allow | Limited matched details | Allow | Need-to-know |
| View exact job address | Deny | Allow | **Deny** unless explicit inspection grant | Allow after confirmation | Only justified/audited |
| Read worker verification document | Deny | Deny | Own via secure viewer if allowed | Own | MFA + audited |
| Submit job | Deny | Own account | Own client mode | Own client mode | Not on behalf without support protocol |
| Send quote | Deny | Deny | Approved and eligible | Approved and eligible | Deny except formal support correction |
| Confirm booking | Deny | Request only | Selected worker only | Selected worker | Override only with audit/policy |
| Send message | Deny | Conversation member | Conversation member | Conversation member | Support role with auditable reason |
| Change payment status | Deny | Direct attestation | Direct attestation | Direct attestation | Admin intervention with supporting evidence |
| Review | Deny | Completed booking only | Completed booking only | Completed booking only | Moderate not fabricate |
| Approve worker/admin role | Deny | Deny | Deny | Deny | MFA + privilege |

## Implementation safeguards
- Restrict Data API exposure; RLS on every exposed table. `anon/authenticated` clients have **read only** with resource-specific SELECT policies in the blueprint. All writes go through authenticated Next.js server modules, with Zod validation, server-fetched role, ownership, state preconditions, rate limits, CSRF/origin checks where appropriate, idempotency and transaction locks.
- Public review API returns moderated/sanitized DTOs (star rating, public commentary, appropriately reduced author label, timestamp). Do not grant unauthenticated raw table access to reviewer `author_id`, subject IDs or moderation notes.
- **Never** trust `user_metadata`, browser-supplied user_id, admin boolean, worker verification status, booking status, quoted total, payee, geocoding coordinates or a message `sender_id`. Resolve from server session/DB.
- User roles: authenticated is not privileged. `admin_members` in non-exposed schema and MFA check; admin session revocation immediate; sensitive actions subject to fresh session verification.
- RLS policies must check owner/participants; UPDATE requires SELECT + USING + WITH CHECK if direct writes added. Avoid RLS cycles, unqualified `SECURITY DEFINER` functions, auto-granted execute to `PUBLIC`, and views that bypass RLS. Use `security_invoker` views where supported.
- Private Storage buckets (`identity-documents`, `job-private-media`, `chat-attachments`, `worker-private-portfolio-review`); public bucket only for explicitly published, scrubbed avatar and portfolio derivatives. File path ownership checks, size/MIME/magic bytes, virus screening, EXIF scrubbing, randomized keys, short-lived signed URLs, permission audit.
- Never expose customer/worker phone numbers in search, map, HTML metadata, OpenGraph, JSON-LD, static ISR pages or analytics. Optional phone/WhatsApp link only visible to both parties after confirmed booking and opt-in.
- Message rate limiting, spam reporting/blocking, server-enforced conversation membership for web socket / Realtime, no messages sent by guest or arbitrary self-insert to conversation_members. Review attachments before publishing content where possible.
- Prevent enumeration by opaque UUIDs and generic 404 responses for inaccessible resources. Validate redirects, webhook signatures, path traversal, XSS, SSRF on remote URLs, SVG/image vectors, zip bombs and oversized uploads.
- Record audit actions for verification, admin document access, dispute resolution, suspension, payout/refund adjustments, location inspection grants, account deletion and incident actions. Redact sensitive values, never log verification document bytes.
- Encrypt sensitive data at rest using provider capabilities; additionally envelope-encrypt or tokenize bank data, minimize retention; prohibit storage of raw identity numbers if the verification workflow only needs evidence reference.
- Abuse controls: OTP bot/cost protection, fake listings, mass matching abuse, fake self-reviews, cancellation gaming, chargebacks, forged EFT screenshot, photo abuse, location scraping, worker stalking, SIM swaps, admin credential theft, and service-role leak.

## POPIA and legal [V]
- Identify responsible party, Information Officer, operators, purpose, legal bases, notice, user rights, processors, cross-border transfers, minimization, retention and breach response. Register Information Officer if required and verify Information Regulator workflows. Audit contracts with Supabase, map/geocoding, email, SMS, payment providers.
- Provide privacy notice before geolocation and document collection; distinguish optional discovery geolocation from required job address processing. Allow consent withdrawal where applicable, access/correction/export/deletion requests with lawful retention exceptions.
- Plan for incident response under POPIA section 22 (notification to Regulator and affected persons when trigger met); maintain incident contacts, evidence and test runbook.
- Obtain legal review of Electronic Communications and Transactions Act online supplier disclosures, CPA service quality/cancellation and disputes, applicable trade-specific qualification rules, contractor/worker relationship, tax/VAT, liability/insurance, payment settlement/KYC and consumer marketing consent. Do not assert universal credentials for all plumbing or electrical tasks; validate exact scope with professionals and regulators.
- Operational safeguarding for home visits and locksmith work: verified identity, reporting, location disclosure minimization, danger/help guidance, and emergency escalation; review whether specific tasks must be restricted or disabled until credentials checked.

# 13. API and command contracts (v1)

**API shape:** `/api/v1/...` versioned HTTP handlers returning `{data, meta?, error?}` with stable `code`, `message`, `fieldErrors?`, `requestId`; `401` anonymous, `403` prohibited, `404` inaccessible/missing, `409` version/state conflict, `422` validation, `429` limited, `5xx` provider/system. Browser-visible errors must not leak private data or secrets.

**Request authorization:** extract identity server-side, verify ownership/capability, validate input Zod, check state/version, run DB transaction and append audit/outbox, return minimal DTO. Sensitive mutations require `Idempotency-Key` with actor-bound dedupe key and request hash; reuse of key with differing body returns `409`. Match and payment provider endpoints additionally have dedupe mechanisms.

| Method and path | Actor | Input | Output and notes |
|---|---|---|---|
| `GET /api/v1/categories` | All | none | Active category tree |
| `GET /api/v1/workers?category=&near=&radius=&cursor=` | All | coarse location/filter | Sanitized worker cards, never exact base |
| `GET /api/v1/workers/:slug` | All | slug | Verified public profile, sanitized services, real reviews |
| `POST /api/v1/worker-profile` | Signed-in | profile, categories | Draft or submitted; no verification status accepted from client |
| `POST /api/v1/worker-profile/verification` | Worker | doc refs, requested categories | Review queue entry, no automatic approval |
| `PATCH /api/v1/worker-profile/coverage` | Worker | point, radius, towns | Private update, publish coarse marker only |
| `POST /api/v1/jobs` | Client | category, text, urgency, location token, budget, slots | New job ID; location snapshotted privately |
| `GET /api/v1/jobs/:id` | Authorized participant | ID | Role-filtered job DTO; address only for owner/confirmed/grantee |
| `POST /api/v1/jobs/:id/submit` | Owner | expected version | Validates/opens job, dispatches matching in outbox |
| `GET /api/v1/opportunities` | Approved worker | pagination | Only matched eligibility, privacy filtered |
| `POST /api/v1/jobs/:id/quotes` | Approved matched worker | scope, items, type, expiry | New quote version with computed total |
| `POST /api/v1/quotes/:id/accept` | Client owner | expected version, schedule | Atomic quote selection and pending booking creation |
| `POST /api/v1/bookings/:id/respond` | Selected worker | accept/decline + schedule | Updated booking, event, alerts |
| `POST /api/v1/bookings/:id/transition` | Participant | action, expected version, evidence refs | Guarded transition |
| `POST /api/v1/bookings/:id/change-orders` | Party | scope delta | Proposal; both-side acceptance for scope/price |
| `GET /api/v1/conversations/:id/messages` | Member | cursor | Membership-filtered messages |
| `POST /api/v1/conversations/:id/messages` | Member | body, attachments | Server-set sender, rate-limited, outbox |
| `POST /api/v1/bookings/:id/payment-intents` | Payer/owner | agreed amount, method, idempotency | Direct attestation or checkout URL if enabled |
| `POST /api/webhooks/paystack` | Payment provider | signed raw bytes | Validate signature, persist/dedupe, reconcile asynchronously |
| `POST /api/v1/bookings/:id/reviews` | Completed participant | 1–5 stars, comment | Only one review per direction |
| `POST /api/v1/bookings/:id/disputes` | Participant | reason, evidence | Case creation + freeze relevant automatic handling |
| `POST /api/v1/reports` | Signed-in | subject, reason, evidence | Safety queue, status without leaking target |
| `POST /api/v1/notifications/mark-read` | Recipient | IDs | Own only |
| `POST /api/v1/me/export` | Account owner | confirmation | Async secure export and expiry |
| `POST /api/v1/me/delete-request` | Account owner | confirmation | Retention/review workflow, status |
| `POST /api/v1/admin/verifications/:id/decision` | MFA admin | decision, reason, version | Publishes/unpublishes worker as applicable; audit |
| `POST /api/v1/admin/disputes/:id/resolve` | MFA support/admin | decision, evidence | Immutable resolution audit; payments separate |
| `GET /api/v1/admin/payments/reconcile` | MFA admin | filters | Discrepancies only, redacted data |
| `POST /api/internal/{notify,reconcile,expire}` | Trusted scheduler | auth header / signed cron | Bounded idempotent tasks, no browser access |

### Example request/response contracts
**POST job:**
```json
{"categoryId":"uuid","title":"Kitchen tap leaking","description":"Water is leaking below the kitchen sink when the tap is open.","urgency":"urgent","preferredStart":null,"budgetMinCents":null,"budgetMaxCents":150000,"locationToken":"server-issued-address-or-geocoder-token","mediaIds":[]}
```
**Quote response:**
```json
{"data":{"id":"uuid","jobId":"uuid","workerId":"uuid","version":1,"pricingType":"fixed","subtotalCents":85000,"travelFeeCents":5000,"totalCents":90000,"currency":"ZAR","status":"submitted","validUntil":"2026-11-05T12:00:00Z"}}
```
**Payment:**
```json
{"data":{"id":"uuid","bookingId":"uuid","method":"online","amountCents":90000,"currency":"ZAR","status":"pending","checkoutUrl":"https://provider.example/hosted-checkout/..."}}
```
The checkout URL above is illustrative, not a live/provider-generated URL. Never allow client-specified arbitrary `checkoutUrl` or use a client-provided amount as source of truth.

# 14. Messaging and notifications

## Conversations
Create only for authorized interested parties (client + eligible responding worker). Prevent unsolicited messaging unrelated to job; support quote clarification and the booked conversation. Realtime subscriptions must enforce membership in DB and server; never subscribe to a global channel containing private conversations. Sent messages immutable except moderator tombstone; soft delete or redaction with audit, not destructive alteration. Attachment access signed per member.

## Channels and events
| Event | Recipient | Pilot channel | Escalation |
|---|---|---|---|
| OTP | Registering user | SMS Auth provider | Rate/cost alerts |
| Worker verification result | Worker | In-app + email | Optional SMS pending provider |
| Matching opportunity | Eligible workers | In-app + email | Push/SMS urgent if enabled and opted in |
| New quote | Job owner | In-app + email | Push if enabled |
| Booking request/acceptance | Counterparty | In-app + email | SMS for urgent if enabled |
| Appointment reminder | Both | In-app + email | SMS critical optional |
| New message | Counterparty | In-app + grouped email | Respect quiet hours and dedupe |
| Completion / dispute | Parties, support | In-app + email | Safety urgent escalation when necessary |
| Payment success/failure/refund | Payer, worker | In-app + email | Provider event audit/reconciliation |

**Outbox:** write domain event + channel tasks in same transaction where feasible; worker claims bounded jobs, retries exponential backoff with jitter, max retries and dead-letter queue; dedupe by event/user/channel, audit failed tasks, suppress notification if user disabled channel or event stale. Notifications must not reveal exact address or bank/identity details. Keep receipts/critical transactional notices distinct from optional marketing, with consent records and unsubscribe choices.

# 15. Background jobs and reliability

Tasks: match new jobs; resend invitation waves; expire jobs/quotes; booking reminders; completion reminder/escalation; verification expiry scanning; publish/unpublish cards; send notification outbox; reconcile provider payments/settlements/refunds; retention/deletion and stale upload cleanup; abuse/rate-limit metrics and daily reports.

**Run method [A]:** Vercel cron calling private `/api/internal/...` with secret/signed request; bounded batch processing and Postgres locks (`FOR UPDATE SKIP LOCKED`), dedupe keys, safe replay. No work should rely solely on a browser tab being open. If deployed cron quota/frequency is inadequate, move to Supabase Cron/Queues or a dedicated worker after evaluating current provider docs. Timeouts must not create half-completed bookings or double charges.

**Observability:** structured logs with `requestId`, actor ID hash, entity ID, provider event reference (safe), latency and status; errors to configured tracker; never log OTPs, raw documents, street addresses, full phone or payment metadata. Dashboard: active users, approved vs pending providers, match fanout, quote conversion, booking conversion, on-time rate, disputes, notification failures, auth SMS spend, webhook lag and payment reconciliation discrepancies. Alert on urgent matching pipeline failure and suspicious admin access.

# 16. Test strategy and measurable acceptance

## Verification pyramid
- **Unit (Vitest):** Zod forms, E.164 normalization, ZAR cents/line totals, quote valid-until, date windows, state machine guards, matching score/fairness, coverage radius and 1km/10km geospatial edges, utility error messages.
- **Database (pgTAP/local Supabase):** constraints, duplicate prevention, index presence, public/private schema exposure, anonymous/owner/matched worker/unmatched worker/admin rights for all select/write paths; ensure no RLS recursion; check views `security_invoker` and definer execute grants. A policy that matches zero rows is not proof of a working update.
- **Integration:** server commands with real test DB, transactional races, rate-limits, doc upload validation, signed media access; webhook HMAC raw-body/timing-safe validation, replay/out-of-order and reconciliation; SMS/email failures and dedupe.
- **Playwright E2E:** 390×844 and 1440×900, both modes, OTP local test numbers, browse map/list, location denied/manual pin, multi-step job draft, worker approval, matching, quote/inspection, booking accept/decline, chat, direct payment, online sandbox gated, completion/dispute/review, admin approval and safety report, logout/mode switch, PWA update, offline states, reduced motion/keyboard/axe smoke checks. Validate Light/Dark/System persistence, OS preference updates, first-paint correctness, theme/map/wizard state preservation, GSAP cleanup and keyboard accessibility per `docs/design/MOTION_AND_THEMES.md`.
- **Security regression:** cross-user IDOR for every job/quote/booking/message, self-approval attempt, direct API posting by unverified worker, address leaked via public worker/map HTML/REST, signed URL reuse/expiry, tampered quote total, duplicate payment event, forged EFT, forged webhook, duplicate booking races, malicious file upload, admin MFA bypass, suspensions and cached session.

## Release quality gates
1. Reproducible install and pinned lockfile; formatting/lint/typecheck passes.
2. Build succeeds for production, no secrets in browser JS/sourcemaps.
3. All unit/integration/pgTAP tests pass; Playwright critical mobile/desktop journeys pass on staged build.
4. RLS, server authorization and negative privacy tests specifically checked. Screenshot/capture network inspector confirms precise addresses not in public responses, assets or telemetry.
5. No unresolved critical/high security issues or unreviewed payment provider assumptions.
6. Admin can manage suspected fraud and worker document queues safely; suspended worker no longer receives opportunities.
7. Maps work with approved hosted provider, manual fallback and accurate attribution.
8. Real device test on lower-end Android and iPhone Safari; location denied flow; keyboard only path; WCAG 2.2 AA smoke + manual checks.
9. Logging/alerting, backup recovery, payment reconciler and incident contacts functional.
10. Any unavailable CI minutes are reported as **not run**; local verified checks are evidence, but a failed/unexecuted workflow isn't automatically considered green.

## Acceptance scenarios
**AC-01** Guest can browse verified worker cards by category and town with location off and no exact addresses in response.

**AC-02** A client can save a draft, upload 2 photos, choose urgent, add private location, review privacy warning and submit; at most bounded eligible workers receive matches.

**AC-03** Unverified worker attempting opportunity read, quote submission or booking acceptance receives no permission, even by manually calling endpoint.

**AC-04** Verified matching worker can view job's permitted details and submit a quote, but cannot read the street address before booking or explicit inspection grant.

**AC-05** Client accepts a valid quote; only one pending booking is created even when requests are retried concurrently; selected worker must confirm.

**AC-06** A client and worker in the job conversation can chat; unrelated authenticated user and guest cannot read messages.

**AC-07** Provider webhook duplicate and forged signature cannot double-book, over-credit or mark payment settled incorrectly.

**AC-08** Direct EFT is labeled self-reported until appropriate confirmation; online payment disabled shows functional direct alternative.

**AC-09** Worker marks complete, client disputes; booking moves to disputed and does not auto-close on schedule; admin has evidence trail.

**AC-10** Only genuine completed booking participants can submit one mutual review each; pending/hidden reviews not shown publicly.

**AC-11** Admin accesses ID file only with MFA/role and audit; worker and client never see someone else's private file.

**AC-12** Worker toggles between client and worker modes without losing owned jobs or gaining extra privileges.

# 17. Deployment, environments and security operations

## Environments
`local` uses Supabase CLI and test phone numbers; `staging` isolated Supabase project, sandbox merchant and dummy SMS; `production` separate DB/storage/keys/merchant with production geocoder quotas. No production PII in fixtures or screenshots. Vercel environment variables managed per environment; never reuse production secrets in preview builds; limit production data access to trusted accounts. Use a dedicated GitHub repository.

## CI/CD and release workflow
- Pull request: typecheck, lint/format, unit, migration test, RLS pgTAP, integration, Playwright smoke desktop/mobile, production build, dependency scan.
- Migrations: additive and reversible where possible; backup before destructive changes; review DB advisors and check `private` schema stays unexposed; compare migration to schema blueprint.
- Deploy staging, verify end-to-end with sandbox provider, run security scenarios, then release to production with feature flags and rollback plan.
- Store secrets in Vercel/Supabase secret managers; rotate/revoke on leakage. Monitor auth/SMS spend, webhook delivery errors, failed jobs/notification outbox.
- Backups: choose paid plan/config with proven restore support, test recovery periodically, retention and deletion schedule aligned with obligations.

## Operational runbooks required
`onboard-worker.md`, `verify-credential.md`, `respond-to-safety-report.md`, `incident-and-breach.md`, `refund-and-chargeback.md`, `payment-reconciliation.md`, `disable-checkout.md`, `failed-SMS-OTP.md`, `geocoder-outage.md`, `db-restore.md`, `user-data-access-deletion.md`, `worker-suspension.md`.

# 18. Monetization and launch plan

**Pilot is free [C].** No pay-to-quote or unfair boosts. Recruit by trusted community channels, referral verification and trade associations; don't seed fake contractors. Invite a balanced supply of plumbers, locksmiths, painters, installers, cleaners, gardeners, handymen and relevant maintenance trades. Some riskier categories may be delayed pending credentials. Offer assisted onboarding but record real person/consent.

**Operational sequence:** (1) internal test with fake data, (2) 5–10 genuine workers in closed beta, (3) 25–40 verified supply profiles and invited clients in selected towns, (4) monitor quote/booking completions and complaints, (5) public pilot after safety/payment/legal checklist, (6) explore more Mpumalanga towns and controlled revenue experiments only with terms updated.

**Metrics:**
- North star: genuine completed jobs with satisfied customers and no unresolved serious safety concern.
- Supply: verification completion, time to approval, active worker coverage per category/town, acceptance rate.
- Demand: completed job posts, match coverage, first response p50/p90, quote count, conversion from quote to booking.
- Quality: no-show/cancellation, reviews, repeat hires, safety reports and resolution time.
- Economics: SMS OTP cost per activated user, provider costs, mapping usage, support time, cost per successful booking, refund loss.

**Competitive positioning note:** local players such as Cirvo, Mendo, Mosebetsi and others already offer overlapping features. Investigate actual service availability in smaller-town pilot rather than claiming category novelty. Duzelo must win on real verified coverage, transparent service regions, excellent responsiveness and simple workflows.

# 19. Risks / decisions requiring external validation

| Risk or open fact | Priority | Required validation / mitigation |
|---|---|---|
| Name clashes and domain | Blocker to brand launch | Trademark clearance/CIPC search, domain and app-store handle checks; keep configurable |
| Online merchant settlement | Blocker to live checkout | Confirm SA Paystack marketplace approval, legal merchant of record, splits, worker settlement, KYC, refunds, chargebacks, direct vs merchant funds |
| Regulated/high-risk services | Blocker per category | Legal/trade expert checks for electrical, plumbing COCs, gas, locksmith and insurance claims; disable unsupported tasks |
| POPIA and ECTA/CPA | Blocker to public launch | South African counsel/privacy officer review; processor DPAs, disclosures, retention, reporting |
| Provider OTP deliverability/cost | High | Benchmark SA mobile networks, retries, rate limits, monthly caps, backup contact route |
| Rural geocoding accuracy | High | Manual map pin, human town validation, access instructions behind booking |
| Worker trust / fraud | High | Manual review, appeals, audit, suspension, only genuine reviews |
| Marketplace cold start | High | Start in narrow geography/categories, invite workers before marketing to clients |
| Client no-shows/disputes | High | Agree scope, timely reminder, proof, moderation and support workflow |
| Admin privileged access | High | MFA, least privilege, audit, alerts on document access, periodic review |
| PWA push limitations | Medium | In-app/email/SMS fallback, test installed-PWA support on iOS |
| No dedicated real-time queue | Medium | Bounded cron/outbox, error monitoring, later specialized queue if volume grows |
| Marketplace workers' legal status | High | Contractor agreements, tax, insurance, labor/legal advice, avoids false employment claims |

# 20. Documentation and handoff definition

Required repository documents: `README.md` setup, `.env.example`, `docs/PRD.md`, `docs/architecture.md`, `docs/schema.md` ERD, `docs/permissions.md`, `docs/states.md`, `docs/API.md`/OpenAPI, `docs/security.md`, `docs/design-decisions.md`, `docs/operations/*.md`, `docs/ADR` for irreversible choices, `CHANGELOG.md` and test evidence. Use realistic fixtures with **synthetic addresses and phone numbers**; never include the founder's precise location, personal phone, or real users in seeds.

**Definition of done for each milestone:** implemented working code (not fake screen), exact tests run with outputs, verified negative authorization paths, no untracked secrets, PR diff reviewed, functional walkthrough desktop/mobile, docs updated, limitations recorded. If tools are not configured (no SMS, geocoder, merchant), finish the mock/sandbox path behind feature flags and report the dependency rather than fabricating success.

# 21. External documentation and evidence checked on 2026-10-31

- Supabase Phone OTP: https://supabase.com/docs/guides/auth/phone-login
- Supabase RLS policies and tests: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase SSR clients: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase PostGIS: https://supabase.com/docs/guides/database/extensions/postgis
- MapLibre geolocation: https://maplibre.org/maplibre-gl-js/docs/API/classes/GeolocateControl/
- OpenStreetMap tile policy: https://operations.osmfoundation.org/policies/tiles/
- Public Nominatim policy: https://operations.osmfoundation.org/policies/nominatim/
- PostGIS ST_DWithin: https://postgis.net/docs/ST_DWithin.html
- Paystack splits: https://support.paystack.com/en/articles/2132802 and https://paystack.com/docs/payments/split-payments/
- Paystack webhook authenticity: https://paystack.com/docs/payments/webhooks/
- Paystack transaction verification: https://paystack.com/docs/payments/verify-payments/
- Paystack refunds: https://paystack.com/docs/payments/refunds/
- Information Regulator security incident fact sheet: https://inforegulator.org.za/2025/08/19/fact-sheet-handling-of-security-compromises/
- POPIA Section 22 legislative text: https://api.acts.co.za/protection-of-personal-information-act-2013/22__notification_of_security_c.php
- PIRB trade validation example: https://www.pirb.co.za/
- Existing SA marketplace references: https://cirvo.co.za/ , https://mendo.reetse.co.za/ , https://mosebetsi.co.za/how-it-works

*This document is an engineering/product proposal, not legal advice or a statement that external payment providers have approved your business. Confirm current vendor terms, local law and tool versions before implementation and launch.*


## October 2026 vendor change notes [V]

- Supabase changelog dated October 12, 2026 announces a future November 10, 2026 change disabling obsolete TLS 1.2 ciphers; keep provider runtimes updated and check webhook/worker TLS compatibility. See https://supabase.com/changelog?types=breaking-change .
- Supabase's `@supabase/ssr` is documented as a beta package; pin a tested compatible version and watch releases rather than assuming stable APIs. See https://supabase.com/docs/guides/auth/server-side .
- Paystack's South African transaction splitting and vendor transfers are features with onboarding/eligibility constraints, not proof of escrow or automatic right to custody; assess registered-business requirements and refunds before live checkout. See https://support.paystack.com/en/articles/2132802 and https://support.paystack.com/en/articles/2132866 .
- The Information Regulator publishes a security-compromise notification fact sheet: https://inforegulator.org.za/2025/08/19/fact-sheet-handling-of-security-compromises/ . Establish incident notification and access-request runbooks before pilot.
- CIPC offers a free preliminary trademark search; use that plus appropriate professional clearance for name selection: https://www.cipc.co.za/?page_id=4118 .

# Milestone 06 local quotations and appointments

Production quotation/booking gates remain OFF. Use an unlinked disposable checkout, Node 24 and sufficient Docker capacity for the existing native Auth/Storage/ClamAV stack. Follow [worker review setup](../workers/LOCAL_REVIEW.md), then:

```sh
npm ci
npm run auth:start
npm run db:reset
npm run auth:env
npx --no-install playwright install chromium
npm run test:auth
```

The ignored mode-0600 environment enables quotation and booking flags only for loopback acceptance. Native Auth validates fixed OTPs without SMS delivery. Existing fixtures `0820000001`–`0820000006` remain; M06 uses client `0820000007` and workers `0820000008` / `0820000009`, code `123456`. Never copy test hooks/fixtures into hosted settings or use real identity, address or financial data.

For manual use, start the optional discovery HTTP fixture and the app as described in [M05 setup](../jobs/LOCAL_JOBS.md). Complete native onboarding and the actual M03 evidence/manual-review flow to publish a fictional local provider. The automated matching-scale fixtures are SQL read-model metadata, not genuine evidence uploads or real verified providers.

From a current worker opportunity, choose **Prepare a quote**. Enter scope, exclusions, line quantities/prices, travel, declared tax and proposed SAST window/expiry. Saving appends a private version; sending is separate. An unsent amendment leaves the current offer intact. Invalid visible decimal inputs cannot submit an older amount. Quotes can be resumed through **Quote workspace**. The client opens **Review quote offers** from the saved request and compares genuine published versions.

A priced choice creates a pending appointment. The chosen worker must confirm after current approval and schedule checks. Exact location remains withheld until confirmation. A separate logged **View authorized location** action checks permission on every request and clears its temporary view after at most one minute. Location data never appears in ordinary quote/booking payloads, URLs, notifications or offline caches.

An inspection proposal has a separate disclosed visit fee and no agreed work total. All three client consents are required. Permission opens no earlier than one hour before the visit, ends with the visit and is revocable. Inspection approval creates no work booking. A later priced version requires a new client choice and worker confirmation.

| Endpoint | Boundary |
| --- | --- |
| POST `/api/v1/agreements/save` / `publish` / `withdraw` | Current worker identity, own invitation/quote, immutable revisions, server pricing and eligibility |
| POST `accept` | Owner/version/expiry/current eligibility; one atomic pending booking, never inspection work |
| POST `authorize-inspection` / `revoke-inspection` | Explicit owner consent, fixed quote/fee/window, revocable private grant |
| POST `cancel-request` | Owner/version/consent before booking; close offers and revoke grants |
| POST `booking-confirm` / `booking-decline` / `booking-cancel` | `?mode=worker` or `client`; actual chosen party, current version and permitted state |
| POST `location` | Fresh current permission before every idempotent replay; no cached address |
| GET `job?jobId=…&mode=…` / `booking?id=…&mode=…` / `bookings?mode=…` | Verified current participant; redacted no-store DTOs |

POST bodies are strict same-origin JSON, bounded at 32 KiB, and require a 16–128-character `Idempotency-Key`. Other domains retain their existing 8 KiB default. Amounts/totals/actor IDs/status cannot be injected. Rate limits return 429/Retry-After. Losing workers retain their own quote history without another provider's booking ID or renewed request details.

Decline/cancellation ends this request without fees, refunds, fault findings or automatic rematching. Start a new request for another appointment. No-show cancellation is a participant report available thirty minutes after the proposed start. Accepted terms/history stay immutable. No payment, conversation, work start, reschedule or completion action is implemented here.

For hosted activation, keep `QUOTATIONS_ENABLED=false` and `BOOKINGS_ENABLED=false` until a dedicated Supabase project, migration/restore review, approved `BOOKINGS_POLICY_APPROVED`, legal/privacy/tax/retention/scanner operations, physical deletion and monitoring/follow-up are ready. No paid resource or hosted provider is configured by this setup. See [ADR 0007](../adr/0007-quotes-and-appointments.md). Stop before M07.

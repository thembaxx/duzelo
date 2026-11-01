# Milestone 05 local request acceptance

Production requests and matching remain OFF. Use Node 24, an unlinked disposable checkout and sufficient Docker capacity. Follow [worker review setup](../workers/LOCAL_REVIEW.md) for the pinned healthy ClamAV scanner. Never supply real identity/address data or load fixtures into a hosted project.

```sh
npm ci
npm run auth:start
npm run db:reset
npm run auth:env
npx --no-install playwright install chromium
npm run test:auth
```

The ignored mode-0600 environment enables Auth, worker review, discovery, jobs and matching only for the loopback native stack. The runner builds the production app, scans browser assets against ephemeral server-secret canaries, starts/stops the synthetic geocoder fixture and runs all desktop/mobile cases. M05 uses native OTP, PostgreSQL, real private Storage and ClamAV. Match-scale fixtures are explicitly fictional SQL review/read-model metadata; existing M03 cases separately prove the actual evidence/review flow.

For interactive testing:

```sh
node scripts/discovery-fixture-server.mjs
# Separate terminal:
node --env-file=.env.auth-test node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Sign in at http://127.0.0.1:3000/sign-in using a configured local phone fixture (`0820000001`–`0820000006`, code `123456`, no SMS). Complete onboarding with client/worker capabilities as needed. Use **My requests** in the client workspace, save a draft and resume it from the list. A published reviewed profile's **Request this worker** action enters the same wizard with one selected recipient. A directory without reviewed inventory remains empty.

The six steps collect category, supplied details/optional photos, urgency/windows, optional budget, a private location and review consent. Save before leaving to recover the latest persisted version. Browser storage never holds the private draft. GPS is explicit and optional; manual point, owned saved address or clearly approximate town-only fallback remain available. Location confirmation is private to its owner. Worker opportunity previews disclose only the town, never the supplied street/access notes/point.

A worker uses **Opportunities** to review/decline an actual current eligible invitation. Opportunity preferences persist urgency consent, a bounded daily cap, private unavailable times and client blocks. Removing a block permits future matching but does not restore declined invitations. Real in-app notices are history; the opportunity view rechecks current access.

| Boundary | Behavior |
| --- | --- |
| POST `/api/v1/jobs/create`, `save`, `submit`, `cancel`, `dispatch` | Verified client, live session, owner/version/idempotency/audit; strict same-origin bounded JSON |
| POST `upload` / `remove-photo` | Owner draft, scanner/sanitizer, real private Storage, immutable reservations/deletion intent |
| POST `view` / `decline` / `worker-block` | Live eligible matched worker; preview access can expire or be revoked |
| POST `preferences` / `time-block` / `remove-time-block` | Verified worker-owned settings, bounded values and conflicts |
| GET `/api/v1/jobs/:id` | Exact private draft returned only to current owner |
| GET `opportunities` / `opportunity?matchId=…` | Current eligible matched worker, coarsened DTO |
| GET `/api/v1/jobs/media/:id` | Retained photo proxy, current owner/match authorization, no-store |

Command names are defined in `src/app/api/v1/jobs/[action]/route.ts`. Every command requires a 16–128-character `Idempotency-Key`. Error responses are redacted and rate limits use 429/Retry-After. New drafts are capped at twenty per client/day, submissions at five; worker invitations are capped at three/hour and a selected daily maximum up to twelve.

The first wave dispatches on submit. Later waves require **Check next invitation wave** after the due time; no unattended scheduler is configured. At most three waves of five are permitted, with one selected recipient for direct requests. Only in-app notifications are implemented; no SMS/email/push is sent. Unknown delivery/submit outcomes must be checked by retrying the same action or reloading the persisted request.

Before hosting, obtain a dedicated approved Supabase project, review migration/restore and existing Auth/worker prerequisites, approve `JOBS_POLICY_APPROVED` with a bounded `JOB_MEDIA_RETENTION_DAYS`, and configure physical deletion/reconciliation/monitoring. Both `JOB_REQUESTS_ENABLED` and `LOCATION_MATCHING_ENABLED` stay false meanwhile. Access retention expiry is tested; automatic physical erasure is an unresolved operations requirement. No quotation, inspection grant, booking or payment exists in M05.

See [ADR 0006](../adr/0006-private-jobs.md) for locks, eligibility, privacy and rollback, and [acceptance evidence](../evidence/milestone-05.md). Stop before M06.


# Isolated worker onboarding and review (M03)

Production worker review and Auth remain OFF. Start from an **unlinked disposable checkout**, Node 24, Docker and sufficient disk/RAM for PostgreSQL, native Auth, Storage and ClamAV. Do not run these resets against a hosted project or upload real ID files.

```sh
npm ci
# Local-only scanner port. Official digest, bundled signatures for repeatable tests.
docker run -d --name duzelo-clamav -p 127.0.0.1:3310:3310 \
  -e CLAMAV_NO_FRESHCLAMD=true \
  clamav/clamav:1.5.4@sha256:bda39705e291105049c3936e2803ac90b955172af8030f94f05dce1252df6c6d
# Wait until Docker reports this scanner healthy before testing.
npm run auth:start
npm run db:reset
npm run auth:env
npx --no-install playwright install chromium
npm run test:auth
```

`auth:start` includes native private Storage. `auth:env` writes ignored mode-0600 `.env.auth-test` using local keys without printing them, enables only the local Auth/worker capability and points at loopback clamd. The test runner produces an Auth-enabled production build, checks browser assets against both actual server secrets, and executes the existing Auth and new worker desktop/mobile cases. Other sensitive flags stay OFF. CI provides its own pinned healthy scanner service.

For interactive use:

```sh
node --env-file=.env.auth-test node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Open http://127.0.0.1:3000. Fictional fixture phones `0820000001`–`0820000006` use `123456`, with native local sessions and no sent SMS. Choose worker/both, save a profile at `/app/worker/onboarding`, then upload **synthetic JPEG/PNG images** and submit. Base coordinates are private and optional browser geolocation is requested only by the explicit button; manual coordinates survive refusal. There is no geocoder or matching in this milestone. Curated test towns are fixtures; no real service-area launch is claimed.

Administrator membership must be bootstrapped by an approved operator using the existing [M02 procedure](../auth/LOCAL_ACCOUNTS.md). Native TOTP requires the operator's independently verified email. Use `/admin/verifications` at desktop width to inspect pending claims, request audited short-lived document links, record reasons/expiry and separately publish the reviewed eligible categories. Public profiles appear at `/workers` only after those real commands succeed. Local test profiles carry a fictional-fixture notice.

| Command (POST `/api/v1/workers/:action`) | Authorization / effect |
| --- | --- |
| `profile` | Owner worker, saves private draft and services, withdraws old publication |
| `upload` (multipart) | Owner current draft, bounded photo + purpose/consent, real malware scan and metadata scrub |
| `submit` | Owner current revision with retained required evidence, enters pending review |
| `document-access` | Owner or independent MFA owner/verification reviewer; audited link ≤60s and retention deadline |
| `decision` | Independent MFA reviewer, reason/date/current revision; no self-approval |
| `publish` | Independent MFA reviewer, required approvals and explicit public-content confirmation |
| `purge-expired` | Independent MFA reviewer, explicit confirmation, two-phase provider deletion |

All commands require same-origin requests and `Idempotency-Key` (16–128 permitted characters). Ordinary inputs are strict bounded JSON; upload accepts exactly one `metadata` JSON field and one file. Public GET `/api/v1/workers/media/:id` accepts only an approved current public photo, never a private claim. Account/worker pages, mutable public profiles and media are `no-store` and excluded from the PWA cache.

Uploads are photos only: max 3 MiB, max 25 MP, minimum 32×32, normalized to JPEG within 1800×1800. Current revision permits one avatar, six portfolio images and three images per evidence kind/category, with overall limits of 24 per revision / 60 retained. Saving an edited submitted/reviewed application requires fresh evidence and review. A mistaken draft avatar currently needs a new revision after submission; per-image discard is deferred.

Local retention is seven days. Access/publication stop at expiry; a staffed operator must use **Remove expired private files** to delete provider bytes. Abandoned pending intents become removable after one hour. This is a real deletion command, not an automatic cron claim. Signed URLs already issued are bearer leases for at most 60 seconds and cannot be individually recalled; removal revokes access to the deleted object.

Hosted activation is blocked until dedicated Supabase organization/project, current SMS/CAPTCHA/verified operator setup, approved service scopes/privacy/retention notices, staffed review and cleanup, fresh signature updates and a privately reachable TLS-verifiable scanner are established. `.env.example` documents settings. Nothing in these local tests creates that hosting or approves legal policy. The default public Vercel release leaves `AUTH_ENABLED=false` and `WORKER_APPROVAL_ENABLED=false`.

See [ADR 0004](../adr/0004-worker-evidence.md) for security, provider compatibility, migration and rollback, and [M03 evidence](../evidence/milestone-03.md) for checks actually run. Stop before M04 map/discovery work.

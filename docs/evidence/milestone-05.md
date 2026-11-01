# Milestone 05 — guided requests and eligible opportunities

Implemented 2026-11-01 on merged M04 `a74c2b4`. The original mark, editorial typography, Light/Dark/System, navigation and public PWA remain in place. No dedicated hosted Supabase, real worker inventory, live SMS/maps/payment provider, hosted migration or paid resource was provisioned.

## Result and scope

Clients can create, save and recover a private six-step request, add optional scanned photos, choose SAST windows and an optional integer-cent budget, consent to a private location and submit. Direct requests use the same domain and invite only the selected eligible provider. Real server matching checks current manual/category review, credentials, availability, blocks, private coverage, schedule, urgency and exposure caps. Fairness rotation, unique rows and a deduplicated in-app outbox bound normal requests to three waves of five.

Workers see a current eligible invitation with a public town, supplied work details and protected photos. They can view/decline, block/unblock clients and save urgency, daily-cap and private schedule preferences. Exact street, access notes, point, worker base, object keys, internal score and client identity are excluded. Current eligibility, retained media and live sessions are rechecked; view cannot extend expiry. Ended requested windows no longer confer eligibility, and the request deadline is capped at the last window.

Production Auth, worker approval, discovery, requests and matching remain OFF. Quotations, inspection grants, bookings and payments are not implemented. Later invitation waves require the owner's due-wave check; no unattended hosted scheduler exists. Only real in-app delivery is implemented, with no SMS/email/push fanout.

## Verification record

[Application CI run 41330408039](https://github.com/thembaxx/duzelo/actions/runs/41330408039) passed all three jobs for application/test source **`a707c4728e3067cb239e31afb91f1b38f5601a66`**. [ci-results.json](milestone-05/ci-results.json) preserves exact job/step outcomes and artifact provenance. Selected redacted [application](milestone-05/ci-verify.log), [database](milestone-05/ci-database.log) and [native acceptance](milestone-05/ci-auth.log) logs record observed results. This handoff adds only documentation, logs and successful-run captures; the final PR head must also pass required checks before merge.

The local Docker VFS lacks capacity for the full native stack. Database/Auth/Storage/ClamAV execution below occurred only on disposable GitHub runners. Static SQL checks are not substitutes for native execution. No dependency changed; CI reproduced the existing pinned lockfile with `npm ci` in three fresh jobs.

| Command / environment | Observed local outcome |
| --- | --- |
| `npm run format:check` | Passed |
| `npm run lint`, `npm run typecheck` | Passed in `npm run check` |
| `npm test` | **236 passed**, 23 files |
| `npm run test:db:static` | Passed, structural SQL checks only |
| `npm run build` — sensitive features OFF | Passed in `npm run check` |
| `node scripts/check-boundaries.mjs` | Passed, transitive client/server imports |
| `npm audit --audit-level=high` | Passed, **0 vulnerabilities** at execution |
| `npm run security:check` | Passed; 37 browser assets, no local canary supplied |
| `npm run test:public` | **8 passed**, public desktop/mobile production-browser cases |

[Local command logs](milestone-05/) record those outcomes. The source build/check was rerun after the final timing fix; formatting, boundaries, secret scan and public browsers were also rerun. The dependency audit predates that server/test-only fix; package manifests and lockfile are unchanged.

| Native CI command | Observed outcome |
| --- | --- |
| `npm ci` — three fresh jobs | Passed |
| `npm run db:start`, `npm run db:reset` | Passed, fresh reviewed migration replay |
| `npm run db:test` | **174 pgTAP assertions**, 7 files, passed |
| `npm run db:concurrency` | Both publication/revocation races passed |
| `npm run db:advisors`, `npm run db:lint` | Passed; no reported security issues or application schema errors |
| `npm run db:explain` | Existing private coverage and public-marker GIST probes passed |
| `npm run auth:start`, `npm run auth:env` | Passed, actual local native Auth/Storage and private ignored environment |
| `npm run test:auth` — healthy pinned ClamAV 1.5.4 | Jobs-enabled production build and three browser-secret canary scans passed; **10 full desktop/mobile cases passed** |

The CI verify job separately passed format, lint, types, 236 units, static SQL, build, boundaries, audit, secret canary and eight public browser cases. The native suite includes eight existing Auth/worker/discovery cases plus two complete M05 scenarios at **390×844** and **1440×900**.

M05 acceptance covers actual OTP/onboarding, six-step persistence/resume, directional focus/reduced motion, Light/Dark/System draft preservation, real Storage photo upload/removal, EICAR rejection, EXIF removal, same-key parallel upload dedupe, eight-photo reservations, offline retry and no private URL/storage cache. Matching checks include parallel waves, duplicate submits/keys, cap fifteen, fairness rotation, actual deduplicated in-app notices, direct-only dispatch, both blocks/unblock, private schedule/suspension/retention revocation, unknown town-only zero matches, urgent preference/deadline, submission quotas, wrong-owner address, spoofed coordinates, stale version, invitation/request expiry, cancellation and revoked-session cached-response denial. Worker HTML/JSON exclude synthetic private-location/base canaries; preview axe and overflow checks pass. pgTAP adds category-specific credential, radius/town, no-self and direct ineligible-target denials.

Pattern/canary scans are bounded evidence, not a complete security audit. The native runner scans emitted browser assets against its ephemeral Auth rate-limit secret, private Storage credential and inert geocoder canary. ClamAV's isolated pinned definitions are intentionally offline and warn about age; actual EICAR detection is proven, not current hosted malware coverage.

## Screenshots

Six successful-run captures were downloaded from artifact **13093495487** and inspected for readable layout, wrapping and privacy. They show fictional requests/providers and selected scrolled viewport states, not real customers or physical devices. They include no street/point, person, cookie, secret, signed URL, trace or video. The SQL fixtures supply reviewed/read-model metadata for matching scale; they do not claim real native approval. Existing independent M03 cases still exercise the actual evidence/scanner/MFA-review flow.

| Surface | 390×844 | 1440×900 |
| --- | --- | --- |
| Recoverable draft, work details | [mobile](screenshots/jobs-draft-mobile.png) | [desktop](screenshots/jobs-draft-desktop.png) |
| Coarsened worker opportunity | [mobile](screenshots/jobs-opportunity-mobile.png) | [desktop](screenshots/jobs-opportunity-desktop.png) |
| Bounded invitation history | [mobile](screenshots/jobs-submitted-mobile.png) | [desktop](screenshots/jobs-submitted-desktop.png) |

## Corrected failures and activation blockers

Earlier branch runs failed on a Docker host port conflict (retried), an alert selector also matching Next's route announcer, a stale preference-success message, a missing synthetic town slug and one selector retaining the previous invitation heading. These were corrected. Source review also added completed-onboarding checks and the ended-window/deadline fix. Superseded in-progress runs were cancelled; neither failures nor cancellations are reported passing.

Before hosted activation: dedicate/approve Supabase, review migration/restore and existing Auth/worker/privacy prerequisites, configure scanner health/signature freshness, approve bounded media retention and implement physical deletion/orphan reconciliation/monitoring. Access expiry is enforced, but it is not physical erasure. Later-wave background scheduling needs a separately configured operator/scheduler if unattended delivery is desired. User-authored text/photo pixels may voluntarily include PII; EXIF removal is not semantic redaction. Production-scale latency, real delivery/provider quotas and physical-device performance were not measured.

Both job/matching flags stay OFF with no hosted migration. Roll back by disabling both flags and retaining legitimate data/audit under approved policy, not dropping tables. See [ADR 0006](../adr/0006-private-jobs.md) and [local setup](../jobs/LOCAL_JOBS.md). Stop before Milestone 06.


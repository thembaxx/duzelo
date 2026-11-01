# Milestone 06 — immutable quotations, inspection consent and appointments

Implemented 2026-11-01 on merged M05 `fc2a378`. Existing identity, fonts, Light/Dark/System, public navigation and PWA are preserved. No dependency or lockfile changed. No hosted database migration, real provider, payment, SMS, email or public feature activation was performed.

## Result

Workers can save and resume private immutable versions, send or withdraw fixed/estimated itemized quotes, declare tax, travel, scope/exclusions, expiry and a proposed SAST appointment. The server uses integer-cent arithmetic and database price guards. Clients compare genuine offers and explicitly choose one. A locked transaction creates exactly one pending booking, preserves accepted terms, rejects competing offers and sends deduplicated in-app updates. The selected worker must separately confirm after current approval and schedule checks, or decline.

Inspection proposals have no work price. A disclosed visit fee, bounded visit time and precise-location grant each require client consent. Authorization creates no work booking. Permission opens no earlier than one hour before the visit, ends at the visit's end and can be revoked. A later priced offer needs new acceptance and worker confirmation. Exact-location views require an explicit authenticated action, current permission on every replay and a no-store response; the temporary view clears within sixty seconds. Ordinary quote/booking/worker payloads, notices and idempotency acknowledgements omit the private street, point and access notes. Clients retain access to their own M05 request editor.

Decline/cancellation closes the request without payment, penalty, fault findings or automatic rematching. A no-show cancellation is a participant report available thirty minutes after the proposed start. Accepted terms/events remain history. Both quotation/booking flags stay OFF by default and in production. Conversations, rescheduling, work progress/completion and payments remain future milestones.

## Archived source verification

[Source CI run 41357207287](https://github.com/thembaxx/duzelo/actions/runs/41357207287) passed all three jobs for application/test source **`bea3e49d153eb602066de0dcf5e6281398be9fa5`**. [ci-results.json](milestone-06/ci-results.json) preserves job/step outcomes and artifact provenance; selected [application](milestone-06/ci-verify.log), [database](milestone-06/ci-database.log) and [native acceptance](milestone-06/ci-auth.log) logs preserve observed results. The handoff adds documentation/evidence and removes the temporary feature-branch push trigger; PR and main CI remain. The final PR head must independently pass all three jobs before merge.

That archived snapshot predates the final permission-clock correction described below. **The final commit, checks and release outcomes are recorded in [PR #18](https://github.com/thembaxx/duzelo/pull/18)**; its check record is the acceptance gate for the correction. The unchanged interface captures below come from the archived successful source run. Do not treat its 204 assertions as proof of the three later clock-regression assertions.

The local Docker VFS lacks capacity for the full native stack. PostgreSQL/Auth/Storage/ClamAV ran only on disposable unlinked GitHub runners. SQL structure checks alone are not native proof. The existing pinned lockfile was installed with `npm ci` in three fresh CI jobs; no package was upgraded.

| Local command | Observed outcome |
| --- | --- |
| `npm run format:check` | Passed |
| `npm run check` | Passed: Oxlint, Next typegen/strict TypeScript, **259 unit tests / 25 files**, static SQL contract and feature-OFF production build |
| `node scripts/check-boundaries.mjs` | Passed, transitive client/server imports |
| `npm audit --audit-level=high` | Passed, **0 vulnerabilities** at execution |
| `npm run security:check` | Passed; **42 browser assets**; local canary not supplied |
| `npm run test:public` | **8 passed**, desktop/mobile production-browser cases |

[Local command logs](milestone-06/) preserve actual output. CI separately reran these checks with an inert browser-secret canary. The native runner additionally scanned against ephemeral Auth-rate-limit, private Storage and inert geocoder canaries. These bounded scans do not constitute a complete security audit.

| Native CI command | Observed outcome |
| --- | --- |
| `npm ci` | Passed in verify/database/auth jobs |
| `npm run db:start`, `npm run db:reset` | Passed, fresh reviewed migration replay |
| `npm run db:test` | **204 pgTAP assertions / 8 files**, passed |
| `npm run db:concurrency` | Both retained publication/revocation races passed |
| `npm run db:advisors`, `npm run db:lint`, `npm run db:explain` | Passed; no reported security/schema errors; existing spatial index probes passed |
| `npm run auth:start`, `npm run auth:env` | Passed, real native local Auth/Storage and ignored mode-0600 environment |
| `npm run test:auth` | Quote-enabled production build and three browser-secret scans passed; **12 complete desktop/mobile cases passed** |

The native suite retains ten prior Auth/worker/discovery/request cases and adds one full M06 scenario per viewport (**390×844** and **1440×900**). M06 covers real OTP/onboarding; invitation access after another provider quotes; UI invalid-decimal rejection; stable line removal; save/resume/amend/send; declared-tax totals; theme/draft preservation; genuine comparison; parallel different-quote acceptance (one 200, one 409, one booking/event/accepted quote); same-key replay; stale/wrong-worker/manipulated-total/cross-origin denials; loser booking/detail redaction; guest and expired native sessions; current suspension; actual private schedule conflict and explicit worker confirmation; pending-address denial and authorized view; sixty-second UI clearing; acknowledgement-only caching and cancellation/revocation replay denial; withdrawal/expired offer; close-request UI; explicit three-part inspection consent; inspection clock-injection denial; no inspection booking; later priced UI acceptance/worker decline; historical past-appointment no-show cancellation with no payment intent; persisted generic in-app notices; axe and responsive overflow checks.

Additional quote/booking overflow checks cover **320, 768 and 1024 pixels**. Grant before/open/exact-expiry/revocation checks call the same private SQL policy used by the application; only trusted tests supply its internal clock. Browser/server APIs do not accept a caller-selected time. Browser-clock advancement tests only local display clearing. Expired quotations and past appointments are explicitly historical fixtures, not actual visits or findings of no-show. Native matching-scale fixtures provide fictional reviewed metadata; independent M03 cases still exercise real uploads/scanning/MFA review. The pinned offline ClamAV definitions are not a claim of current hosted malware coverage.

## Screenshots

Eight captures were downloaded from successful-run artifact **13104072127** and visually inspected. Dimensions are **390×844** and **1440×900**. They show clearly fictional requests/providers and selected scrolled viewport states, not real customers, verified businesses or physical devices. They contain no private street/point/access notes, real person, cookie, secret, signed URL, trace or video. No capture was taken while an authorized exact location was displayed.

| Surface | 390×844 | 1440×900 |
| --- | --- | --- |
| Worker immutable-version builder | [mobile](screenshots/quotes-builder-mobile.png) | [desktop](screenshots/quotes-builder-desktop.png) |
| Genuine sent-offer comparison | [mobile](screenshots/quotes-comparison-mobile.png) | [desktop](screenshots/quotes-comparison-desktop.png) |
| Explicitly confirmed worker appointment | [mobile](screenshots/booking-confirmed-mobile.png) | [desktop](screenshots/booking-confirmed-desktop.png) |
| Pending client appointment | [mobile](screenshots/booking-pending-mobile.png) | [desktop](screenshots/booking-pending-desktop.png) |

## Corrected failures and activation blockers

Early branch runs failed on PL/pgSQL `CASE` arithmetic parsing; the expression was parenthesized before native migration proof. The first M06 browser run stopped at sign-in because new loopback fixture numbers were absent from the app's separate allowlist; all three local lists now agree. A subsequent test inspected the initial owner's authorized private-request RSC retained by client navigation; reloading the quotation route now tests that route's own response while keeping worker privacy checks. Earlier ten-case runs did not exercise M06 and are not reported as M06 acceptance. Failed/cancelled runs are not passing proof.

The next run passed the full desktop scenario but mobile correctly hit the shared five-requests-per-day budget. Loopback cleanup now ages only this fixture account's submission timestamps between viewports, retaining immutable quotes/events and the actual application quota. A superseded run was cancelled before the final wording/proof run. The UI presents “awaiting worker confirmation” instead of the internal status key.

Final code review found a transaction-clock expiry edge case after the archived source and initial PR checks had passed. [PostgreSQL 17 documents](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT) that `now()` remains fixed at transaction start. Inspection authorization now defaults to `clock_timestamp()` and rechecks its deadline after commit. Three additional native assertions exercise a short-lived synthetic grant in one transaction: access before expiry, the demonstrably stale transaction-start clock after expiry, and denial by the actual default clock after expiry. The test waits 1.1 seconds; it never rewrites an immutable grant or accepts a browser-supplied clock. Final PR checks must exercise this correction before merge.

Hosted activation still needs a dedicated approved Supabase project, migration/restore review, approved consumer/quotation/inspection/tax policy, current scanner/retention operations, physical deletion/orphan reconciliation, monitoring and pending-appointment follow-up. No production-scale latency, real delivery/provider quota, physical-device or Safari verification was performed. User-authored text/photo pixels can voluntarily contain PII; field projection and EXIF removal are not semantic redaction. Disclosed information cannot be recalled.

Disable both agreement flags to withdraw the capability; retain legitimate accepted terms/history under approved policy instead of deleting them. See [ADR 0007](../adr/0007-quotes-and-appointments.md) and [local setup](../quotes/LOCAL_QUOTES.md). Stop before Milestone 07.

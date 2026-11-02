# Milestone 07 verification snapshot

2026-11-02. These archived local logs describe the implementation before the final PR checks. The merged PR’s release record is the authority for final commit-specific CI, screenshot provenance and Vercel deployment. No passing native result is inferred from local unit/static checks.

| Command actually run locally | Outcome |
| --- | --- |
| `npm ci` | Exit 0; added 149 packages in 15 seconds; pinned manifest/lockfile unchanged |
| `npm run format:check` | Exit 0 |
| `npm run check` | Exit 0: Oxlint; Next type generation and strict TypeScript; 281 Vitest assertions in 31 files; static migration contracts; optimized Next.js production build |
| `npm run test:public` | Exit 0; 8/8 browser cases, desktop/mobile navigation, appearance, keyboard taxonomy, reduced motion, 320px overflow and private offline-cache denial |
| `node scripts/check-boundaries.mjs` | Exit 0; transitive client/server boundary check |
| `npm audit --audit-level=high` | Exit 0; zero reported vulnerabilities |
| `npm run security:check` | Exit 0; 461 repository files and 45 browser assets; pattern scan, no local canary supplied |

The first native database run revealed an older synthetic schedule fixture bypassing the newly required explicit reschedule acceptance, plus malformed UUIDs in the new test. Both fixtures were corrected. [Run 41412245972](https://github.com/thembaxx/duzelo/actions/runs/41412245972), source `e15d920`, passed 232 assertions across nine pgTAP files and the database concurrency/advisor/lint/explain jobs. It passed all 12 previous native browser cases, but the two new M07 cases stopped at TOTP enrollment because their isolated administrator lacked an upstream-required verified email. The loopback fixture now supplies an explicit `example.invalid` verified-email record; the production enrollment rule remains intact. That failed attempt is not a passing M07 native acceptance result.

The managed local container lacks sufficient space for the full native Docker stack. Native Auth/PostgreSQL/Storage/ClamAV and their desktop/mobile tests run in disposable GitHub Actions runners. Final native results are recorded in the PR after they actually complete. The native runner scans five separate server-secret canaries against its actual client build. Its deterministic, isolated ClamAV image intentionally has no live FreshClam update; production scanner freshness/monitoring remains an activation prerequisite.

Captures use synthetic job/provider data and normal browser viewports of 390×844 and 1440×900. The new native scenario also checks 320/768/1024 overflow, dark mode contrast, reduced motion, keyboard sending, offline explicit retry, ordered cursor pages, actual private-file access/expiry, rejection/stale agreement handling, completion correction/confirmation and scoped support review. See the PR for the successful artifact/commit and visually inspected screenshots; no physical-device, Safari, production-scale or hosted-Supabase claim is made.

Keep MESSAGING_ENABLED and WORKFLOW_ENABLED OFF in production. Hosting still requires an approved dedicated Supabase project, migration/restore review, prior capability gates, legal/privacy/retention/support policy, a current scanner, private signing/operator configuration and monitored reminder/deletion operations. No hosted migration or payment/provider integration ran. No payment is accepted, released, reconciled or adjudicated by this change. Dispute intake/triage is M07; full resolution/moderation remains M09. Stop before M08.

## Successful native source snapshot

Source `9b4b5e406cae13823d0c3b4c5bb0ff5f26d30ac2`: [Application checks 41414562976](https://github.com/thembaxx/duzelo/actions/runs/41414562976) passed verification, database and native Auth jobs. `npm run test:auth` built the enabled loopback app, checked all five server-secret canaries against 45 browser assets, and passed **14/14 desktop/mobile native cases in 2.7 minutes**, including all new M07 operator/reminder/deletion/audit scenarios. Separate [database integration 41414562981](https://github.com/thembaxx/duzelo/actions/runs/41414562981) passed reset, 232 pgTAP assertions, concurrency, advisors, lint and explain, plus its browser job. [Visual/native QA 41414562934](https://github.com/thembaxx/duzelo/actions/runs/41414562934) also passed. These are actual completed runs, not inferred from the local snapshot. Final head/merge/deployment proof remains in the PR release record.

The second intermediate native run reached MFA audit but found a bodyless-operator POST bug: Next.js supplies an empty ReadableStream, which the route incorrectly treated as nonempty input. The route now consumes and verifies an actually empty body. Fixture cleanup also cancels unfinished synthetic active appointments so an earlier failed case cannot reserve time during a later viewport’s inspection. This preserves the production schedule/consent guards. All scenarios passed after these corrections.

Downloaded successful native artifact **13127162818**, run **41414562976**, and visually inspected all six original PNGs. Each mobile capture is **390×844**; each desktop capture is **1440×900**. Captures show synthetic saved state and viewport scroll positions, not a public rollout. Only the six new M07 images were admitted; earlier milestone images were preserved. Archived console-log trailing whitespace was normalized without changing outcomes.

| Screen | Mobile | Desktop |
| --- | --- | --- |
| Ordered private conversation | [390×844](../screenshots/chat-thread-mobile.png) | [1440×900](../screenshots/chat-thread-desktop.png) |
| Agreed price and appointment | [390×844](../screenshots/workflow-agreement-mobile.png) | [1440×900](../screenshots/workflow-agreement-desktop.png) |
| MFA support queue | [390×844](../screenshots/audit-workflow-mobile.png) | [1440×900](../screenshots/audit-workflow-desktop.png) |

## Reviewed implementation snapshot

The review corrections in [REVIEW.md](REVIEW.md) were exercised on source `ef9730cea1262150c0401e89e11c54a6508b38b5`. [Application run 41421678990](https://github.com/thembaxx/duzelo/actions/runs/41421678990) passed database checks and all **14 native cases in 3.8 minutes**, including the new UI retry, photo-backed completion, cross-booking denial, removed-message updates, delayed audit selection and pagination regressions. Its five real server-secret canary scans passed against 46 browser assets. Separate database integration and visual checks passed. The verification job correctly failed formatting for one test-helper method chain that required a second formatter pass; that layout-only correction subsequently passed local `npm run format:check` and is included with this evidence. This failed verification attempt is not represented as a green final head.

Local review checks passed: **286 unit assertions across 32 files**, lint, strict TypeScript, static SQL contracts, production build, 8 public browser cases, import boundaries, dependency audit (zero vulnerabilities) and secret scan (482 repository files, 46 browser assets; no local canary). Final head CI and deployment results remain in the PR release record.

The six current PNGs in the table above supersede the earlier `9b4b5e4` images: they were downloaded from successful native artifact **13130841063**, run **41421678990**, source **ef9730c**, and all six were visually inspected at their original 390×844 or 1440×900 size. The thread captures now include a persisted moderation tombstone. Earlier captures remain in Git history; no images from previous milestones were replaced.

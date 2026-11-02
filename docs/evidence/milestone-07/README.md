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

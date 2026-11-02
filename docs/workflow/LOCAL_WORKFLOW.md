# Milestone 07 local conversations and work review

Use an unlinked disposable checkout and the [native M06 setup](../quotes/LOCAL_QUOTES.md). `npm run auth:env` enables messaging/workflow only with loopback Auth/PostgreSQL/Storage and ClamAV. Its ignored mode-0600 file generates separate signing and operator secrets, a three-second evidence ticket lifetime and a one-hour review reminder window for acceptance tests. Hosted defaults remain OFF and require explicit policy and retention approval. No hosted SQL is executed.

Open **Job conversations** from the quotation/appointment navigation, or **Open job conversation** on a sent quote/selected appointment. Use the real message form and earlier-message cursor. Disconnect the browser to exercise explicit unchanged-message retry; a reload loses drafts. Uploaded photos are scanned and private. **View evidence photo** requests a fresh short-lived, session-bound header ticket; expiry requires a new view. Reporting a concern saves a safety report and pauses the thread; removing your own block leaves pending reports/other blocks in force.

The appointment’s work section shows the original quote and current agreed total. Propose an exact scope adjustment in integer cents or a new future appointment window with an expiry. The other party accepts or rejects; only acceptance applies a change. A selected worker can report progress and start at/after the agreed start. Completion needs a scanned photo or a detailed written explanation. The client explicitly confirms, requests correction or raises a service issue. A dispute response and photos are **support-only**, with shared support notes displayed separately.

Owner/support accounts with current MFA use `/admin/workflow`, select a queue reference and record a reason before opening the five-minute evidence audit. Verification-only administrators cannot access it. Staff cannot audit their own work. Triage can request evidence or mark investigation, without determining fault, resolving a case or moving money.

Endpoints under `/api/v1/collaboration/` are no-store and use the same verified native sessions. POST JSON is bounded at 32 KiB and requires same-origin plus `Idempotency-Key` (16–128 characters); no actor, authoritative status or total can be injected. Upload is bounded multipart with exactly `meta` (strict target JSON) and `file` (JPEG/PNG ≤3 MiB).

| Actions | Purpose |
| --- | --- |
| GET `inbox`, `thread?id=…&before=…` or `&after=…` | Actual-party metadata and at most 30 ordered messages |
| POST `thread-open`, `thread-send`, `thread-report`, `thread-unblock` | Published-quote context, server sender, persisted safety controls |
| POST `upload`, `remove-photo`, `media-access` | Scanned evidence; unsent withdrawal; header ticket, never a public Storage path |
| GET `media/[assetId]` with `X-Duzelo-Asset-Ticket` | Cookie plus signature/session/context/retention checks before and after download |
| GET `workflow?id=…` | Current-party work decisions and filtered evidence |
| POST `work-start`, `work-progress`, `work-complete`, `work-confirm-completion`, `work-correction` | Versioned work reports and explicit client response |
| POST `proposal-reschedule`, `proposal-scope`, `proposal-decide` | Explicit two-party changes; original accepted terms stay immutable |
| POST `case-open`, `case-respond` | Participant issue intake and support-only evidence |
| GET `queue`, POST `audit`, GET `audit?id=[grantId]`, POST `triage` | Current owner/support MFA, reason-bound audit and nonfinancial triage |

Operators may POST `/api/internal/workflow/reminders?limit=20` or `/api/internal/workflow/cleanup?limit=20` with `Authorization: Bearer [WORKFLOW_SCHEDULER_SECRET]`, no body. Limit 1–50, strong separate configured secret, all workflow gates required. Keep credentials out of URLs, logs and browser flows. These endpoints are real bounded operations; no scheduler/cron is provisioned automatically. Overdue completion creates a support queue item and in-app reminders, never acceptance. Cleanup physically removes expired/unheld or withdrawn objects; case holds remain. Approved support coverage, scheduled operation, monitoring and legal hold release are hosted release prerequisites.

Run `npm run test:auth` for all native scenarios in 1440×900 and 390×844 viewports; pgTAP also tests forbidden membership/senders, immutable history, explicit rescheduling, price bounds and completion parties. Historical due-start/overdue fixtures are explicitly synthetic restored state; actual commands and real wall-clock ticket expiry are tested without adding application clock hooks. No real SMS, payment, identity or address is used. Read [ADR 0008](../adr/0008-conversations-and-workflow.md) and the release evidence for limits. Stop before M08.

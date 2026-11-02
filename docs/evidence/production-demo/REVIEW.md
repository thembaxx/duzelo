# Production demo review

- New public `/demo` domain is separate from real `/app`, `/admin`, Supabase commands, payment integration and privileged APIs. No database migration, seed, environment variable, credential or sensitive feature flag changed.
- All synthetic profiles, review counts, histories, map pins and actions are labelled as examples. No approval badge, real availability promise, private address, phone number, worker-base coordinate or payment success is fabricated.
- Reset changes only the versioned demo workspace. Schema validation rejects unknown catalogue IDs, invalid dates/statuses and extra persisted fields; state has bounded booking/event counts. No personal-data text entry is provided. Storage failures are visible and fall back to a usable in-memory workspace.
- Demo writes use a pure reducer and make no real mutation requests. Terminal booking states cannot be progressed or rescheduled; ratings are bounded and one per completed sample visit. Concurrent browser tabs use last-saved-workspace semantics, documented for this non-authoritative data.
- Map list/pins share one filtered catalogue; stable memoized results preserve keyboard pin focus. A map instance survives theme changes. It has keyboard controls, coarse invented locations, visible attribution, initial bounds, error/timeout recovery and a complete list alternative. No geolocation, directions or tracking is requested.
- Photos are locally vendored under the documented Unsplash licence, with service-context descriptions and stock captions. Source/rights records are published at `/demo/about` and in the repository. They do not depict the named fictional providers or their work.
- Motion is finite, scoped and preference-aware. CSS keeps content visible without animation; theme changes retain demo state and map identity. Native dialogs trap/restore focus. Scripted conversation updates use a live log; progress/error notices remain present. Mobile inputs use 16px text to avoid browser focus zoom.
- The service worker excludes demo routes and external maps. Demo pages have noindex metadata. The homepage explicitly routes demo searches into populated sample results, while real discovery remains gated.
- Local formatting, lint, strict types, unit, production build, desktop/mobile public flows, automated contrast/accessibility, real geographic map requests, boundary scan, dependency audit and secret-pattern scan completed as recorded in README. Browser screenshots were inspected at the target sizes. Backend/native regressions await their actual CI results in the PR, rather than being inferred.

CI follow-up: the initial application job passed all fourteen public tests and the database job passed 232 pgTAP checks. The separate visual job caught an immediate result-count assertion in the existing homepage search smoke test before the new Suspense-backed demo finished rendering. The assertion now waits for the actual matching provider to become visible. The focused desktop/mobile smoke run passed 2/2 against the same production build. Final CI status is recorded against the reviewed head in the PR; the earlier visual failure is not reported as a passing run.


Review corrections (all ten published inline findings):

- The real-map script observes the rendered map's applied background after idle, matches it to the fetched dark style and rejects any map error before recording the dark result. This checks application, rather than just HTTP success.
- Booking and rescheduling reject a stale date across Johannesburg midnight. The store acknowledges only accepted state changes; booking navigation waits until that ID is present in the rendered store.
- Arrival replies keep their original sample date/time snapshot. Older stored replies with no snapshot say so, instead of displaying a new schedule as historical fact.
- Activity buckets count completion timestamps with half-open boundaries, so simulated completion of a future visit updates the current bucket. The current bucket is labelled Now.
- Saved providers show a loading state until browser data is ready. Missing ResizeObserver produces a list fallback. Duplicate saved IDs are rejected and the reducer cannot exceed the catalogue limit.
- Seeded completed/reviewed jobs include the review event. Load and write notices are tracked separately; a successful read clears the old load warning without hiding a write failure.
- The bounded read size covers the legitimate 200-booking/80-event maximum, and timestamps are length-bounded.

Final local proof after these fixes: 297 Vitest tests, 15 public desktop/mobile browser checks, formatting/lint/types/build, boundaries, static contracts, dependency audit and secret-pattern scan passed. The real-map visual script completed 25 viewport/page checks with 42 successful basemap responses and no browser exceptions. Screenshot files were refreshed from the corrected production build. CI results on the final commit are recorded in the PR.

# Permission boundaries — Milestone 01

Application workspace routes still deny all sessions. Local database tests simulate authenticated role contexts to prove row-level policies; they do not implement real login.

| Database caller                | Read scope                                                                                     | Write scope                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Guest                          | Active categories/coarse areas, unexpired reviewed cards and their published services          | None                                                             |
| Client owner                   | Own profile, own jobs including drafts, participant quotes/bookings/messages                   | None                                                             |
| Matched approved worker        | Own profile/matches, eligible non-draft job previews, own quotes/participant bookings/messages | None                                                             |
| Unrelated or pending worker    | Own profile where active; no unrelated jobs/quotes/bookings/messages                           | None                                                             |
| Suspended worker               | Public sanitized data only; no worker match/job capabilities                                   | None                                                             |
| Admin browser                  | Own profile and ordinary participant rights only                                               | None                                                             |
| Future verified server command | Narrow, authenticated and authorized resource DTO                                              | Controlled privileged transaction, with MFA/audit where required |

Private exact locations and evidence always require server-mediated authorization, even for an owner or admin. Browser roles have no schema usage, DML or private publication-function access. Database service-role credentials bypass RLS and must never be used by a browser; no application privileged adapter is implemented yet. Audit/ledger/booking event mutations remain denied even to the normal service role.

PRD §12 remains the eventual product authorization matrix. The baseline's conservative denials must not be relaxed without matching ownership, suspension, capability and negative tests.

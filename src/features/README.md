# Domain boundaries

Milestone 00 implements `auth` as an always-denying server boundary and `services` as public, confirmed taxonomy. Add the remaining PRD modules only in their ordered milestones:

| Module                               | First milestone              | Required boundary                                            |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------------ |
| workers / admin verification         | 03                           | server-owned approval, private evidence, MFA and audit       |
| workers / matching / geocoding / map | 04–05                        | private precise locations, public coarse DTOs                |
| jobs                                 | 05                           | owner-validated commands, private location                   |
| quotes / bookings                    | 06                           | transactions, idempotency, immutable quote versions          |
| messages                             | 07                           | job membership, signed attachments                           |
| payments                             | 08                           | disabled online provider gate, integer cents, private ledger |
| notifications                        | alongside domain events / 10 | transactional outbox, dedupe and channel consent             |
| admin moderation                     | 09                           | explicit staff capability, MFA and append-only audit         |

No fake repositories, seed workers, executable financial adapters or successful mock commands are provided. Future module service/repository/policy/schema files are introduced with meaningful tests when behavior exists.

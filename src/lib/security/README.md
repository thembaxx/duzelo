# Security boundary

Server commands, ownership checks, CSRF, idempotency, and rate limits belong here when real mutations are added. Milestone 00 has no mutation endpoints. Every future command must verify the session and resource ownership/capability before using privileged database access. See docs/security.md. Never create permissive placeholder commands.

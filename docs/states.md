# State-machine status

No job, quote, booking, payment, worker approval or review state can be mutated in M00. PRD §11 is the controlling lifecycle specification. Future state machines must implement transactional consistency, optimistic versions, idempotency and history; UI selection must never fabricate a state transition. Completion must not automatically release money or waive disputes.

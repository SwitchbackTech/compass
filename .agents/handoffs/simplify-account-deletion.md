---
schema_version: 1
task_id: simplify-account-deletion
from: Implementer(backend)
to: Verifier
owner: Verifier
status: verifying
artifact:
  - path: packages/backend/src/user/services/user.service.ts
  - path: packages/backend/src/user/services/user.service.db.test.ts
evidence:
  - command: bun test:backend
    result: 493 passed, 1 skipped, 0 failed
  - command: focused user service database suite
    result: 33 passed, 0 failed, including legacy queue adoption and idempotency
assumptions:
  - Account deletion ordering, fail-open Sync purge, and retry behavior are public contracts to preserve.
open_risks:
  - Combined-diff verification and independent review are pending.
next_deadline: 2026-08-31T18:00:00Z
retry: 0
approval: none
waiting_on: null
escalation: null
---

Verify one staged account-deletion worker and durable record, including safe draining of records already stored in the retired legacy queue.

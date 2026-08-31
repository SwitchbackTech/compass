---
schema_version: 1
task_id: simplify-account-deletion
from: Manager
to: Manager
owner: Manager
status: done
artifact:
  - path: packages/backend/src/user/services/user.service.ts
  - path: packages/backend/src/user/services/user.service.db.test.ts
evidence:
  - command: bun test:backend
    result: 493 passed, 1 skipped, 0 failed
  - command: focused user service database suite
    result: 35 passed, 0 failed, including legacy adoption, saturation, and fair rotation
  - command: independent re-review
    result: no confirmed findings after starvation and test-boundary fixes
  - command: gh pr view 3039
    result: ready pull request https://github.com/KeepSoftwareSimple/compass-calendar/pull/3039
  - command: gh pr checks 3039
    result: all 14 GitHub checks passed
assumptions:
  - Account deletion ordering, fail-open Sync purge, and retry behavior are public contracts to preserve.
open_risks:
  - Multi-replica duplicate attempts remain possible but operations are idempotent.
next_deadline: 2026-08-31T18:00:00Z
retry: 0
approval: none
waiting_on: null
escalation: null
---

Delivered one staged account-deletion worker and durable record, including safe legacy adoption and fair retry scheduling.

---
schema_version: 1
task_id: "issue-0"
from: Implementer
to: Verifier
owner: Verifier
status: verifying
artifact:
  - path: .agents/handoffs/SCHEMA.md
evidence:
  - command: test -f .agents/handoffs/SCHEMA.md
    result: pass
    log: schema file exists
assumptions:
  - "this file is a documented example, not a live task"
open_risks: []
next_deadline: 2026-08-26T18:00:00Z
retry: 0
approval: none
waiting_on: null
escalation: null
---

Documented example only. A receiver can name owner (`Verifier`), artifact
(`.agents/handoffs/SCHEMA.md`), and next check (`test -f .agents/handoffs/SCHEMA.md`)
without the producer transcript.

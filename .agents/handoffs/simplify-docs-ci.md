---
schema_version: 1
task_id: simplify-docs-ci
from: Manager
to: Manager
owner: Manager
status: done
artifact:
  - path: .github/scripts/detect-code-changes.sh
  - path: .github/workflows/test-unit.yml
  - path: .github/workflows/test-e2e.yml
  - path: packages/scripts/src/testing/detect-code-changes.test.ts
evidence:
  - command: bun test:scripts
    result: 88 passed, 0 failed
  - command: git show --stat e6a2b7fc0
    result: recommendation 1 already resolved on main by deleting the booking v1 work pack
  - command: bun run verify
    result: scripts, type-check, lint, knip, accessibility, and branch-specific checks passed
  - command: independent review
    result: no confirmed findings
  - command: gh pr view 3039
    result: ready pull request https://github.com/KeepSoftwareSimple/compass-calendar/pull/3039
  - command: gh pr checks 3039
    result: all 14 GitHub checks passed
assumptions:
  - Preserve runtime behavior and required-check semantics.
open_risks: []
next_deadline: 2026-08-31T18:00:00Z
retry: 0
approval: none
waiting_on: null
escalation: null
---

Delivered the shared CI detector across both required-check workflows. Recommendation 1 required no new diff because current main already removed the duplicated booking work pack.

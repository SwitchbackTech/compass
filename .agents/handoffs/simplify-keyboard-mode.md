---
schema_version: 1
task_id: simplify-keyboard-mode
from: Implementer(web)
to: Verifier
owner: Verifier
status: verifying
artifact:
  - path: packages/web/src/shortcuts/shift-hint/useShiftHoldEventHints.ts
  - path: packages/web/src/shortcuts/shift-hint/useShiftHoldEventHints.quick-time.test.tsx
evidence:
  - command: focused keyboard and view suites
    result: 170 passed, 0 failed
  - command: bun type-check
    result: passed
assumptions:
  - Preserve keyboard precedence, timing, announcements, and Day/Week behavior.
open_risks:
  - Combined-diff verification and rapid Day/Week remount behavior need independent review.
next_deadline: 2026-08-31T18:00:00Z
retry: 0
approval: none
waiting_on: null
escalation: null
---

Verify the single keyboard owner, typed-time/event-jump precedence, timers, indicators, and Day/Week remount cleanup.

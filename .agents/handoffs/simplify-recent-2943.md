---
schema_version: 1
task_id: "simplify-recent-2943"
from: Implementer
to: Manager
owner: Manager
status: verifying
artifact:
  - path: packages/web/src/shortcuts/tips/shortcut-tips.data.ts
  - path: packages/web/src/shortcuts/swallow-next-keyup.ts
  - path: packages/backend/src/billing/services/billing.service.ts
evidence:
  - command: bun run verify
    result: "Selected packages: web, backend. Checks run: test:web, test:backend, type-check, lint, knip. Playwright skipped (Chromium missing)."
  - command: bun run test:web (focused personalization, telemetry, swallow, hooks, RootShell)
    result: "98 + 43 passed"
  - command: bun run test:backend (billing.service + guard)
    result: "24 passed"
assumptions:
  - "PostHog events keep emitting rank: 1 so existing analytics stay valid."
  - "Existing localStorage profiles with engagements still parse; Zod strips the extra key."
open_risks: []
next_deadline: 2026-08-28T06:00:00Z
retry: 0
approval: none
waiting_on: null
escalation: null
---

Behavior-preserving simplification of #2943 personalization metadata and leftover #2934 startTrial.

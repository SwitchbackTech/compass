---
schema_version: 1
task_id: "WP-shortcut-showcase-simplify"
from: Reviewer
to: Manager
owner: Manager
status: verifying
artifact:
  - path: packages/web/src/components/ShortcutShowcase/ShortcutShowcase.tsx
  - path: packages/web/src/components/ShortcutShowcase/showcase.steps.ts
  - path: packages/web/src/components/ShortcutShowcase/ShortcutShowcase.test.tsx
  - path: docs/frontend/frontend-runtime-flow.md
evidence:
  - command: "bun run test:web packages/web/src/components/ShortcutShowcase/ShortcutShowcase.test.tsx"
    result: "32 tests passed."
  - command: "git diff --check"
    result: "Passed with no whitespace errors."
  - command: "mise exec bun@1.3.14 -- bun run test:web packages/web/src/components/ShortcutShowcase/ShortcutShowcase.test.tsx"
    result: "31 tests passed after redundant full-flow component test removal."
  - command: "mise exec bun@1.3.14 -- bun run verify"
    result: "PASS: web 2421 tests, type-check, lint, and knip passed."
  - command: "mise exec bun@1.3.14 -- bunx playwright test --workers=1"
    result: "PASS: 36 end-to-end tests passed."
  - command: "git diff origin/main --stat"
    result: "Simplifier inspected the complete diff and made no further changes."
  - command: "mise exec bun@1.3.14 -- bun run test:web packages/web/src/components/ShortcutShowcase/ShortcutShowcase.test.tsx"
    result: "PASS: 32 tests including graduation U regression."
  - command: "git diff origin/main -- packages/web/src/components/ShortcutShowcase"
    result: "Independent re-review found no confirmed findings after the isolated fix."
assumptions:
  - "The latest merged showcase behavior is the contract to preserve."
open_risks:
  - "Two-worker datepicker timing is flaky; serial accessibility and full E2E suites pass."
next_deadline: 2026-08-26T23:00:00Z
retry: 2
approval: none
waiting_on: null
escalation: null
---

Simplify the Shortcut Showcase implementation, tests, metadata, and volatile
runtime documentation without changing observable behavior.

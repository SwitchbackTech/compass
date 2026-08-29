---
schema_version: 1
task_id: "WP-payment-aware-account-deletion"
from: Verifier
to: Manager
owner: Manager
status: verifying
artifact:
  - path: https://github.com/KeepSoftwareSimple/compass-calendar/pull/2958
  - path: packages/backend/src/user/services/user.service.ts
  - path: packages/backend/src/billing/services/stripe.service.ts
  - path: packages/web/src/components/DeleteAccountConfirmation/DeleteAccountConfirmationProvider.tsx
evidence:
  - command: bun run verify
    result: passed (web, backend, type-check, lint, knip, a11y, and e2e)
  - command: bun test:backend -- packages/backend/src/user/services/user.service.db.test.ts packages/backend/src/billing/services/stripe.service.db.test.ts
    result: 45 passing
  - command: bun test:web -- packages/web/src/components/DeleteAccountConfirmation/DeleteAccountConfirmationProvider.test.tsx packages/web/src/components/DeleteAccountConfirmation/DeleteAccountConfirmationDialog.test.tsx
    result: 11 passing
  - command: bun type-check
    result: passed
assumptions:
  - Account deletion must cancel Stripe billing before local user data is removed.
open_risks:
  - GitHub CI must pass before squash merge.
next_deadline: 2026-08-29T09:00:00Z
retry: 0
approval: none
waiting_on: null
escalation: null
---

Independent review found no confirmed findings. The user-authorized removal of
the failing Shift+F10 assertion is included; full verification passed. Pull
request: https://github.com/KeepSoftwareSimple/compass-calendar/pull/2958.

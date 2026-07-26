---
name: verify-change
description: Selects and runs the smallest reliable Compass validation set from the current diff, then widens checks for shared contracts, persistence, browser behavior, or release risk. Use when asked to verify changes, run the right tests, prepare a branch for review, or diagnose which checks apply.
---

# Verify a Compass change

Choose checks from evidence in the diff. Do not default to `bun run test`, and
do not treat a green helper command as sufficient without confirming what it
selected.

## 1. Establish scope

1. Read `AGENTS.md`.
2. Inspect staged, unstaged, and base-to-head changes.
3. Classify touched behavior by package and boundary:
   - `packages/core`: schemas, shared contracts, dates/events
   - `packages/web`: UI, client state, storage, SSE consumers
   - `packages/backend`: routes, auth, persistence, SSE emitters
   - `packages/sync`: provider state, OAuth, watches, sync work
   - `packages/scripts`: CLI, migrations, test/build helpers
   - `e2e`, configuration, CI, or docs
4. Read the nearest tests and the relevant section of
   `docs/development/testing-playbook.md`.

## 2. Select checks

Use the narrowest package command that can expose the regression:

| Change | Default check |
| --- | --- |
| Core | `bun run test:core` |
| Web | `bun run test:web` |
| Backend, Mongo-backed | `bun run test:backend` |
| Backend, Mongo-free | `bun run test:backend:fast` |
| Sync, Mongo-backed | `bun run test:sync` |
| Sync, Mongo-free | `bun run test:sync:fast` |
| Scripts/CLI/migrations | `bun run test:scripts` or the focused DB command |
| Shared contract/type | affected package tests + `bun run type-check` |
| User-visible accessibility | web tests + `bun run test:a11y` |

For a single failing test, run the repo's focused launcher when one exists,
then run the package acceptance command before declaring the package green.

## 3. Use the diff helper deliberately

`bun run verify` selects checks from the git diff. Run it when useful, but read
its reported selection and add missing checks for:

- shared schemas consumed across packages
- migrations and persistence
- SSE emit/listen pairs
- Google sync provider/watch behavior
- browser-only interaction or accessibility states

Do not hide failures by weakening tests, widening timeouts, disabling strict
MSW behavior, or changing test order.

## 4. Validate observable behavior

Tests do not replace a concrete scenario for user-visible or integration
changes. Use available browser, API, or CLI tooling to exercise the changed
path and edge cases derived from the diff. Check console/network output for
browser work.

Backend/auth/Mongo/Google/SSE scenarios require valid local setup; invoke
`/local-dev-bootstrap` rather than attempting login flows against an incomplete
environment.

## 5. Final gate

For non-docs changes, run:

```bash
bun run lint
```

Add `bun run type-check` for shared contracts, package boundaries, or changes
where inferred types are part of correctness. Widen to E2E only when the change
crosses browser/backend/persistence boundaries or modifies critical flows.

## Report

State:

1. scope inferred from the diff
2. commands and scenarios actually run
3. pass/fail counts and relevant warnings
4. checks intentionally not run and the concrete reason
5. whether failures are new, pre-existing, or still unclassified

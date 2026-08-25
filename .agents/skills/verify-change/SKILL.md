---
name: verify-change
description: Verifier skill. Selects and runs the smallest reliable Compass validation set from the current diff and returns PASS, RETRY, or ESCALATE. Use when asked to verify changes, run the right tests, prepare a branch for review, or diagnose which checks apply.
---

# Verify a Compass change (Verifier)

You are now the **Verifier**. Do not edit the artifact, tests, or CI
config to go green. Do not repair failures silently.

## Role

- **Owns:** acceptance against the artifact; binary
  `PASS | RETRY | ESCALATE`
- **Input:** request + artifact + named tests — not the producer’s
  self-assessment
- **Output:** verdict + enumerated failures + evidence pointers
- **Never:** repair the artifact, weaken tests, widen timeouts, disable
  strict MSW, or change test order to hide a failure

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

## 3. Diff helper

Run `bun run verify` and **quote its output** (selection, skip list,
summary). It is the required-check subset from merge-base vs `origin/main`
plus the working tree: detected `test:<pkg>` scripts, then `type-check`,
`lint`, and `knip`, plus `test:a11y`/`test:e2e` when web or `e2e/` changed.
A green run is not CI-complete if Playwright was skipped. Add extra checks
when the subset cannot cover:

- shared schemas consumed across packages
- migrations and persistence
- SSE emit/listen pairs
- Google sync provider/watch behavior
- browser-only interaction or accessibility states

## 4. Observable behavior

Tests do not replace a concrete scenario for user-visible or integration
changes. Backend/auth/Mongo/Google/SSE scenarios require
`/local-dev-bootstrap`. Do not test login without backend.

## 5. Final gate

For non-docs changes, `bun run lint` is required. Add `bun run type-check`
when inferred types are part of correctness.

## Verdict

Retryable: flake, missing browser with an install command, or a failed
check the implementer can fix without a product decision. Not retryable:
missing credentials that need a human, contradictory requirements,
exhausted 2-retry budget.

```text
VERDICT: PASS | RETRY | ESCALATE
FAILURES:
- id: …
  retryable: true|false
  evidence: …
CHECKS_RUN: …
CHECKS_SKIPPED: … (reason)
```

`PASS` requires executed commands. “Looks good” is not a verdict.

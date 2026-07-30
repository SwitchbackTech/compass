# Performance Baselines

Illustrative test-suite timings from the native-parallel test runner
migration. The Google-import benchmark and `event.repository.ts` query-plan
gate this doc originally recorded were retired along with the legacy
in-backend sync engine they measured (see [Google Sync And SSE Flow](../features/google-sync-and-sse-flow.md)
for the current architecture) — Sync (`packages/sync`) owns import
performance now, with its own test suite.

## Native parallel test suite timings (Bun 1.3.14)

Recorded on 2026-07-22 after removing the Jest compat shim and switching to
`bun test --parallel` with package preloads (`test-mongo-env.ts` for
mongo-backed packages). **Web is an exception:** `test:web` runs sequentially
in one process (MSW/jsdom + `--isolate` constraint — see
`docs/development/testing-playbook.md#web-native-parallel-future--blocked`).
Local macOS, mongodb-memory-server.

| Script | Tests | Time |
| --- | --- | --- |
| `bun run test:core` | 496 / 496 | ~0.5s |
| `bun run test:web` | 1319 / 1319 | ~14–17s (sequential, one process) |
| `bun run test:backend:fast` | 353 / 353 | ~3s |
| `bun run test:sync` | 505 / 505 | ~31s |
| `bun run test:scripts` | 40 / 40 | ~2s |

## Regression rule

Investigate any p95 query or render regression over 20% from the numbers
recorded above. Re-run the affected suite, compare against this file, and
update the recorded numbers alongside the change once investigated.

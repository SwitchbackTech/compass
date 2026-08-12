# Performance Baselines

Illustrative test-suite timings from the native-parallel test runner
migration. The Google-import benchmark and `event.repository.ts` query-plan
gate this doc originally recorded were retired along with the legacy
in-backend sync engine they measured (see [Google Sync And SSE Flow](../features/google-sync-and-sse-flow.md)
for the current architecture) — Sync (`packages/sync`) owns import
performance now, with its own test suite.

## Native parallel test suite timings (Bun 1.3.14)

Recorded on 2026-08-12 on the cloud agent VM after launch-hardening work
(stale create retry, provider-write ladder extract, USER collection cleanup,
SSE `waitForNoEvent`). Use `bun test:sync:fast` / `bun test:backend:fast` for
Mongo-free iteration; full suites remain the durability gate.

| Script | Tests | Time |
| --- | --- | --- |
| `bun run test:core` | (see package) | ~0.5s |
| `bun run test:web` | (sequential; see testing-playbook) | ~14–17s |
| `bun run test:backend:fast` | 248 / 248 | ~1.6s |
| `bun run test:backend` | 303 / 304 (1 skip) | ~3.4s |
| `bun run test:sync:fast` | 321 / 321 | ~0.6s |
| `bun run test:sync` | 893 / 893 | ~13–14s |
| `bun run test:scripts` | (see package) | ~2s |

## Regression rule

Investigate any p95 query or render regression over 20% from the numbers
recorded above. Re-run the affected suite, compare against this file, and
update the recorded numbers alongside the change once investigated.

# Performance Baselines

Recorded numbers and gates from packet 09 steps 5 (import benchmark, query
explains) and 6 (memory boundedness). Re-run both suites and update this
file whenever the Google import/sync path or `event.repository.ts`'s read
paths change materially.

## Import benchmark

`packages/backend/src/__tests__/bench/google-import.bench.test.ts` runs
`googleCalendarSyncService.initializeGoogleCalendarSync` end-to-end against
a deterministic, production-shaped event mix (60% single timed, 15%
all-day, 20% recurring across 4 base series + instances, 5% cancelled --
see `gcal.event.distribution.ts` in the same test tree) at three
calendar/event scales. Skipped by default; CI and `bun run test:backend`
never pay for it.

```bash
# normal run -- confirms the bench suite shows as skipped
bun run test:backend

# the real run -- prints one `[bench]` summary line per scenario.
RUN_BENCH=1 bun packages/scripts/src/testing/run-tests.ts backend --filter bench
```

### Last recorded numbers

| Scenario | Calendars | Events/cal | Imported | Duration | Heap delta |
| --- | --- | --- | --- | --- | --- |
| 1x2000 | 1 | 2000 | 1900 | ~14.8s | ~2.0 MB |
| 5x800 | 5 | 800 | 3800 | ~13.3s | ~0.6 MB |
| 25x300 | 25 | 300 | 7125 | ~17.9s | ~1.2 MB |

Recorded locally against mongodb-memory-server (no network), with
`NODE_OPTIONS="--expose-gc"` for cleaner heap deltas (forces a GC pass
before/after each sample -- omit it and the sampler still runs, just
against noisier raw `process.memoryUsage().heapUsed` readings). All three
stayed far under the 400 MB memory budget and well under the ~60s
per-scenario tuning ceiling the test comments call out. Each scenario also
asserts `initializeGoogleCalendarSync`'s returned `eventsCount`, and an
independent `mongoService.event.countDocuments`, equal the distribution
generator's own computed expected count -- a regression that silently
drops or duplicates events during import fails this before anything else.

### Memory-bound assertion (step 6)

`GoogleEventSync.prototype.apply` is spied to sample heap once per
calendar (every scenario's per-calendar event count stays under the 2500
`perPage` used by `importFull`, so each calendar imports in a single
page/single `apply()` call). The peak-minus-baseline delta must stay under
400 MB -- generous on purpose, mirroring the memory test in
`packages/scripts/src/migrations/2026.07.10T21.30.00.event-record-backfill.test.ts`.
The point isn't GC precision, it's that the 25-calendar scenario (most
total imported events, 7125) shows no materially larger delta than the
1-calendar scenario -- memory tracks batch/page size, not total dataset
size.

## Query explains

`packages/backend/src/event/event.repository.explain.test.ts` runs
`.explain("executionStats")` against a ~100-event realistic dataset for
every hot read path and asserts the winning plan is an `IXSCAN`, never a
`COLLSCAN`. Not env-gated -- explain is cheap and this is exactly the kind
of regression a release gate should catch before it becomes a p95
regression in production. mongodb-memory-server starts without migration
history, so the test recreates the same index set the migrations create
against staging/production.

| Query | Winning index |
| --- | --- |
| `list()` timed-range branch | `calendarId_1_schedule.kind_1_schedule.start_1` |
| `list()` all-day-range branch | `calendarId_1_schedule.kind_1_schedule.start_1` * |
| Calendar `{userId, source.provider, source.calendarId}` lookup | `calendar_userId_sourceCalendarId_unique` |

\* Finding, not a regression: the all-day branch ranges on both
`schedule.start` and `schedule.end`, and the two schedule indexes share an
identical `{calendarId, "schedule.kind"}` prefix, so they're equally valid
candidates regardless of `schedule.kind`'s value. The planner consistently
picks the start-keyed index here too (verified across repeated local
runs), so `..._schedule.end_1` isn't proven to pull its weight for the
query it looks purpose-built for -- worth a look next time these indexes
are tuned. No index changes in this phase.

## Regression rule

Per the v1 release-hardening packet's
[step 5](https://github.com/SwitchbackTech/compass-calendar/blob/90696e1dd9b279f7f1c56be0cef93b8b9c5787fe/team/archive/google-subcalendar-project/09-v1-release-hardening.md)
(archived after v1 shipped — see `compass-calendar-internal/projects/google-subcalendars/09-v1-release-hardening.md`): investigate any
p95 query or render regression over 20% from the numbers recorded above.
Re-run both suites after touching the import/sync path or
`event.repository.ts`'s read paths, compare against this file, and update
the recorded numbers alongside the change once investigated.

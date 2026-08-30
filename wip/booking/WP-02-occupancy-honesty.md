# WP-02 — Occupancy honesty (occurrence busy)

**task_id:** WP-02
**github:** [#2971](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2971)
**status:** queued
**owner:** Implementer (sync)
**depends on:** none (may run parallel with WP-01)
**next owner after done:** WP-05

## Why

Booking cannot ship while every occurrence is marked busy. Free /
transparent Google events would block every overlapping slot.
Projection already has a `busy` field and `listBusyOverlapping`
already filters `busy: true`; the writer is wrong.

Key files:

- [`packages/sync/src/domain/occurrence-projection.ts`](../../packages/sync/src/domain/occurrence-projection.ts)
  (`toOccurrence` hardcodes `busy: true`)
- [`packages/sync/src/domain/provider-page-applier.ts`](../../packages/sync/src/domain/provider-page-applier.ts)
  (`providerMetadata.transparency`)
- [`packages/sync/src/providers/google/google-event.normalizer.ts`](../../packages/sync/src/providers/google/google-event.normalizer.ts)
- [`packages/sync/src/storage/repositories/event-occurrence.repository.ts`](../../packages/sync/src/storage/repositories/event-occurrence.repository.ts)
- [`packages/sync/src/domain/busy-query.service.ts`](../../packages/sync/src/domain/busy-query.service.ts)
- [`packages/sync/src/safety/safety-canary.ts`](../../packages/sync/src/safety/safety-canary.ts)

## Finish line

1. Occurrence `busy` is `false` iff the source event is free:
   `providerMetadata?.transparency === "transparent"`. Missing metadata
   means busy (Google's default when transparency is absent).
2. Compass-created events with no provider metadata remain busy
   (they occupy the grid and booking slots).
3. Cancelled occurrences stay `cancelled: true` and are still
   excluded from `listBusyOverlapping`.
4. Reprojection / page apply of an existing transparent event updates
   its occurrences to `busy: false`. Add a focused db test that imports
   a transparent timed event and asserts `listBusyOverlapping` returns
   no interval for that window, while an opaque sibling does.
5. Busy query responses still contain no titles, attendees, or
   conference data. Existing availability route tests stay green.
6. `bun test:sync` green, including safety-canary. `bun run type-check`,
   `bun lint`, `bun knip` green.

## Steps

1. Read `toOccurrence`, `providerMetadataFor`, and
   `listBusyOverlapping`. Confirm where `EventRecord` is in scope for
   projection so `busy` can be derived without adding event content to
   the occurrence.
2. Thread a boolean into `toOccurrence` (or read metadata there). Do
   not add transparency onto `SyncEventContentSchema`.
3. Tests: unit on projection; db test on busy query with mixed
   transparent/opaque events; a regression that opaque + cancelled still
   behaves as today.
4. If existing projected occurrences would stay wrong until the next
   repair: document in Evidence whether a generation rebuild is needed
   and, if a cheap reproject of the live horizon is already how edits
   work, use that. Do not invent a new repair job unless existing
   import/repair already rebuilds occurrences.
5. Run the finish-line checks. Paste safety-canary result in Evidence.

## Acceptance tests

- **Normal:** opaque event occupies `[start, end)`; transparent event
  in the same calendar does not.
- **Incomplete input:** event with null `providerMetadata` is busy.
- **Tool failure:** n/a.
- **Policy:** busy wire JSON fixtures still have no `title` / attendee
  keys; safety-canary green.

## Evidence

Fill when implementing. Must include "safety-canary tests pass".

## Out of scope

- RSVP-strict occupancy (v1.1)
- Booking slot policy
- Writing transparency back to Google

## Risks

- Forcing a full calendar repair in production just to flip `busy`
  would be expensive. Prefer the existing occurrence rebuild path that
  already runs on pull/reproject. If live data stays wrong until the
  next incremental pull, say so in Evidence and whether that is
  acceptable for v1 (likely yes: next sync cycle converges).

## Handoff

```yaml
task_id: WP-02
from:
to: Implementer (sync)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-02 from wip/booking/WP-02-occupancy-honesty.md
in the Compass repo. Read wip/booking/README.md, TRACKING.md, and
docs/features/booking.md first. Mark WP-02 running, commit the ledger,
implement only this WP.

Finish line: occurrence busy follows providerMetadata.transparency
(transparent => not busy; absent => busy). listBusyOverlapping matches.
No titles on busy wire. bun test:sync (safety-canary green),
type-check, lint, knip. Fill Evidence, push, PR to main.
```

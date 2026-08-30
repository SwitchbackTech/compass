# WP-04 — Slot engine

**task_id:** WP-04
**github:** [#2973](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2973)
**status:** queued
**owner:** Implementer (core or backend; prefer a pure module imported by
backend)
**depends on:** WP-01
**next owner after done:** WP-06

## Why

Slot computation is pure: weekly hours + window + buffer + max/day +
duration + busy intervals → candidate starts. It must be unit-tested
without Mongo or Google. Keep it out of `packages/sync`.

Put the function next to the contracts if it has no backend
dependency (`packages/core/src/booking/compute-booking-slots.ts`), or
in `packages/backend/src/booking/` if you must use backend date utils.
Prefer core so native clients can reuse the same rules later.

## Finish line

1. `computeBookingSlots(input) -> DateTime[]` (UTC instants that are
   valid **starts**). Input: page rules (from WP-01 types), busy
   intervals (half-open), already-confirmed reservation starts for
   max-per-day, `now`, guest-requested window.
2. Rules, all tested:
   - 15-minute grid in the **host** timezone.
   - Slot `[start, start+duration)` must lie entirely inside a weekly
     availability interval after converting through the host timezone.
   - Buffer: when `bufferMinutes` is set, a slot cannot start within
     `bufferMinutes` after a busy/reservation end, nor end within
     `bufferMinutes` before a busy/reservation start. Treat busy and
     confirmed reservations the same for adjacency.
   - Min notice: `start >= now + minNoticeHours`.
   - Horizon: `start < now + maxHorizonDays` (and not beyond the
     requested window).
   - Max per day: count confirmed reservations whose local (host TZ)
     date equals the slot's local date; skip the day when at cap.
   - Empty weekday availability → no slots that day.
3. Busy intervals are already merged by Sync; still tolerate
   overlapping input (merge or overlap-test, document which).
4. No I/O. No logging of guest emails or event titles (there are none
   in this function).
5. `bun test:core` (or backend if placed there), type-check, lint, knip
   green.

## Steps

1. Read WP-01 types and
   [`packages/sync/src/domain/busy-query.service.ts`](../../packages/sync/src/domain/busy-query.service.ts)
   `mergeBusyIntervals` so half-open semantics match.
2. Implement with dayjs/timezone already used in core
   (`@core/util/date/dayjs`). Do not add a new date library.
3. Table-driven tests: DST spring-forward (skipped invalid local
   times), fall-back (no duplicate slot instants), buffer both sides,
   max 4/day, 4-hour min notice, 60-day cap, duration 15 vs 60.
4. Run the finish-line checks.

## Acceptance tests

- **Normal:** Mon/Wed 09:00-12:00 host `America/Denver`, 30 min
  duration, no busy → 15-minute starts that fit 30 minutes before noon.
- **Incomplete input:** zero weekly intervals → no slots.
- **Tool failure:** n/a.
- **Policy:** a busy block 10:00-11:00 with 30 min buffer removes
  09:30-11:30 as valid 30-min starts ( inclusive of buffer). Pin the
  exact expected starts in a test so WP-06 cannot drift.

## Evidence

Fill when implementing.

## Out of scope

- HTTP, Mongo, Sync calls
- Guest timezone conversion for **display** (WP-08). The engine emits
  UTC instants; the API/UI converts for the guest.

## Risks

- DST tests are easy to get wrong. Use real timezone names and pin ISO
  instants, not local clock strings alone.

## Handoff

```yaml
task_id: WP-04
from:
to: Implementer (core)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-04 from wip/booking/WP-04-slot-engine.md in the
Compass repo. Read wip/booking/README.md, TRACKING.md, docs/features/booking.md,
and WP-01 contracts first. Mark WP-04 running, commit the ledger,
implement only this WP.

Finish line: pure computeBookingSlots covering 15-min grid, weekly
hours, buffer both sides, min notice, 60-day horizon, max per day, DST.
No I/O. Tests pin expected UTC starts. bun test:core (or owning
package), type-check, lint, knip. Fill Evidence, push, PR to main.
```

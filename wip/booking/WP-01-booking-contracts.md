# WP-01 — Booking Zod contracts

**task_id:** WP-01
**github:** [#2970](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2970)
**status:** queued
**owner:** Implementer (core)
**depends on:** none
**next owner after done:** WP-03, WP-04, WP-05 may start (WP-02 is
independent)

## Why

Every later WP needs the same vocabulary: a booking page, weekly
availability, a reservation, slug rules, and the public/admin HTTP
shapes. Contracts live in `packages/core` (shared Zod, see AGENTS.md).
This WP is contracts + tests with **zero runtime behavior**.

Product spec: [`docs/features/booking.md`](../../docs/features/booking.md).

Key files (create):

- `packages/core/src/types/booking.contracts.ts`
- `packages/core/src/types/booking.contracts.test.ts`

## Finish line

1. `BookingSlugSchema`: lowercase `[a-z0-9]{3,32}`; rejects reserved
   slugs listed in the spec (`week`, `day`, `life`, `auth`, `api`,
   `cleanup`, `book`, `p`, `settings`, `admin`, `login`, `logout`,
   `signup`, `invite`, `calendar`).
2. `BookingDurationMinutesSchema`: enum `15 | 30 | 45 | 60`.
3. `WeeklyAvailabilityIntervalSchema`: `{ weekday: 1-7` (ISO, Monday=1),
   `start: "HH:mm"`, `end: "HH:mm" }` with `end` after `start`. A page
   may have zero or more intervals per weekday; overlapping intervals on
   the same weekday are rejected.
4. `BookingPageSchema` (canonical stored/admin shape): slug, host user
   id, enabled, durationMinutes, destinationCalendarId, blockingCalendarIds
   (min 1), timeZone, weeklyAvailability, minNoticeHours (default 4),
   maxHorizonDays (default 60, max 60), bufferMinutes (`null` = off,
   else positive int; default null; UI default when enabling is 30),
   maxBookingsPerDay (`null` = off, else positive int; UI default when
   enabling is 4), guestsCanInviteOthers (default true), createdAt,
   updatedAt.
5. `PublicBookingPageSchema`: host display name, duration, timeZone,
   enabled. No calendar ids, no email, no slug-allocation internals.
6. `ReservationSchema`: id, pageId, slot start/end (DateTime), guest
   name/email, notes nullable, guestTimeZone, status
   `confirmed | cancelled`, calendarEventId nullable, cancelTokenHash,
   createdAt, updatedAt.
7. HTTP input/output schemas matching the sketch in the spec:
   public get page, list slots, create reservation, cancel; admin get/put
   page. Put uses the same replace-not-patch convention as event writes.
8. `allocateBookingSlug(name, emailLocalPart, userIdSuffix, taken)` is
   a pure exported function with tests for the five-step algorithm in
   the spec. Not wired to persistence here.
9. `bun test:core`, `bun run type-check`, `bun lint`, `bun knip` green.

## Steps

1. Read the spec and
   [`packages/core/src/types/event-command.contracts.ts`](../../packages/core/src/types/event-command.contracts.ts)
   for style (strictObject, branded DateTime, no barrels).
2. Add `booking.contracts.ts` next to the other core type files. Reuse
   `CalendarIdSchema`, `DateTimeSchema`, `TimeZoneSchema` from
   `domain-primitives.ts`.
3. Colocated tests: valid page, reserved slug rejection, overlapping
   weekday intervals, horizon > 60 rejected, public schema strips
   calendar ids, slug allocator collisions and reserved names.
4. Do not import booking types from web or backend yet.
5. Run the finish-line checks.

## Acceptance tests

- **Normal:** a full admin page JSON parses; public projection of the
  same page has no calendar ids.
- **Incomplete input:** empty slug, duration `20`, weekday `0`,
  `maxHorizonDays: 61` rejected.
- **Tool failure:** n/a (contracts only).
- **Policy:** reserved slug `week` rejected; `Tyler Dane` allocates
  `tylerdane` when free.

## Evidence

Fill when implementing.

## Out of scope

- Mongo collections, routes, UI
- Slot computation (WP-04)
- Sync occupancy (WP-02)

## Risks

- Do not put booking policy into `packages/core/src/types/sync/*`.
  Busy contracts stay facts-only.

## Handoff

```yaml
task_id: WP-01
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
You are implementing WP-01 from wip/booking/WP-01-booking-contracts.md
in the Compass repo. Read wip/booking/README.md, TRACKING.md, and
docs/features/booking.md first. Mark WP-01 running (owner + started_at)
in TRACKING.md, commit that ledger update, then implement only WP-01.

Finish line: Zod booking page, weekly availability, reservation, public
vs admin HTTP shapes, slug allocator, reserved-slug rejection. Zero
runtime behavior. bun test:core, type-check, lint, knip green. Fill
Evidence, update TRACKING.md, commit conventionally, push, open a PR
to main.
```

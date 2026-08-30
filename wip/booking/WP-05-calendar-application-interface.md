# WP-05 — Calendar application interface for booking

**task_id:** WP-05
**github:** [#2974](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2974)
**status:** queued
**owner:** Implementer (backend + sync)
**depends on:** WP-01, WP-02
**next owner after done:** WP-06

## Why

Booking must ask Calendar for free/busy and create/delete events
without writing Sync collections itself. Meet create and
`guestsCanInviteOthers` are not available on today's writer
([`toGoogleBody`](../../packages/sync/src/providers/google/google-event-writer.adapter.ts)
explicitly skips conference). Add them as **optional create-only
flags** so the calendar event form stays unchanged.

Key files:

- Backend sync client:
  [`packages/backend/src/common/services/sync-service/sync-service.client.ts`](../../packages/backend/src/common/services/sync-service/sync-service.client.ts)
- Event command translation:
  [`packages/backend/src/common/services/sync-service/event-command.translation.ts`](../../packages/backend/src/common/services/sync-service/event-command.translation.ts)
- Sync command contracts:
  [`packages/core/src/types/sync/command.contracts.ts`](../../packages/core/src/types/sync/command.contracts.ts)
- Google writer:
  [`packages/sync/src/providers/google/google-event-writer.adapter.ts`](../../packages/sync/src/providers/google/google-event-writer.adapter.ts)
- Busy route already exists:
  [`packages/sync/src/server/connection.routes.ts`](../../packages/sync/src/server/connection.routes.ts)
  `POST /internal/availability/busy`

## Finish line

1. A backend `CalendarBookingPort` (name as you like) with:
   - `getAvailability({ calendarIds, start, end, maxAgeMs, purpose:
     "booking_confirmation" })` → existing Sync busy response.
   - `createBookingEvent({ calendarId, title, description, start, end,
     timeZone, guest, guestsCanInviteOthers })` → create command with
     `attendees: [{email, displayName}]`, `invitation: "all"`, Meet
     create-request, `guestsCanInviteOthers`.
   - `deleteBookingEvent({ eventId })` → existing delete with
     invitation so Google emails cancellation.
2. Create-command optional fields `createConference: boolean` default
   `false` and `guestsCanInviteOthers: boolean` default omitted/false so
   **legacy creates stay byte-identical**. Only the booking port sets
   them true/as specified.
3. Google insert: `conferenceDataVersion: 1` and
   `conferenceData.createRequest` with `hangoutsMeet` when
   `createConference` is true. `guestsCanInviteOthers` set when the
   flag is present. Patch/update paths must not start sending conference
   writes for ordinary event edits.
4. `getAvailability` for booking uses a **short** maxAge (minutes, not
   the display-only 24h in `calendar.controller.ts`). Pin the value in
   code + test (recommend 5 minutes). If `bookable` is false, the port
   returns that fact; it does not throw.
5. `bun test:sync` (safety-canary green), `bun test:backend` (or
   documented baseline), `bun test:core`, type-check, lint, knip.

## Steps

1. Read create command schema and `toGoogleBody`. Additive optional
   fields only.
2. Writer tests: a booking create body includes conference createRequest
   + guestsCanInviteOthers; a legacy create fixture remains
   byte-identical (no conferenceData key).
3. Backend port tests with the existing sync-service client fake: busy
   purpose is `booking_confirmation`; create threads attendees +
   invitation `all`.
4. Do not expose Meet or guestsCanInviteOthers on the web event form.
5. Run the finish-line checks.

## Acceptance tests

- **Normal:** port create is a Sync create with guest attendee,
  invitation all, createConference true.
- **Incomplete input:** empty guest email rejected before provider call.
- **Tool failure:** Sync unavailable maps through the existing proxy
  error helper, not a 500 with a raw cause string containing event
  content.
- **Policy:** ordinary `POST /api/event` from the calendar UI still
  does not send `conferenceData`.

## Evidence

Fill when implementing. Must include "safety-canary tests pass".

## Out of scope

- Public HTTP (WP-06)
- Slot engine
- Event form Meet picker

## Risks

- Google conference createRequest needs a unique `requestId` per
  insert. Use the Compass event id (or a hash of it), not a random
  value that would break replay.

## Handoff

```yaml
task_id: WP-05
from:
to: Implementer (backend + sync)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-05 from
wip/booking/WP-05-calendar-application-interface.md in the Compass
repo. Read wip/booking/README.md, TRACKING.md, docs/features/booking.md
first. Mark WP-05 running, commit the ledger, implement only this WP.

Finish line: CalendarBookingPort over existing Sync busy + create/delete;
optional createConference + guestsCanInviteOthers defaulting so legacy
creates are byte-identical; Google insert Meet createRequest; booking
maxAge short; calendar UI create unchanged. bun test:sync (safety-canary
green), backend, core, type-check, lint, knip. Fill Evidence, push, PR
to main.
```

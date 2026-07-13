# 05 — Route event CRUD through the owning calendar

## Goal

Make create, read, update, delete, duplicate, and recurrence operations work on
any imported calendar without ever defaulting an existing event to the Google
primary calendar.

Depends on: `04-initial-multi-calendar-import.md`.

## API decisions

- `calendarId` in an event payload is the Compass calendar id.
- Create always requires a Compass calendar id. Draft assembly may choose the
  primary writable Google calendar or local calendar as a UI default, but the
  server never guesses when the field is missing.
- Existing event calendar ids are immutable in v1. Update/delete derive the
  calendar from the stored event.
- Direct reads/edits do not require the calendar to be visible, but require an
  active calendar belonging to the authenticated user.

## Primary code anchors

- `packages/backend/src/calendar/services/calendar.service.ts`
- `packages/backend/src/event/controllers/event.controller.ts`
- `packages/backend/src/event/services/event.service.ts`
- `packages/backend/src/common/services/gcal/gcal.service.ts`
- `packages/backend/src/sync/services/event-propagation/compass-to-google/`
- `packages/backend/src/sync/services/event-propagation/google-to-compass/`
- `packages/core/src/types/event.types.ts`

## Implementation steps

1. Extend the existing calendar service with one ownership/capability lookup
   that resolves the Compass calendar, verifies user ownership, exposes the
   provider id, and enforces write capability. Do not add a parallel
   authorization service.
2. Update event controller validation and API schemas for `calendarId`. Strip
   client-supplied provider metadata and user ids.
3. Change every GCalService event method—get, list, instances, insert, update,
   delete—to require an explicit Google calendar id. Remove `GCAL_PRIMARY`
   defaults from event write paths (today `createEvent`, `updateEvent`, and
   `deleteEvent` take no calendar id at all and hardcode `"primary"`).
   Provider updates use `events.patch` limited to Compass-owned fields (A28);
   `events.update` replaces the whole resource and wipes attendees, location,
   and reminders on events Compass did not author.
4. Pass the resolved provider calendar through Compass-to-Google planning and
   effects. Provider success updates the event's provider reference in the same
   owning calendar.
   Known `03` gap this packet closes: scope-`this` edits/deletes on a synced
   series occurrence do not propagate to Google (the `03` pipeline has no way
   to resolve Google's per-instance event id for Compass-created series).
   Imported occurrences already carry their instance id in
   `externalReference`; Compass-created series need an `events.instances`
   lookup before the per-occurrence `events.patch`/delete.
5. Scope Google-to-Compass matching by calendar plus provider event id so equal
   event ids in different calendars cannot collide.
6. Enforce read-only roles before optimistic writes reach Google. Return a
   stable 403 error contract the web can recognize.
7. Keep all members of a recurring series on one calendar. Apply-to-series
   operations validate the base calendar; an inconsistent series fails loudly.
8. Keep someday events on the Compass-local calendar. Both directions go
   through the `TransitionEventInput` command from `01` (A24), introduced in
   `03` with A4 defaults: this packet extends the `schedule` direction to any
   writable target calendar, and `unschedule` continues to delete the provider
   copy and return ownership to the local calendar.
9. Suppress `EVENT_CHANGED` for invisible calendars at the backend boundary and
   publish the required calendar-scoped message contract from `01`. Old
   payload-less clients are intentionally unsupported after the cutover.

## Tests

- Create/update/delete on primary and secondary writer/owner calendars.
- Display but reject writes on reader calendars. Free/busy-only periods never
  enter CRUD paths.
- Cross-user calendar id, stale calendar id, and client-forged Google id.
- Same Google event id in two calendars.
- Recurring base/instances and every edit scope on a secondary calendar.
- Scheduled ↔ someday transitions and password-only Compass-local CRUD.
- An `events.patch` update of a Google event with attendees, location, and
  reminders preserves all three.
- Google error after Compass persistence retains current transaction/retry
  semantics and exposes recoverable sync state.

## Exit criteria

- [x] No GCal event write has a primary-calendar default. (Already true
      entering this packet except `GCalService.getEvent`'s read-only default;
      every write path already threaded an explicit calendar id.)
- [x] Server authorization covers every CRUD path and recurrence expansion.
      Shipped in PR #2046 (write-capability enforcement) and PR #2049
      (series-occurrence Google sync + series-calendar consistency guard).
- [x] All provider event lookups include calendar scope. Google-to-Compass
      matching was already scoped by `(calendarId, externalReference.eventId)`
      entering this packet; PR #2050 added the missing test proving an
      identical Google event id in two calendars never collides.
- [x] CRUD works for writable secondary calendars and fails clearly for
      readers. Shipped in PR #2046 (403 `CALENDAR_READ_ONLY`) and PR #2050
      (SSE suppression for invisible calendars).

Shipped in PRs #2046, #2049, #2050.

Suggested commit: `feat(events): route writes by calendar`

# 03 — Cut the runtime over to calendar-owned events

## Goal

Move all core, backend, scripts, and web runtime paths from the legacy
user-owned event document to the final strict calendar-owned event contracts.

Depends on: `01-domain-contracts.md`, `02-safe-event-data-migration.md`.

## Design constraint

Ownership is always proven through the calendar: load a calendar with
`{ _id: event.calendar, user: authenticatedUser }`. Never trust a client-sent
provider id or reintroduce `event.user` for convenient queries.

## Primary code anchors

- `packages/backend/src/event/services/recur/repo/event.repo.ts`
- `packages/backend/src/event/services/event.service.ts`
- `packages/backend/src/event/classes/compass.event.generator.ts`
- `packages/backend/src/event/classes/compass.event.parser.ts`
- `packages/backend/src/event/classes/compass.event.executor.ts`
- `packages/backend/src/sync/services/event-propagation/`
- `packages/backend/src/sync/services/import/google-import.service.ts`
- `packages/web/src/common/storage/offline-data/`

## Implementation steps

1. Expand and relocate the existing recurrence-only `EventRepository` into the
   one backend owner of event Mongo queries and storage/API mapping. Do not keep
   old and v2 repositories in parallel. It should expose operations by Compass
   event id, calendar id, calendar ids that are both active and visible, Google
   provider id, and recurrence base.
2. Change `mongo.service.ts` to type the active event collection with the final
   document. Remove direct `Collections.EVENT` calls from feature services as
   they are touched.
3. Refactor event read/create/update/delete/reorder services and controllers to
   use the repository and calendar ownership checks.
4. Refactor recurrence generator/parser/executor paths so base and instances
   retain the same owning calendar. Reject cross-calendar recurrence links.
5. Refactor Google-to-Compass and Compass-to-Google propagation to use provider
   references and resolved calendar metadata instead of top-level `gEventId`,
   `gRecurringEventId`, and `user` fields.
6. Refactor Google import, backfill, sync activity, user deletion, revoked-token
   pruning, test drivers, and seeders. A Google prune must remove only Google
   provider data, never the Compass-local calendar/events.
7. Replace the HTTP event shape with the strict `Event`, command, response, and
   SSE contracts from `01`. Map at the boundary without leaking Mongo Dates or
   provider internals; do not preserve the legacy payload. This includes the
   someday↔scheduled transition endpoint (A24) — drag conversions are live UX
   and must survive the cutover — with A4 defaults (primary writable Google
   calendar, else local) until `05` opens arbitrary writable targets. Honor
   optional client-supplied create ids (A25) so optimistic creation and
   undo-of-delete keep their `_id` behavior. Cover every SSE publish site with
   the `ServerMessage` union (A27), including import results and user
   metadata.
8. Update web drafts, optimistic mutation/cache data, IndexedDB records, and
   local-event migration in the same downtime release so password-only/offline
   behavior survives the breaking change.
   Replace cache pruning by event origin with pruning by calendar provider and
   calendar id; provider identity no longer belongs in the web `Event`.
9. Remove `event_new.types.ts` and the legacy storage type only after `rg`
   proves no runtime imports remain. Do not add a barrel file as a compatibility
   shortcut.
10. During the controlled release cutover, pause writes, rerun the idempotent
    backfill/verification, then rename collections per the `02` runbook (A31:
    `event` → legacy archive name, `event_new` → `event`, validators and
    indexes traveling with the rename), then resume. Retain the old
    collection.

## Required regression matrix

- CRUD: timed, all-day, someday; online and local repository.
- Recurrence: base, instance, this event, this-and-following, all events,
  conversion to/from someday.
- Sync: Google import upsert/delete, Compass outbound create/update/delete,
  reconnect backfill, revoked access.
- Query: week/day ranges, all-day overlap, visible calendars, someday limits,
  priority filters, order updates.
- Security: another user's calendar/event ids return not-found/forbidden without
  disclosing existence.
- Cleanup: full user deletion and Google-only prune affect the correct provider
  data.

## Performance and reliability

- Query calendar ids that are both active and visible once per request and use
  indexed `$in` filters.
- Range reads are two indexed branches (timed BSON Dates, all-day/someday
  date-only strings) with the all-day window derived from the query instants'
  own offsets, per `01`. Record an `explain` for each branch, plus the someday
  query, before and after.
- Fetch recurrence bases in one query, as the legacy service does, not N+1.
- Keep Google calls outside retryable Mongo transactions — this preserves the
  existing rule documented in `compass-to-google.event-propagation.ts`.
- Ensure optimistic `_id` behavior remains unchanged (A25).

## Exit criteria

- [ ] `rg` finds no runtime query by `event.user` or top-level Google event id.
- [ ] All event behavior uses the calendar-owned repository.
- [ ] Someday↔scheduled drag conversions work through the transition command,
      and undo of delete restores the original event id.
- [ ] API and IndexedDB migrations pass old-data fixtures.
- [ ] Focused core/backend/web/scripts suites, type-check, and lint pass.
- [ ] Every runtime requirement archived from #1138 and #1135 has matching
      code and test evidence in this packet.

Suggested commit boundaries:

1. `refactor(backend): use calendar-owned event repository`
2. `refactor(web): adopt calendar-owned event api`
3. `docs(events): document calendar ownership cutover`

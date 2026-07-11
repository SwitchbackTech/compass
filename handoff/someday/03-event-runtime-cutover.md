# 03 — Cut the runtime over to calendar-owned events

## Goal

Move all core, backend, scripts, and web runtime paths from the legacy
user-owned event document to the final strict calendar-owned event contracts.

Status (2026-07-11): substantially implemented on
`refactor/event-runtime-cutover`. Backend, storage, HTTP/SSE contracts,
IndexedDB, and the web data/state layers are fully cut over with all suites
and the full local e2e run green. Remaining before this packet's boxes can be
checked: dissolve `packages/web/src/events/queries/event.legacy-bridge.ts` by
converting the component/view layer (draft store, grid drag/resize, forms,
sidebar, shortcuts) off `Schema_Event`, then delete the legacy web event
types. `event_new.types.ts` stays as long as the frozen 2025 migrations
import it. Scope-`this` provider sync for series occurrences is deferred to
`05` (recorded there).

Update (2026-07-11, `refactor/web-event-legacy-bridge`): the grid draft
pipeline (click-to-open, right-click, keyboard-created timed/all-day drafts,
Week drag/resize/duplicate mutations) now runs on the strict
`GridEventDraft`/`EventMutations` contracts via a new
`events/grid-event-draft.adapter.ts` + `events/event-view.adapter.ts`, with
`draft.store.ts`'s canonical `gridDraft` field populated everywhere the grid
opens a draft. `event.legacy-bridge.ts` still backs the store's legacy
`event: Schema_Event` projection (kept in sync automatically by
`startGridDraft`) and the still-unconverted call sites below. Bridge
dissolution is NOT complete; three structural gaps were found that block the
remaining ~13 files, in addition to what's converted:

- **Someday sidebar subsystem** (`useSidebarActions.ts`,
  `SomedayEventContainer.tsx`, `someday.event.util.ts`,
  `someday.draft.util.ts`) is not a simple type swap: it's a self-contained
  state machine (drag/drop reorder, week/month migration, its own
  `State_Sidebar["somedayEvents"]` cache, weekly/monthly limits) built
  entirely around `Schema_Event`, independent of the grid's draft pipeline.
  `GridEventDraft`'s schedule type also has no `someday` variant by design
  (`GridScheduleDraft` is deliberately `timed | allDay` only — someday events
  don't live on the grid). Converting this is its own scoped effort, not a
  follow-on of the grid conversion.
- **Keyboard-edit drag continuation**: `useDraftActions.ts` reads
  `draft.position.dragOffset` off the store's legacy `event` field when a
  keyboard-opened draft (`useWeekShortcuts.ts`'s "M" shortcut,
  `AllDayEvents.tsx`/`MainGridEvents.tsx` keyboardEdit paths) is subsequently
  dragged; `GridEventDraft` carries no grid-layout position data. Needs
  either a position field added to the draft or the keyboard-edit path
  routed differently.
- ~~**Day drag-preview client id**~~ — closed on `refactor/web-event-legacy-bridge-2`:
  added an optional `clientId` to `GridEventDraft`'s `"create"` kind so
  `useDayTimedDraftCreation.ts`'s in-progress drag preview can carry the
  same client-assigned id `dayCalendarDraft.util.ts`'s
  `isDraftOnlyEvent`/`isActiveDraftEvent` match against. Note this gap was
  Day-specific: Week's equivalent (`useTimedGridDraftCreation.ts`) never
  needed an id because Week overlays the draft separately rather than
  merging it into the persisted-events array by `_id`. `DayCalendarGrid.tsx`
  still has its own separate remaining marker — `getDayEventById` bridges to
  `assembleGridEvent`, which still expects `Schema_Event`; that's the grid
  *renderer* (not draft-opening) and is part of the wider
  `Schema_GridEvent`/`web.event.types.ts` renderer conversion referenced in
  this packet's step 2, not this gap.

`useUpdateEvent.ts`'s live drag/resize position updates and the local
`Schema_GridEvent` drag-geometry state in `useDraftState.ts` (10+ consumers:
`GridDraft.tsx`, `MainGridEvents.tsx`, `AllDayEvents.tsx`,
`WeekInteractionCoordinator.tsx`, `useGridMouseMove.ts`, `useGridMouseUp.ts`,
`useDragEdgeNavigation.ts`, etc.) are also untouched — that local state is
the mid-drag pixel geometry, not the persisted event shape, and converting it
is a separate concern from the `Schema_Event`→`Event` cutover this packet is
about.

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

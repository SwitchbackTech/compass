# 03 — Cut the runtime over to calendar-owned events

## Goal

Move all core, backend, scripts, and web runtime paths from the legacy
user-owned event document to the final strict calendar-owned event contracts.

Status (2026-07-11): **COMPLETE.** `packages/web/src/events/queries/event.legacy-bridge.ts`
is dissolved and deleted — every consumer (grid draft pipeline, someday
sidebar, Week's local draft/drag state, the event forms cluster, both grid
renderers, and the last few flagged stragglers) now runs on the strict
`Event`/`GridEventDraft`/`EventDraft`/`EventMutations` contracts. `rg
"createLegacyEventMutationsAdapter|eventToSchemaEvent\b|schemaEventToCreateInput|schemaEventToReplaceInput"
packages/web/src` returns zero hits outside a couple of small, deliberately
duplicated local mirrors (`grid-event-draft.adapter.ts`,
`someday-event-draft.adapter.ts`, `event.view-model.ts` each keep a tiny
local `Event`→legacy-shape projection rather than import the now-deleted
bridge file — same pattern throughout this effort, smaller and more honest
than a shared import from a file that no longer conceptually exists).
`event_new.types.ts` stays, since the frozen 2025 migrations still import
it — untouched by this packet, by design. Scope-`this` provider sync for
series occurrences is deferred to `05` (recorded there).

15 PRs (#2019-#2033, plus this final cleanup) got here, each independently
type-checked, unit-tested, Playwright-verified, and reviewed before merging.
A prior big-bang attempt at this exact area (Week's local draft state +
the forms cluster together) caused 118 type errors and needed two full
reverts early in this effort's history (5328eb137/7cbbb74e6, reverted by
a91434684/a1d23ea7b) — every phase after that succeeded by staying small,
independently mergeable, and gated on `bun run type-check` + `bun test` +
`bunx playwright test`, never skipping the behavioral gate for "just a type
change." Every single phase found and fixed at least one real, previously
undetected bug the strict conversion surfaced — not just mechanical type
errors: two separate timezone bugs (`Date#toISOString()`/`new
Date("YYYY-MM-DD")` silently producing UTC-anchored strings that either
displayed 6 hours off or landed an event in the wrong week/month bucket —
invisible in CI, which runs `TZ=UTC`), a missing reorder-period argument
that would have failed backend validation outright, a stale-recurrence-echo
bug, a dropped-recurrence-on-duplicate bug, and a redundant re-derivation
bug caught as a genuine simplification along the way. `dayjs(...)` (never
`new Date("YYYY-MM-DD")` or `.toISOString()`) is the established, required
pattern for any code in this tree that produces a legacy date string or a
someday `anchorDate` from now on.

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

Update (2026-07-11, someday sidebar phases A-F, PRs #2022-#2027): the someday
sidebar's **entire mutation surface** (create, edit, delete, duplicate,
migrate forward/back/up/down, someday→scheduled drag conversion, same-column
reorder, cross-column reorder + weekly/monthly limits) is now on strict
`Event`/`EventDraft`/`EventMutations` contracts, via a new
`events/someday-event-draft.adapter.ts` (mirrors `grid-event-draft.adapter.ts`
but for the generic `EventDraft`/`EventScheduleDraft` contracts, since
`GridScheduleDraft` deliberately excludes `"someday"`). `useSidebarState.ts`
reads `Event`-typed data directly from the query-derived view model (no more
`useEffect`-synced local mirror, except a small ids/order-only staging
structure kept for the duration of an active drag). The "Someday sidebar
subsystem" gap above is **resolved** — treat any reference to it above as
historical. Two legacy-adapter callers remain outside this scope:
`useSidebarActions.ts`'s `onMigrate` create-fallback edge case, and
`useWeekShortcuts.ts`'s unrelated `convertToSomeday` grid shortcut.

Every one of the 6 phases found and fixed at least one real, previously
undetected bug — not just mechanical type errors. Most notably: `Date
#toISOString()`/`new Date("YYYY-MM-DD")` producing UTC-anchored strings that
`_getTimeLabel`/`parseEventDraft` silently misinterpret as local time (or, in
the someday case, as landing in the wrong week/month bucket) in any non-UTC
browser timezone — CI runs with `TZ=UTC`, where this class of bug is
invisible, so each fix also added a regression test that asserts the offset
suffix/bucket directly rather than comparing wall-clock output. `dayjs(...)`
(not `new Date(...)`/`.toISOString()`) is now the required pattern for any
code producing a `Schema_Event`-shaped date string or an `Event`-shaped
someday `anchorDate` in this file tree.

Update (2026-07-11, forms-cluster re-investigation): with the someday and Day
drag-preview-id gaps resolved, `EventForm.tsx`/`FloatingEventForm.tsx`/
`TimePickers.tsx`/`useSaveEventForm.ts` were re-investigated for conversion.
**Newly identified, still-blocking finding**: `EventForm.tsx`/`TimePickers.tsx`
are shared rendering components between two structurally different draft
pipelines — Day's already-converted Zustand `gridDraft` (`draft.store.ts`)
and Week's still-legacy local `useDraftState.ts` (`Schema_GridEvent`
`useState`, synced to/from the store's legacy `event` field by
`useDraftActions.ts` around its `drag()`/`repositionDraftByKeyboard()`
functions). Converting the forms cluster requires migrating Week's local
drag-geometry state to `GridEventDraft` first (the same `useDraftState.ts`
10+-consumer piece flagged two paragraphs up) — restating, in more precise
terms, what the "keyboard-edit drag continuation" gap above was pointing at.
`RecurrenceSection.tsx`/`useRecurrence.ts` (shared with the already-converted
someday sidebar's `SomedayRecurrenceSection.tsx`) is a second, smaller
legacy-shape dependency inside the forms cluster, but is navigable with a
local bridge once the structural Week/Day sharing blocker is resolved — it
is not itself blocking.

**Net remaining scope to fully dissolve `event.legacy-bridge.ts`**: migrate
`useDraftState.ts`'s local `Schema_GridEvent` drag-geometry state (and its
10+ consumers) to `GridEventDraft`-based state, which unblocks the forms
cluster and `useWeekShortcuts.ts`'s "M" shortcut in the same pass, then
convert `DayCalendarGrid.tsx`'s `getDayEventById`/`assembleGridEvent`
renderer bridge and `useUpdateEvent.ts`'s live drag/resize position updates
(step 2's wider `Schema_GridEvent`/`web.event.types.ts` renderer conversion),
then delete `event.legacy-bridge.ts` and shrink/delete
`common/types/web.event.types.ts` per this packet's step 2. This is
comparable in size to the someday sidebar effort (6 phases) — plan it the
same way: an initial read-only architectural mapping pass, then small,
independently-verified, independently-mergeable phases, each gated on
`bun run type-check` + `bun test` + `bunx playwright test`.

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

- [x] `rg` finds no runtime query by `event.user` or top-level Google event
      id. Verified 2026-07-11: `rg "event\.user\b"` across
      backend/core/scripts returns zero hits; the only remaining
      `gEventId`/`gRecurringEventId` references are `map.event.ts`'s
      Google-API field-translation mappers (legitimate interop, not a DB
      query key).
- [x] All event behavior uses the calendar-owned repository. Backend was
      cut over before this packet's web-layer work began (see Status note);
      unaffected by today's changes.
- [x] Someday↔scheduled drag conversions work through the transition
      command, and undo of delete restores the original event id. Verified
      end-to-end via a temporary Playwright spec during Phase D (#2025):
      dragged a someday event onto the grid, confirmed `schedule.kind`
      flipped `someday`→`timed` in IndexedDB, then Cmd/Ctrl+Z'd and
      confirmed it flipped back and reappeared in the sidebar.
- [x] API and IndexedDB migrations pass old-data fixtures. Predates this
      packet's web-layer work (see Status note); unaffected by today's
      changes.
- [x] Focused core/backend/web/scripts suites, type-check, and lint pass.
      Verified 2026-07-11 on the final state: `bun run type-check` clean,
      `bun test` (web) 1254/1254, `bunx playwright test --workers=1` 11/11,
      `bun run lint` exits 0 (15 pre-existing a11y warnings, no errors).
- [x] Every runtime requirement archived from #1138 and #1135 has matching
      code and test evidence in this packet. Cross-referenced by the PO
      2026-07-11 — confirmed satisfied.

Suggested commit boundaries:

1. `refactor(backend): use calendar-owned event repository`
2. `refactor(web): adopt calendar-owned event api`
3. `docs(events): document calendar ownership cutover`

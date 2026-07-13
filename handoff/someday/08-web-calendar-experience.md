# 08 — Ship the web calendar experience

## Goal

Add the v1 sidebar, visibility, calendar identity, read-only state, and target-
calendar selection archived from #530 while preserving the planner's priority
and offline workflows.

Depends on: `05-calendar-aware-crud.md`; calendar-scoped SSE from `06` should be
available before final integration.

## UX decisions

- Calendar controls live in the existing planner sidebar, in their own
  component below account status and above someday sections.
- A checkbox/switch controls Compass visibility. It does not unsubscribe sync.
- Event cards retain priority fill and add a calendar-colored accent plus a
  textual calendar name in accessible/form contexts.
- Calendar selection appears for drafts/duplicates, not as an existing-event
  move control.
- Read-only events can be inspected but not saved, resized, dragged, deleted,
  reordered, or recurrence-edited.
- A series base never renders its own grid card (A45) — the view model
  (`event.view-model.ts`) drops `recurrence.kind === "series"` events before
  building timed/all-day cards. Every occurrence, including the first, is a
  separately materialized event and renders normally.

## Primary code anchors

- `packages/web/src/components/PlannerSidebar/PlannerSidebar.tsx`
- `packages/web/src/views/Forms/EventForm/EventForm.tsx`
- `packages/web/src/common/calendar-grid/components/CalendarTimedEventCard.tsx`
- `packages/web/src/common/calendar-grid/components/CalendarAllDayEventCard.tsx`
- `packages/web/src/events/queries/`
- `packages/web/src/sse/hooks/useEventSSE.ts`
- `packages/web/src/common/storage/offline-data/`

## Implementation steps

1. Create a concrete `packages/web/src/calendars/` API/query module with Zod
   response validation, stable query keys, list/select mutations, optimistic
   toggle, rollback, and invalidation. Do not add an `index.ts` barrel.
2. Add `PlannerCalendarList` as its own component. Render calendar name,
   visible state, color marker, primary/read-only context, loading, empty, and
   recoverable error states. Do not render inactive provider calendars.
3. Persist toggles through `/api/calendars/select`, which already accepts the
   bulk `[{ id, selected }]` array the coalescing needs (the strict contract
   renames the fields to `{ calendarId, isVisible }`). Coalesce rapid toggles
   and avoid refetching all event ranges repeatedly; invalidate once after the
   final mutation settles.
4. Filter event queries on the server by visible calendars. Immediately hide
   cached events on an optimistic toggle-off and restore them on rollback.
5. Extend event query/view models with calendar identity using a memoized
   calendar map, not an N×M lookup in every card render.
6. Add calendar accents to timed, all-day, day, week, and someday-relevant
   event surfaces. Include the calendar name in the event accessible label or a
   nearby semantic label; never rely on the color alone.
7. Add a labeled calendar combobox to new scheduled event and duplicate forms.
   List only writable calendars, mark the primary default, preserve keyboard
   flow, and show a clear no-writable-calendar state.
8. Put existing read-only events/forms into a real read-only mode and block
   drag/resize/keyboard mutations before optimistic state changes.
   Render `freeBusyReader` availability periods through the `CalendarItem` busy
   branch with no event form or context menu.
9. Handle `calendarsChanged` and calendar-scoped `eventsChanged`. Refresh the
   calendar list and invalidate the affected event ranges. Parse the strict SSE
   union from `01`; malformed messages are logged and ignored, not treated as
   legacy payload-less messages. Two behaviors need explicit handling:
   - the Compass-local calendar hosts someday and scheduled events, so an
     `eventsChanged` for it invalidates both the someday and grid scopes
     (replacing today's separate `SOMEDAY_EVENT_CHANGED`);
   - the browser's `EventSource` auto-reconnects silently and messages sent
     while disconnected are gone, so invalidate event and calendar queries
     once on each stream (re)open — today nothing refetches after a gap.
10. Update IndexedDB/local repository behavior with the Compass-local calendar
    identity. A never-authenticated user has no server calendar id, so local
    records use a client-generated ObjectId as the local-calendar sentinel;
    the sign-in/connect push (`syncLocalEventsToCloud`) must first fetch
    `/api/calendars`, map the sentinel to the server's local calendar id, and
    only then post the events. Test offline creation followed by Google
    connection/migration.

## Accessibility tests

- Semantic role/name queries for visibility controls and combobox; no CSS or
  `data-*` test locators.
- Full keyboard operation, visible focus, stable focus after list refetch, and
  screen-reader announcement of toggle failure/read-only state.
- Calendar identity remains understandable with color removed and at high
  contrast.
- No nested interactive elements in draggable event cards.

## Behavior tests

- Toggle one/many calendars, rapid toggles, rollback, reload persistence, and
  Google metadata refresh preserving choices.
- Event selector defaults and read-only exclusion.
- Reader-private busy events and free/busy-only periods expose no private text
  or mutation controls.
- Day/week/all-day rendering with same priority but different calendars.
- Backend integration proves hidden-calendar changes publish no event SSE;
  visible-calendar SSE refetches the affected data.
- Password-only/offline, reconnect, and revoked-Google states.
- E2E: import two calendars, hide/show one, create/edit/delete on the second,
  and verify Google-origin update appears.

## Exit criteria

- [x] Calendar list and toggles are persistent, accessible, and responsive.
      Shipped in PR #2062 (PlannerCalendarList, optimistic + coalesced
      visibility mutation with rollback and aria-live failure announcement,
      server-side visible-only event reads) and proven in a real browser in
      PR #2066.
- [x] Calendar identity appears on every event surface without replacing
      priority semantics. Shipped in PR #2063: accent strip + calendar name
      in accessible labels on timed/all-day/day/week/someday cards, one
      memoized lookup per list, priority keeps the fill (A9).
- [x] Draft CRUD targets any writable calendar; read-only calendars are
      safe. Shipped in PRs #2063 (CalendarSelect on new/duplicate forms,
      writable-only, primary default, keyboard flow; edit forms show
      read-only calendar text per A6; fixed submit paths discarding explicit
      choices) and #2064 (read-only gating before optimistic writes:
      interaction registry, shortcuts, context menu, disabled-fieldset form,
      mutation backstop; busy content renders as "Busy" and is forced
      read-only, A18). Known issue: a direct left-click on a READ-ONLY card
      opens its inspection form only ~50% of the time in a real browser (a
      mousedown-time race with other press-cycle listeners; two fix attempts
      were reverted rather than shipped half-understood — see PR #2066).
      Keyboard ("M") and context-menu "View" are deterministic inspection
      routes; follow-up owed before or during packet 09 acceptance.
- [x] Hidden calendars avoid unnecessary SSE refetch work. Backend
      suppression shipped in packets 05/06; PR #2062 filters event reads to
      visible calendars server-side, and PR #2065 keys the availability
      query by the visible freeBusyReader set so toggles drop busy periods
      with no cache surgery.

Scope notes recorded while implementing (details in `master-doc.md`):

- Steps 1, 9, and 10 were already implemented before this packet started
  (calendars query module, strict SSE union + reconnect invalidation +
  local-calendar someday/grid invalidation, offline sentinel mapping in
  `syncLocalEventsToCloud`) — fallout of the packet 01-03 contracts
  refactor. Step 3's claim that `/api/calendars/select` still accepted the
  legacy `[{id, selected}]` shape was stale: only the strict
  `[{calendarId, isVisible}]` contract exists.
- freeBusyReader availability (step 8) had contracts but no implementation
  on either side; PR #2065 built the bounded `freebusy.query` endpoint and
  the inert busy-period grid blocks end to end.
- The packet's e2e item "verify Google-origin update appears" cannot run in
  this Playwright harness (no fake-Google backend; specs stub `/api/**`) —
  covered instead by packet 06's backend integration tests and packet 09's
  manual staging runbook (A42).

Shipped in PRs #2062, #2063, #2064, #2065, #2066.

Suggested commit boundaries:

1. `feat(web): add calendar visibility controls`
2. `feat(web): select and identify event calendars`

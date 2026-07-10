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

- [ ] Calendar list and toggles are persistent, accessible, and responsive.
- [ ] Calendar identity appears on every event surface without replacing
      priority semantics.
- [ ] Draft CRUD targets any writable calendar; read-only calendars are safe.
- [ ] Hidden calendars avoid unnecessary SSE refetch work.

Suggested commit boundaries:

1. `feat(web): add calendar visibility controls`
2. `feat(web): select and identify event calendars`

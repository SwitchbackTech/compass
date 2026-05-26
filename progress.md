# Week calendar grid quality pass progress

Draft PR: https://github.com/SwitchbackTech/compass/pull/1816

Branch: `feature/timed-event-overlap-cascade`

Base: `main`

## Current status

This PR is a Week View quality pass that prepares the calendar grid for the
eventual shared Day/Week grid primitive work, without starting that extraction
yet.

The current branch focuses on three areas:

1. Better keyboard and screen-reader affordances for Week calendar events.
2. Calendar-event targeting shortcuts in Week View.
3. Removing the timed-event stacking experiment after deciding it was not the
   right visual direction.

The branch has been rebased onto the latest `main` and is currently open as a
draft PR.

## What changed

### Calendar event targeting primitive

Added `packages/web/src/common/calendar-grid/targeting/calendarEventTargeting.ts`.

This introduces a small DOM-based targeting helper for calendar events. It can:

- Find the currently focused calendar event.
- Find the currently hovered calendar event.
- Fall back to the first visible, non-pending calendar event.
- Focus a calendar event target.

The helper intentionally ignores invalid targets, hidden targets, and pending
events marked as disabled. It uses `data-calendar-event-target`,
`data-calendar-event-type`, and `data-event-id` so the Week shortcut logic can
operate without needing direct component refs for every rendered event.

Covered by:

- `packages/web/src/common/calendar-grid/targeting/calendarEventTargeting.test.ts`

### Week keyboard shortcuts for targeting events

Updated `packages/web/src/views/Week/hooks/shortcuts/useWeekShortcuts.ts`.

Week View now supports:

- `I` to focus the first visible calendar event.
- `M` to edit the targeted calendar event.

The edit target priority is:

1. Focused calendar event.
2. Hovered calendar event.
3. First visible calendar event.

The shortcut does not edit pending events. It also handles events that become
available after the shortcut hook is registered by keeping the current event and
pending-event state in refs.

Covered by:

- `packages/web/src/views/Week/hooks/shortcuts/useWeekShortcuts.test.tsx`

### Shortcut list updates

Added `packages/web/src/views/Week/util/weekShortcutSections.ts`.

The Week shortcut display is now built through a small helper instead of being
defined inline in `WeekView.tsx`. This keeps the visible shortcut list and the
actual Week shortcut behavior easier to check together.

The visible shortcut list now includes:

- `I` - Focus calendar event
- `M` - Edit calendar event

It also preserves the existing Week, creation, sidebar, view navigation, and
command palette shortcuts.

Covered by:

- `packages/web/src/views/Week/util/weekShortcutSections.test.ts`

### Week event accessibility

Updated timed and all-day event rendering so saved calendar events are more
usable from assistive technology and keyboard flows.

Timed events now expose:

- A `role="button"` interaction target.
- An accessible label in the shape `Timed event: [title], [time range]`.
- `aria-disabled="true"` when the event is pending.
- Calendar targeting data when the event can be targeted.
- Hover state through `data-calendar-event-hovered`.

All-day events now expose:

- A `role="button"` interaction target.
- An accessible label in the shape `All-day event: [title]`.
- `aria-disabled="true"` when the event is pending.
- Calendar targeting data when the event can be targeted.
- Hover state through `data-calendar-event-hovered`.

Files touched:

- `packages/web/src/views/Week/components/Event/Grid/GridEvent/GridEvent.tsx`
- `packages/web/src/views/Week/components/Grid/AllDayRow/AllDayEvent.tsx`

Covered by:

- `packages/web/src/views/Week/components/Grid/MainGrid/MainGrid.test.tsx`

### Week grid region labels

The Week timed grid and all-day row now expose named regions:

- `Timed events grid`
- `All-day events`

Files touched:

- `packages/web/src/views/Week/components/Grid/MainGrid/MainGrid.tsx`
- `packages/web/src/views/Week/components/Grid/AllDayRow/AllDayRow.tsx`

Covered by:

- `packages/web/src/views/Week/components/Grid/MainGrid/MainGrid.test.tsx`

### Resting overlap and stacking rollback

The branch originally explored a resting overlap cascade for overlapping timed
events. After review, that direction was removed.

Current behavior:

- Overlapping saved timed events do not get the new stacking/cascade treatment.
- The special overlap helper and its tests were removed.
- `MainGridEvents` renders the timed events directly again.
- The old stacking-specific marker, sizing, border, and z-index behavior is not
  present in the final branch.

Files affected:

- `packages/web/src/views/Week/components/Grid/MainGrid/MainGridEvents.tsx`
- `packages/web/src/views/Week/components/Event/Grid/GridEvent/GridEvent.tsx`
- Removed `packages/web/src/common/calendar-grid/overlap/timedOverlapLayout.ts`
- Removed `packages/web/src/common/calendar-grid/overlap/timedOverlapLayout.test.ts`

The current test expectation is that overlapping saved timed events keep the
same left and width values and do not expose `data-week-event-overlap`.

Covered by:

- `packages/web/src/views/Week/components/Grid/MainGrid/MainGrid.test.tsx`

### Draft/test compatibility cleanup

A couple of test-only adjustments were made while keeping the Week interaction
behavior passing:

- `submit.parser.test.ts` now mocks `validateSomedayEvents`, matching the
  validator surface expected by the current code.
- `useDraftActions.test.ts` no longer mocks `useDraftEffects` and restores mocks
  after the test suite.

Files touched:

- `packages/web/src/views/Week/components/Draft/hooks/actions/submit.parser.test.ts`
- `packages/web/src/views/Week/components/Draft/hooks/actions/useDraftActions.test.ts`

### Domain language update

Updated `CONTEXT.md` to clarify the app language around Day View:

- Day View is the single-date calendar view.
- It may open on today, but it can represent any selected date.
- Avoid calling it Today View unless referring specifically to the current date.

This was added because the next planned work is the Day View adapter/shared grid
primitive, and the language matters before that work starts.

## What intentionally did not change

This PR does not start the shared Day/Week grid extraction.

It also does not change:

- Day View behavior.
- The Day task list.
- Week drag or resize motion.
- Smart scroll.
- Edge navigation.
- Commit routing.
- Timed/all-day conversion behavior.
- Someday drag/drop behavior.
- The old timed-event stacking experiment.

## Verification run so far

The following checks passed after rebasing the branch onto latest `main`:

```bash
bun test --cwd packages/web src/views/Week/components/Grid/MainGrid/MainGrid.test.tsx src/common/calendar-grid/targeting/calendarEventTargeting.test.ts src/views/Week/hooks/shortcuts/useWeekShortcuts.test.tsx src/views/Week/util/weekShortcutSections.test.ts
bun type-check
bun lint
git diff --check
```

Focused test coverage currently includes:

- Week empty-grid draft creation still works.
- Week timed and all-day regions are labeled.
- Saved timed events have accessible names with title and time.
- Pending saved events are marked unavailable.
- Hovered saved timed events become targeting candidates.
- All-day events expose an all-day accessible name and target type.
- Overlapping saved timed events do not use resting stack offsets.
- Saved timed/all-day mouse and resize behavior stays out of draft ownership.
- Calendar event targeting prefers focus, then hover, then first visible event.
- Week shortcut targeting can focus and edit events.
- Pending events are not edited from the shortcut.
- Shortcut docs include the new targeting shortcuts.

## Remaining notes

The PR is still draft because it is a tracking PR for the Week quality pass. The
next likely step is visual/browser review of the Week View after any additional
changes, especially around keyboard targeting and accessibility affordances.

The Day View adapter/shared grid primitive work should stay separate from this
PR so the Week quality work remains easy to review.

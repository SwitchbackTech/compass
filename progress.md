# Week calendar grid quality pass progress

Draft PR: https://github.com/SwitchbackTech/compass/pull/1816

Branch: `feature/timed-event-overlap-cascade`

Base: `main`

## Current status

This PR is a Week View quality pass that prepares the calendar grid for the
eventual shared Day/Week grid primitive work, without starting that extraction
yet.

The current branch focuses on four areas:

1. Better keyboard and screen-reader affordances for Week calendar events.
2. Calendar-event targeting shortcuts in Week View.
3. Removing the timed-event stacking experiment after deciding it was not the
   right visual direction.
4. Letting shortcut-created Week drafts move by keyboard before saving.

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

### Keyboard movement for shortcut-created drafts

Updated Week draft creation and shortcut handling so users can place a new
event without reaching for the mouse after pressing `C` or `A`.

Week View now supports:

- `C` creates a timed draft on today when today is in the visible week, or on
  the visible week's anchor day when viewing another week.
- `A` creates a one-day all-day draft instead of a full-week all-day draft.
- Arrow keys move only the active unsaved draft created by `C` or `A`.
- Timed drafts move by 15 minutes up/down and one day left/right.
- All-day drafts move one day left/right; up/down do nothing.
- Draft movement preserves duration, clamps inside the visible week, and keeps
  timed drafts from crossing midnight.
- Arrow movement works while the form is open. The auto-focused empty title
  field still allows movement; once the title has text, arrows behave normally
  in the field.
- Focus stays where it already is while the draft moves.
- Pressing Enter in the title field commits the title locally, keeps the draft
  form open, and moves focus to the draft block.
- After title commit, arrow keys move the draft again.
- Pressing Enter on the focused draft block returns focus to the title field.
- The draft form stays non-modal while the draft block is the active keyboard
  handle.
- Final event save remains separate from title commit.

Files touched:

- `packages/web/src/common/utils/draft/draft.util.ts`
- `packages/web/src/views/Forms/EventForm/EventForm.tsx`
- `packages/web/src/views/Week/components/Draft/hooks/actions/useDraftActions.ts`
- `packages/web/src/views/Week/components/Draft/grid/GridDraft.tsx`
- `packages/web/src/views/Week/hooks/shortcuts/useWeekShortcuts.ts`

Covered by:

- `packages/web/src/common/utils/draft/draft.util.test.ts`
- `packages/web/src/views/Forms/EventForm/EventForm.test.tsx`
- `packages/web/src/views/Week/components/Draft/hooks/actions/useDraftActions.test.ts`
- `packages/web/src/views/Week/components/Draft/grid/GridDraft.test.tsx`
- `packages/web/src/views/Week/hooks/shortcuts/useWeekShortcuts.test.tsx`

### Shortcut list updates

Added `packages/web/src/views/Week/util/weekShortcutSections.ts`.

The Week shortcut display is now built through a small helper instead of being
defined inline in `WeekView.tsx`. This keeps the visible shortcut list and the
actual Week shortcut behavior easier to check together.

The visible shortcut list now includes:

- `Arrow keys` - Move draft event
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
- Saved Week drag or resize motion.
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
- Shortcut-created timed drafts can move by arrow keys while preserving
  duration.
- Shortcut-created all-day drafts can move horizontally by arrow keys.
- Keyboard movement ignores non-empty editable fields but still works from the
  auto-focused empty title field.
- Once the draft title has been edited, the title field keeps normal text
  editing arrow-key behavior even if the user backspaces it empty again.
- Pressing Enter in the draft title commits only the title and returns focus to
  the draft block so the draft can move again.
- Pressing Enter on the focused draft block returns focus to the title field.
- Plain Enter does not final-save a draft while the draft block is focused;
  final save remains the Save button or explicit submit shortcut.
- The draft form stays non-modal so focus can intentionally move to the draft
  block without hiding the focused block from assistive technology.
- `A` creates a one-day all-day draft on the expected start day.

Additional checks from the keyboard draft movement update:

```bash
bun test --cwd packages/web src/common/hooks/useAppHotkey.test.ts src/common/utils/draft/draft.util.test.ts src/views/Forms/EventForm/EventForm.test.tsx src/views/Week/components/Draft/grid/GridDraft.test.tsx src/views/Week/components/Draft/hooks/actions/useDraftActions.test.ts src/views/Week/hooks/shortcuts/useWeekShortcuts.test.tsx src/views/Week/util/weekShortcutSections.test.ts
bunx biome check CONTEXT.md progress.md packages/web/src/common/hooks/useAppHotkey.ts packages/web/src/common/hooks/useAppHotkey.test.ts packages/web/src/common/utils/draft/draft.util.ts packages/web/src/common/utils/draft/draft.util.test.ts packages/web/src/views/Forms/EventForm/EventForm.tsx packages/web/src/views/Forms/EventForm/EventForm.test.tsx packages/web/src/views/Forms/EventForm/types.ts packages/web/src/views/Week/components/Draft/grid/GridDraft.tsx packages/web/src/views/Week/components/Draft/grid/GridDraft.test.tsx packages/web/src/views/Week/components/Draft/hooks/actions/useDraftActions.ts packages/web/src/views/Week/components/Draft/hooks/actions/useDraftActions.test.ts packages/web/src/views/Week/hooks/shortcuts/useWeekShortcuts.ts packages/web/src/views/Week/hooks/shortcuts/useWeekShortcuts.test.tsx packages/web/src/views/Week/util/weekShortcutSections.ts packages/web/src/views/Week/util/weekShortcutSections.test.ts
git diff --check
```

Manual browser smoke on `http://localhost:9080/week`:

- Pressed `C`.
- Confirmed the form opened with the title field focused.
- Pressed ArrowDown.
- Confirmed the draft moved from `1:15 - 2:15 PM` to `1:30 - 2:30 PM` while
  focus stayed on the title field.
- Typed in the title field after moving the draft.
- Confirmed ArrowLeft moved the title cursor and Backspace edited the title text
  without moving the draft again.
- Backspaced the title to empty and confirmed the next arrow key still stayed in
  title-editing mode instead of moving the draft.
- Pressed Enter in the title field and confirmed focus moved to the draft block
  without saving the final event.
- Confirmed arrow keys moved the draft again after title commit.
- Pressed Enter on the draft block and confirmed focus returned to the title
  field.
- Confirmed pressing Enter from the draft block no longer final-saves the draft.

Current known verification blocker:

- Repo-wide `bun type-check` and `bun lint` are blocked by unrelated existing
  issues in `packages/web/src/views/Prototype/OverlapPrototype.tsx`:
  `bun type-check` is blocked by the prototype event layout type, and `bun lint`
  is blocked by formatting in the same prototype file.

Cleanup pass after the `simplify` review:

- Moved the draft title/editable-target keyboard rules into a shared form
  utility so Week shortcuts and the event form no longer depend on a duplicated
  `"Event Title"` string.
- Added a local draft session key so title-editing mode resets for a brand-new
  unsaved draft without resetting every time the current draft moves.
- Split EventForm effects so title typing updates the active event ref without
  recalculating date/time picker state on every keystroke.
- Added coverage for the unsaved draft title-editing reset.

Cleanup verification:

```bash
bun test --cwd packages/web src/common/utils/form/form.util.test.ts src/common/hooks/useAppHotkey.test.ts src/common/utils/draft/draft.util.test.ts src/views/Forms/EventForm/EventForm.test.tsx src/views/Week/components/Draft/grid/GridDraft.test.tsx src/views/Week/components/Draft/hooks/effects/useDraftEffects.test.ts src/views/Week/components/Draft/hooks/actions/useDraftActions.test.ts src/views/Week/hooks/shortcuts/useWeekShortcuts.test.tsx src/views/Week/util/weekShortcutSections.test.ts
bunx biome check CONTEXT.md progress.md packages/web/src/common/hooks/useAppHotkey.ts packages/web/src/common/hooks/useAppHotkey.test.ts packages/web/src/common/utils/draft/draft.util.ts packages/web/src/common/utils/draft/draft.util.test.ts packages/web/src/common/utils/form/form.util.ts packages/web/src/common/utils/form/form.util.test.ts packages/web/src/views/Forms/EventForm/EventForm.tsx packages/web/src/views/Forms/EventForm/EventForm.test.tsx packages/web/src/views/Forms/EventForm/types.ts packages/web/src/views/Week/components/Draft/grid/GridDraft.tsx packages/web/src/views/Week/components/Draft/grid/GridDraft.test.tsx packages/web/src/views/Week/components/Draft/hooks/effects/useDraftEffects.test.ts packages/web/src/views/Week/components/Draft/hooks/actions/useDraftActions.ts packages/web/src/views/Week/components/Draft/hooks/actions/useDraftActions.test.ts packages/web/src/views/Week/components/Draft/hooks/state/useDraftState.ts packages/web/src/views/Week/hooks/shortcuts/useWeekShortcuts.ts packages/web/src/views/Week/hooks/shortcuts/useWeekShortcuts.test.tsx packages/web/src/views/Week/util/weekShortcutSections.ts packages/web/src/views/Week/util/weekShortcutSections.test.ts
git diff --check
```

## Remaining notes

The PR is still draft because it is a tracking PR for the Week quality pass. The
next likely step is visual/browser review of the Week View after any additional
changes, especially around keyboard targeting and accessibility affordances.

The Day View adapter/shared grid primitive work should stay separate from this
PR so the Week quality work remains easy to review.

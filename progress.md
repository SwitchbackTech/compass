# Week calendar grid quality pass progress

Draft PR: https://github.com/SwitchbackTech/compass/pull/1816

Branch: `feature/timed-event-overlap-cascade`

Base: `main`

## Current status

This PR is a Week View quality pass that prepares the calendar grid for the
eventual shared Day/Week grid primitive work, without starting that extraction
yet.

The current branch focuses on five areas:

1. Better keyboard and screen-reader affordances for Week calendar events.
2. Calendar-event targeting shortcuts in Week View.
3. Removing the first timed-event stacking experiment, then prototyping and
   shipping the **Deck** overlap layout for overlapping Week timed events.
4. Letting shortcut-created Week drafts move by keyboard before saving.
5. Rendering overlapping Week timed events as a legible left-anchored deck
   (uniform-width cards fanned right, true start-time tops, click/keyboard
   reach-behind).

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

### Overlap layout prototype and Deck decision

After the rollback above, overlapping Week timed events render fully stacked at
full width (a single illegible "blob"). To pick a better treatment before
committing to code, we built a throwaway UI prototype and compared options
side by side.

What we did:

- Researched how Google Calendar, Notion Calendar, Fantastical, Outlook, Apple
  Calendar, and others handle overlapping timed events. Key takeaways: equal
  `1/N` side-by-side split goes unreadable at 3+; the persistent left color/peek
  strip is the universal legibility lifeline; no app solves 5+ gracefully.
- Built a dev-only prototype route `/prototype/overlap` rendering five overlap
  densities (double booking, triple, five-at-once, nested-in-a-block, staggered
  chain) across three switchable variants.
- Iterated on the variants based on review:
  - All variants made **left-anchored** with a reserved open lane on the right
    (so there is always empty grid to drag-create into).
  - Separation switched from a lightened border to a thin **dark gutter ring**;
    unified the drop shadow to a single downward light source; gated the time
    label on width so it never clips.
  - Removed a hover-to-front reveal (a trap: leaving the hover re-covers what is
    behind) and a count-badge / collapse / expand affordance (visually noisy).

Decision: **Deck** wins — left-anchored, uniform-width cards fanned to the right
by a fixed indent, with each card's top edge equal to its true start time. It
was the cleanest and easiest to understand.

The prototype was throwaway. It has since been **deleted** now that the real
Deck layout has landed (see the next section): the
`packages/web/src/views/Prototype/` folder, the dev-only `PROTOTYPE_OVERLAP`
route in `packages/web/src/routers/index.tsx`, and the `PROTOTYPE_OVERLAP` entry
in `packages/web/src/common/constants/routes.ts` are all removed.

### Deck overlap layout (implemented)

Implemented the Deck layout for the Week timed grid per
[`deck-overlap-plan.md`](./deck-overlap-plan.md). Overlapping same-day timed
events now render as left-anchored, uniform-width cards fanned to the right by a
fixed indent, with each card's top edge equal to its true start time. Scope is
Week only; Day view's equal-split is untouched and the layout ships as a shared,
pure util so Day can adopt it later.

How it works:

- **New additive `position.deck` field** (`{ order, groupSize } | null`). Its
  presence switches the position math into Deck mode; its absence preserves all
  existing behavior (Day equal-split, single events, all-day, drafts). This keeps
  the change decoupled from the `widthMultiplier`/`horizontalOrder` path Day
  still uses.
- **New pure util `applyWeekTimedOverlapLayout`** buckets events by start day
  (events on different days never share a deck), builds transitive overlap groups
  within each day, orders them background-first (earliest start, then longest
  duration sits behind), and writes `position.deck`. Groups of one stay `null`.
  Wired into the Week selector `selectGridEvents` only.
- **Deck geometry in `position.util.ts`**: a deck card's width is
  `base - DECK_RIGHT_RESERVE - (groupSize-1)*DECK_INDENT` (floored at
  `DECK_MIN_WIDTH`), left is indented by `order*DECK_INDENT`, and `zIndex` is
  `order+1`. `getEventPosition`'s return type gained an optional `zIndex`.
- **`GridEvent` rendering**: consumes `position.zIndex`; deck cards get a dark
  gutter ring + a single downward drop shadow + a faint top inner highlight; the
  time label also gates on width so it never clips on narrow cards.
- **Reach-behind**: a clicked/edited (draft), dragged, resized, or
  keyboard-focused card floats above the whole deck at `ZIndex.MAX` (20, below the
  floating form at 21). This was the fix for buried events: the full-width draft
  block was previously at `LAYER_1` (z=1) and painted *behind* deck cards at
  `z=order+1`, so clicking a buried event never surfaced it. No hover-to-front,
  no count badge/collapse, no sticky click mode (all rejected in the prototype).

Constants (tuning dials) in `packages/web/src/views/Week/layout.constants.ts`:
`DECK_INDENT = 8`, `DECK_RIGHT_RESERVE = 24`, `DECK_MIN_WIDTH = 72`,
`MIN_EVENT_WIDTH_FOR_TIME_LABEL = 90`.

Files touched:

- `packages/web/src/common/types/web.event.types.ts` (schema)
- `packages/web/src/common/utils/event/event.util.ts` (default position)
- `packages/web/src/common/utils/overlap/weekTimedOverlapLayout.ts` (new util)
- `packages/web/src/ducks/events/selectors/event.selectors.ts` (Week selector)
- `packages/web/src/common/utils/position/position.util.ts` (deck geometry)
- `packages/web/src/views/Week/components/Event/Grid/GridEvent/GridEvent.tsx`
  (z-index, gutter ring/shadow/highlight, focus raise, time-label width gate)
- `packages/web/src/views/Week/layout.constants.ts` (constants)

Covered by:

- `packages/web/src/common/utils/overlap/weekTimedOverlapLayout.test.ts`
  (per-day bucketing, transitive grouping, background-first order, no-mutation)
- `packages/web/src/common/utils/position/position.util.test.ts`
  (deck width/left/zIndex math, floor, draft bypass)
- `packages/web/src/views/Week/components/Grid/MainGrid/MainGrid.test.tsx`
  (deck stagger + uniform width + increasing zIndex; focus raises to front)

The previous fully-stacked overlap test was rewritten to assert the Deck layout
instead of equal left/width. Several `position` test fixtures across the repo
gained `deck: null` for the new required field.

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

Previously, repo-wide `bun type-check` and `bun lint` were blocked by the
throwaway `packages/web/src/views/Prototype/OverlapPrototype.tsx`. That prototype
has been deleted, so both now pass cleanly across the repo.

Deck overlap layout verification:

```bash
bun type-check
bun run lint
bun test --cwd packages/web src/common/utils/overlap src/common/utils/position src/views/Week/components/Grid/MainGrid/MainGrid.test.tsx
```

- `bun type-check` and `bun run lint` pass repo-wide.
- The overlap, position, and MainGrid suites pass (deck grouping/order, deck
  width/left/zIndex math, deck stagger + focus-raise rendering).
- Note: the Draft hooks suite has a pre-existing Bun batch-ordering
  circular-import flake (`hasEventDates`/`gridEventDefaultPosition` "export not
  found") that reproduces on a clean tree and passes when files are run
  individually — not introduced by the Deck work.

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

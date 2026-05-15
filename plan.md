# Week View Timed Drag Smoothness Prototype

## Goal

Prototype smoother Week view timed-event drag without changing the calendar's
meaning.

Events should still move only between valid 15-minute Timed Slots, but the
moving event should visually glide toward the latest snapped slot instead of
jumping frame by frame.

## Decisions Already Settled

- Timed Slot means a 15-minute placement on the day/week time grid.
- Scope is Week view timed-event drag only.
- Day view, all-day drag, and resize are out of scope unless a tiny shared helper
  change is unavoidable.
- The Week view prototype should show about 13 visible hours at once.
- There should be no zoom or density control for this prototype.
- Use one moving event only. Do not keep a dim original placeholder visible.
- The drag visual should glide on both axes: time slot and day column.
- The glide should feel like a tight pull, but not fully attached to the cursor.
- Target animation feel: around 60ms and interruptible.
- Fast drags should retarget straight to the latest snapped slot, not replay old
  intermediate slots.
- On release, save immediately to the latest snapped slot, even if the visual is
  mid-glide.
- The visual should land exactly on the snapped slot. Do not leave it in a
  semi-invalid offset.
- The time label should update immediately to the snapped target time.
- Auto-scroll should keep the same 15-minute snapping.
- Normal click behavior must stay unchanged: a click opens the event and should
  not show a moving drag visual.
- No ADR yet. This is a reversible interaction prototype.

## Current Docs Updated

- `CONTEXT.md`
  - Added Timed Slot as a 15-minute placement.
  - Added relationship: Timed Events start and end on Timed Slot boundaries.
- `docs/architecture/glossary.md`
  - Added Timed Slot.
- `docs/acceptance/events.md`
  - Updated timed drag acceptance from 30-minute snapping to 15-minute snapping.
  - Captured the Week-view-only prototype scope.
  - Captured the tight snapped glide behavior.

## Implementation Plan

1. Update Week grid density directly.
   - Change the Week view time-grid scale from about 11 visible hours to about
     13 visible hours.
   - Keep this as a fixed prototype value, not a setting.

2. Add drag visual smoothing only to Week timed-event drag.
   - The current V2 controller already owns the moving event copy.
   - Adjust that moving copy so each new snapped target becomes an animation
     target instead of an immediate transform jump.

3. Keep Timed Slot as the source of truth.
   - The event's real target time and day update immediately to the latest valid
     snapped slot.
   - The animation is presentation only.

4. Make the glide tight and interruptible.
   - Use a short movement around 60ms.
   - If the pointer moves again before the glide finishes, retarget immediately
     to the newest snapped slot.

5. Preserve click behavior.
   - Do not mount or animate the moving copy on pointer down.
   - Only begin the moving visual after the controller has classified the action
     as a drag.

6. Keep scope narrow.
   - Do not add a zoom setting.
   - Do not change Day view.
   - Do not change all-day drag.
   - Do not broaden into resize unless the drag implementation makes a tiny
     shared helper change cheap and safe.

## Likely Code Areas

- `packages/web/src/views/Week/layout.constants.ts`
- `packages/web/src/views/Week/hooks/grid/useGridLayout.ts`
- `packages/web/src/views/Week/components/Grid/MainGrid/styled.ts`
- `packages/web/src/views/Week/components/Grid/Columns/styled.ts`
- `packages/web/src/views/Week/components/Grid/Columns/TimesColumn/styled.ts`
- `packages/web/src/views/Week/interaction/v2/WeekInteractionController.ts`
- `packages/web/src/views/Week/interaction/v2/dom/DragOverlay.ts`
- `packages/web/src/views/Week/interaction/v2/math/timedDrag.ts`

## Verification Plan

Run focused tests first:

```bash
cd /Users/ugur/Projects/switchback-tech/compass2/packages/web
bun test src/views/Week/interaction/v2/math/timedDrag.test.ts src/views/Week/interaction/v2/WeekInteractionController.test.ts
```

Then browser-check the local Week view:

- normal click opens the event without showing a drag visual
- slow vertical drag glides between 15-minute slots
- fast vertical drag retargets to the latest slot without lag buildup
- drag across day columns glides horizontally to the snapped column
- release saves immediately to the latest snapped slot
- Day view and all-day drag still behave as before

If changing density affects event readability, inspect short events before
calling the prototype done.

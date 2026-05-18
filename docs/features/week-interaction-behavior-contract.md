# Week Interaction Behavior Contract

This contract captures the source-of-truth Week interaction prototype before
the clean calendar interaction engine implementation starts.

Prototype reference:

- branch: `feature/week-view-controller-v2`
- commit: `3bd2d2110743ea2bce2adf9ae38ecd47b4ef30e4`
- primary source files:
  - `packages/web/src/views/Week/interaction/v2/WeekInteractionController.ts`
  - `packages/web/src/views/Week/interaction/v2/WeekInteractionBoundary.tsx`
  - `packages/web/src/views/Week/interaction/v2/geometry/WeekLayoutCache.ts`
  - `packages/web/src/views/Week/interaction/v2/dom/DragOverlay.ts`
  - `packages/web/src/views/Week/interaction/v2/dom/cloneGridEventNode.ts`
  - `packages/web/src/views/Week/interaction/v2/dom/placeholder.ts`
  - `packages/web/src/views/Week/interaction/v2/commit/*.ts`
  - `packages/web/src/views/Week/interaction/v2/math/*.ts`

The clean implementation must preserve this behavior unless a task explicitly
marks a difference as intentional hardening and verifies that the user-visible
Week feel is unchanged.

## Ownership Matrix

| Target | Prototype owner | Clean branch rule |
| --- | --- | --- |
| Saved timed event body | v2 controller, after eligible pointerdown | New Week adapter owns. |
| Saved timed resize handle | v2 controller for non-excluded cases | New Week adapter owns only after excluded cases are accounted for. |
| Saved all-day event body | v2 controller, after eligible pointerdown | New Week adapter owns. |
| Saved all-day resize handle | v2 controller for non-excluded cases | New Week adapter owns only after excluded cases are accounted for. |
| Pending saved event | Not owned by v2 | Preserve non-draggable/non-resizable pending behavior. |
| Empty grid and new draft creation | Legacy Week draft handlers | Leave with existing Week paths in the first branch. |
| Draft event | Legacy Week draft handlers | Leave with existing Week paths in the first branch. |
| Someday/sidebar drag/drop | Planner sidebar / existing Week integration | Leave as follow-up scope. |
| Event form UI, menus, buttons, editable fields | Existing UI handlers | Do not capture as calendar motion targets. |

Prototype ownership starts when `WeekInteractionController.handlePointerDown`
accepts an eligible saved-event target. The boundary immediately prevents and
stops the owned pointerdown, then suppresses legacy mouse paths while the
controller is pending or active. Ownership does not wait until motion
activation.

## Constants And Geometry

- Timed grid snap step: `15` minutes.
- Timed visible hours: `13`.
- Hold activation delay: `750ms`.
- Movement activation threshold: greater than `25px` on either axis.
- Edge navigation dwell: `500ms`.
- Smart scroll edge threshold: `50px`.
- Smart scroll bottom inset: `100px`.
- Smart scroll speed: `10px` per frame.
- Week edge-navigation offset: `+/-7` days.
- Timed resize minimum duration: one snap step.
- All-day resize minimum span: one visible day.

Timed layout is read from `ID_GRID_MAIN` and `ID_GRID_COLUMNS_TIMED`. All-day
layout is read from `ID_ALLDAY_COLUMNS`. Both layout caches create seven day
columns from rendered DOM geometry. Timed drag chooses the nearest rendered day
column by horizontal center, not by a fixed date calculation alone.

## Pointer Lifecycle

1. Eligible pointerdown creates a pending session and starts the hold timer.
2. Quick pointerup while pending is a click result.
3. Pointermove activates motion only after movement exceeds the configured
   threshold.
4. Hold activation can also transition pending to motion after `750ms`.
5. Motion updates run through a single `requestAnimationFrame` loop.
6. Pointerup during motion converts the current visual draft to a grid event,
   computes `hasMoved`, tears down overlay/source state, and returns one commit
   result.

The prototype records `pointerId` and ignores pointermove/pointerup from other
pointers. It does not clearly enforce primary-pointer, left-button-only, or
modifier-key filtering in the v2 controller path. Any stricter filtering in the
clean adapter is a deliberate hardening choice and must be tested against
right-click/context-menu and keyboard/click behavior.

## Activation And Form Close Timing

The boundary closes an already-open form when it observes a pointermove
transition from `pending` to `motion` and the session had an open form at
pointerdown.

The hold timer activates inside the controller. The prototype does not
obviously route that hold activation through the same boundary transition that
closes the form. The clean implementation must either preserve this exact
distinction or intentionally harden it with tests.

## Commit Routing

Commit precedence is binding:

1. `hasMoved === false`: open the existing event; do not save and do not open
   recurrence scope.
2. `hasMoved === true` and `hadFormOpenBeforeInteraction === true`: set the
   changed event as draft and reopen the form.
3. `hasMoved === true`, no prior open form, and recurring event: route to the
   recurrence-scope flow.
4. `hasMoved === true`, no prior open form, and non-recurring event: submit once
   on release.

Form-open handling wins over recurrence in the prototype.

## Visual Overlay And Placeholder

The prototype uses a body-mounted DOM clone overlay:

- clone is appended to `document.body`
- source event is hidden with `visibility: hidden`
- clone removes duplicate `id`, `tabindex`, `aria-describedby`,
  `aria-controls`, and `aria-labelledby`
- clone gets `aria-hidden="true"`
- clone gets `data-week-interaction-overlay="true"`
- clone pointer events are disabled
- overlay uses `translate3d(...)`
- overlay clears `transition` on mount and on every update
- overlay uses `contain: layout paint style` and `will-change: transform`
- drag cursor is applied to `body` and `documentElement` for drag sessions

The clean shared engine may expose this as a default overlay strategy, but Week
must provide the Week-specific clone policy.

## Timed Drag

Timed drag preserves event duration. Vertical movement snaps to `15` minutes.
Horizontal movement chooses the nearest rendered day column. The live visual
transform uses pointer delta snapped by rendered pixels-per-minute; saved time
uses pointer delta plus smart-scroll delta.

Timed drag clamps the new start time between the beginning of the day and the
latest start that preserves duration.

Smart scroll applies only to timed drag. It reads the scroll container at motion
activation, then adjusts `scrollTop` by `10px` per frame while the pointer is
inside the top or bottom smart-scroll zone. The total scroll delta feeds saved
time math, while the overlay remains visually anchored.

## Timed Resize

Timed resize owns top and bottom handles for eligible saved timed events. It
updates only transform and height. It supports edge flip:

- resizing the start past the original end flips to end resize
- resizing the end before the original start flips to start resize

It enforces one snap-step minimum duration and clamps within one day.

Prototype v2 refuses timed resize ownership for:

- pending events
- edge-navigation candidates, meaning events starting on visible Sunday or
  Saturday
- smart-scroll candidates, meaning events already near the timed grid top or
  bottom edge

The clean branch must preserve those fallback cases until it intentionally owns
and verifies them.

## All-Day Drag

All-day drag moves horizontally by nearest visible day column. It preserves the
event span using the prototype visual-index and commit conversion behavior.

Commit conversion moves both date-only start and exclusive end by the same day
delta. The prototype uses `dayjs(...).add(dayDelta, "day")`, which should be
preserved unless Task 10 intentionally hardens DST behavior.

## All-Day Resize

All-day resize owns left and right handles for eligible saved all-day events. It
uses inclusive visual day indexes during motion and commits back to date-only
exclusive end dates.

Resize supports edge flip:

- resizing the start after the original end flips to end resize
- resizing the end before the original start flips to start resize

Prototype v2 refuses all-day resize ownership for:

- pending events
- all-day edge-navigation candidates, meaning spans that start on visible
  Sunday or end on visible Saturday

The clean branch must preserve those fallback cases until it intentionally owns
and verifies them.

## Edge Navigation

Edge navigation applies only to timed drag and all-day drag. Resize does not use
the v2 edge-navigation path.

The edge zone is the left or right `50px` of the rendered Week columns while the
pointer is inside the relevant vertical bounds. Entering an edge starts a
`500ms` dwell timer. Once the dwell completes:

- the visual gets a `+7` or `-7` day offset
- one week navigation request is sent
- layout rebuild is marked pending
- duplicate navigation requests are blocked for that same edge entry

The edge state resets after leaving the edge zone. Do not implement continuous
week jumps while the pointer remains in the same edge zone unless a later audit
finds that behavior elsewhere.

## Date And Time Arithmetic

Timed commit conversion uses `dayjs(event.startDate).add(dayDelta, "day")` and
then adds local minutes from the visual.

All-day drag commit conversion adds the same day delta to both start and
exclusive end.

All-day resize commit conversion computes visual inclusive span days and writes
date-only start plus exclusive end.

The prototype also uses fixed `MS_PER_DAY` math to derive visible all-day
inclusive end indexes before motion. DST hardening is allowed later, but it must
be marked as an intentional behavior change and tested.

## Metrics And Known Gaps

Prototype metrics include:

- active phase
- pointer move count
- RAF count and durations
- React commits during motion
- Redux dispatches during motion
- DOM mutations during motion
- unexpected DOM mutation target descriptions
- style writes during motion
- frame gaps
- first-frame latency
- overlay mount time
- save requests during motion and after pointerup

`layoutReadsDuringMotion` exists in the metrics shape, but the prototype does
not increment it from real layout read sites. The clean implementation must not
claim layout-read success until real instrumentation exists.

## Intentional Hardening Beyond Prototype

The clean implementation should add and test:

- `pointercancel` teardown
- `lostpointercapture` teardown
- window blur teardown
- document visibility-change teardown if it can interrupt motion
- stale registry protection for disconnected or mismatched nodes
- explicit ownership labels in metrics
- phase-scoped edge-navigation metrics

These are improvements beyond the prototype. They must not change normal click,
no-op, form-open, recurrence, or pointerup commit routing.

## Follow-Up Surfaces

Day/Today and Someday are not part of this first branch. Today is the Day route
pointed at the current date, not a separate `/today` surface. Day uses a
different interaction stack, and Someday uses the planner/sidebar drag/drop
stack. The shared engine should not import Week-specific concepts that would
block those future adapters.

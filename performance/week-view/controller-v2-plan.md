# Week View Controller V2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Week View drag and resize feel instant by replacing the live pointer-motion ownership model, not by further optimizing the old Redux draft path.

**Architecture:** React renders the saved calendar and form shell. Redux/backend own canonical saved event state after an interaction completes. A dedicated Week interaction controller owns the live pointer session, one RAF loop, a minimal visual draft, smart scroll, edge-navigation dwell, and one imperative DOM overlay. The first proof slice owns only existing timed-event drag; every riskier behavior stays on the legacy path until the counters prove the new ownership model works.

**Tech Stack:** React, Redux Toolkit, Pointer Events, `requestAnimationFrame`, DOM cloning for overlay fidelity, Bun tests, React Testing Library, Playwright/Chromium Week View perf harness.

---

## Expert Consultation Summary

ChatGPT Pro was consulted through Chrome at `https://chatgpt.com/c/6a05fe45-eaf4-83ea-8cee-fc7a5fef73df`.

It inspected the public GitHub branch through rendered/raw files. Its environment could not clone GitHub because DNS failed, so the public branch plus the local benchmark notes were treated as evidence. The consultation produced these conclusions:

- The previous branch improved architecture, but it kept ownership split across Draft hooks, Redux draft selectors, mousemove/mouseup hooks, smart-scroll hooks, edge-navigation hooks, the new engine, and React effects.
- The active layer was a useful idea, but it became a faster-looking layer over an old ownership model.
- The new engine still carried `Schema_GridEvent` as live motion state. That is too heavy for a real-time pointer path.
- The restart should prove one tiny controller-owned path first: existing timed-event drag, same-week, form closed, non-recurring, not pending.
- Do not build Controller V2 on top of the current interaction-engine branch as-is. Start from a clean production baseline and cherry-pick only benchmark/test improvements that are clearly useful.

## Non-Negotiable Direction

Do not continue optimizing the current interaction-engine branch as the foundation for V2.

Recommended startup for this repo:

```bash
git fetch origin
git switch -c feature/week-view-controller-v2
```

This plan intentionally uses a normal branch in the existing checkout. Do not
create a separate worktree for the V2 restart unless the user asks for one.

Cherry-pick only if the diff is clean and useful:

- Week View perf harness improvements.
- Browser smoke scenarios.
- Pure math parity tests.
- Bug fixes unrelated to the active-layer architecture.

Do not cherry-pick:

- Current `InteractionEngine` as the V2 controller.
- `interaction.store.ts` as the live motion store.
- `ActiveInteractionLayer`.
- `GridDraft` live-motion subscriptions.
- `applyDraftDomPosition` as the live motion primitive.
- Redux draft bypass patches that exist mainly to support the current hybrid migration.

## Finishing Criteria

- Timed drag, timed resize, all-day drag, all-day resize, smart scroll, and drag-to-edge navigation use the controller-owned live session.
- During active pointer motion:
  - React commits during motion: `0`.
  - Redux dispatches during motion: `0`.
  - unexpected DOM mutations outside the overlay: `0`.
  - save/network requests during motion: `0`.
  - post-activation layout reads during timed drag: `0`.
- Pointer motion is driven by one RAF loop.
- Timed drag uses transform-only movement.
- Timed resize writes only transform and height.
- Existing click, form, recurrence, pending-event, and save behavior remains intact.
- Every migrated behavior has focused tests and a matching perf scenario.
- Final browser smoke checks pass in Chrome on `http://localhost:9080/week`.

## Realistic Performance Gates

Measure input floor every run. The prior harness reported a browser/input floor around `14-17ms`, so do not use a flat 30% max-frame-gap target when the baseline is already near that floor.

For existing timed drag:

- sustained max frame gap: `input floor + 4ms` or better.
- sustained p95 frame gap: `input floor + 2ms` or better.
- RAF compute/write p95: `< 2ms`.
- RAF compute/write max: `< 5ms`.
- long tasks: `0`.
- React commits during active motion: `0`.
- Redux dispatches during active motion: `0`.

For timed resize:

- sustained max frame gap: `input floor + 6ms` or better.
- edge flip: no repeated gaps over `32ms`.
- RAF compute/write p95: `< 4ms`.
- long tasks: `0`.
- React/Redux during motion: `0`.

For smart scroll:

- max frame gap: `input floor + 8ms` or better.
- no overlay drift after two seconds of scroll.
- no sawtooth stalls from competing timers.

For edge navigation:

- pre-navigation motion: `input floor + 6ms` or better.
- week render spike measured separately.
- post-navigation motion returns to `input floor + 6ms` within two RAFs.
- duplicate navigation requests: `0`.
- session loss: `0`.

## File Structure

Create V2 under a separate namespace so it does not inherit the current hybrid engine.

- Create `packages/web/src/views/Week/interaction/v2/WeekInteractionBoundary.tsx`
  - React boundary that owns native pointer capture/event delegation and passes commit callbacks to the controller.
- Create `packages/web/src/views/Week/interaction/v2/WeekInteractionController.ts`
  - Framework-free controller for pending/active sessions, one RAF loop, overlay updates, and commit results.
- Create `packages/web/src/views/Week/interaction/v2/WeekInteractionMetrics.ts`
  - Browser/perf counters for React commits, Redux dispatches, RAF time, DOM mutations, layout reads, style writes, and save requests.
- Create `packages/web/src/views/Week/interaction/v2/WeekInteractionSession.ts`
  - Pending and active session types.
- Create `packages/web/src/views/Week/interaction/v2/model/VisualDraft.ts`
  - Minimal visual model. Do not store a full `Schema_GridEvent` as live motion state.
- Create `packages/web/src/views/Week/interaction/v2/model/TimedDragVisual.ts`
  - Timed drag visual fields: day index, start/end minutes, source rect, transform.
- Create `packages/web/src/views/Week/interaction/v2/geometry/WeekLayoutCache.ts`
  - Source rects, grid rects, column widths, minute scale, snap step, scroll start.
- Create `packages/web/src/views/Week/interaction/v2/geometry/eventRegistry.ts`
  - Render-time event-to-element registry.
- Create `packages/web/src/views/Week/interaction/v2/dom/DragOverlay.ts`
  - Imperative overlay mount/update/unmount.
- Create `packages/web/src/views/Week/interaction/v2/dom/cloneGridEventNode.ts`
  - Clone the rendered `GridEvent` DOM for first-slice visual fidelity.
- Create `packages/web/src/views/Week/interaction/v2/dom/placeholder.ts`
  - Mark and restore the source event placeholder.
- Create `packages/web/src/views/Week/interaction/v2/math/snap.ts`
  - Minute/day snapping helpers.
- Create `packages/web/src/views/Week/interaction/v2/math/timedDrag.ts`
  - Timed drag visual math using integers and cached layout.
- Create `packages/web/src/views/Week/interaction/v2/commit/visualDraftToGridEvent.ts`
  - Convert final visual result to `Schema_GridEvent` only at commit.

Modify initially:

- `packages/web/src/views/Week/WeekView.tsx`
- `packages/web/src/views/Week/components/Event/Grid/GridEvent/GridEvent.tsx`
- `packages/scripts/src/performance/week-view.perf.ts`
- `performance/week-view/README.md`

Leave untouched in the first proof slice:

- `packages/web/src/views/Week/components/Draft/**`
- `packages/web/src/views/Week/components/Draft/grid/hooks/useGridMouseMove.ts`
- `packages/web/src/views/Week/components/Draft/grid/hooks/useGridMouseUp.ts`
- `packages/web/src/views/Week/components/Draft/hooks/actions/useDraftActions.ts`
- `packages/web/src/ducks/events/slices/draft.slice.ts`
- `packages/web/src/ducks/events/selectors/draft.selectors.ts`
- `packages/web/src/views/Week/interaction/InteractionEngine.ts`
- `packages/web/src/views/Week/interaction/interaction.store.ts`

## Task 1: Add Measurement Guards First

**Files:**
- Create: `packages/web/src/views/Week/interaction/v2/WeekInteractionMetrics.ts`
- Modify: `packages/scripts/src/performance/week-view.perf.ts`
- Modify: `performance/week-view/README.md`
- Test: focused perf smoke via `bun run perf:week`

- [ ] **Step 1: Add the metrics type and global window hook**

Create `WeekInteractionMetrics.ts`:

```ts
export interface WeekInteractionMetrics {
  active: boolean;
  phase: "idle" | "pending" | "motion" | "commit";
  pointerMoveCount: number;
  rafCount: number;
  reactCommitsDuringMotion: number;
  reactCommitDurationsDuringMotion: number[];
  reduxDispatchesDuringMotion: number;
  reduxActionTypesDuringMotion: string[];
  domMutationsDuringMotion: number;
  unexpectedDomMutationsDuringMotion: string[];
  layoutReadsDuringMotion: number;
  styleWritesDuringMotion: number;
  rafDurations: number[];
  frameGaps: number[];
  firstFrameLatencyMs: number | null;
  overlayMountMs: number | null;
  saveRequestsDuringMotion: number;
  saveRequestsAfterPointerUp: number;
}

declare global {
  interface Window {
    __weekInteractionMetrics?: WeekInteractionMetrics;
  }
}
```

- [ ] **Step 2: Add perf scenarios before changing behavior**

Add scenarios to `week-view.perf.ts`:

- `timed-drag-v2-click-unchanged`
- `timed-drag-v2-start-first-frame`
- `timed-drag-v2-sustained`
- `timed-drag-v2-pointerup-commit`

Expected before V2 exists:

- scenarios may run against legacy or be skipped with a clear message.
- input floor is recorded beside every V2 comparison.

- [ ] **Step 3: Add counters to the harness**

Have the harness read `window.__weekInteractionMetrics` after each interaction sample and print:

- React commits during motion.
- Redux dispatches during motion.
- unexpected DOM mutations during motion.
- layout reads during motion.
- RAF p95/max duration.
- first visual frame latency.
- save requests during and after motion.

- [ ] **Step 4: Run focused harness**

Run:

```bash
bun run perf:week -- --scenario input-baseline --label v2-input-floor
```

Expected:

- completes and saves JSON.
- records input floor for the run.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2/WeekInteractionMetrics.ts packages/scripts/src/performance/week-view.perf.ts performance/week-view/README.md
git commit -m "perf(web): add week interaction v2 measurement guards"
```

## Task 2: Add Event Registration And Attributes

**Files:**
- Create: `packages/web/src/views/Week/interaction/v2/geometry/eventRegistry.ts`
- Modify: `packages/web/src/views/Week/components/Event/Grid/GridEvent/GridEvent.tsx`
- Test: existing `GridEvent` tests or add focused registry tests near V2 geometry

- [ ] **Step 1: Add render-time registry**

Create a tiny registry:

```ts
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export interface RegisteredWeekEvent {
  element: HTMLElement;
  event: Schema_GridEvent;
  kind: "timed" | "allDay";
}

const registry = new Map<string, RegisteredWeekEvent>();

export const registerWeekEventElement = (
  id: string,
  entry: RegisteredWeekEvent,
) => {
  registry.set(id, entry);
  return () => {
    if (registry.get(id)?.element === entry.element) {
      registry.delete(id);
    }
  };
};

export const getRegisteredWeekEvent = (id: string) => registry.get(id) ?? null;
```

- [ ] **Step 2: Add stable attributes to timed GridEvent root**

Add:

```tsx
data-week-event-id={event._id}
data-week-event-kind={event.isAllDay ? "allDay" : "timed"}
data-week-event-role="event"
```

Use a ref effect to register visible timed events if needed.

- [ ] **Step 3: Run tests**

Run:

```bash
bun test --cwd packages/web src/views/Week/components/Event/Grid
```

If that path has no direct tests, run the nearest Week grid rendering tests:

```bash
bun test --cwd packages/web src/views/Week/components/Grid/MainGrid/MainGridEvents.test.tsx src/views/Week/components/Draft/Draft.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2/geometry/eventRegistry.ts packages/web/src/views/Week/components/Event/Grid/GridEvent/GridEvent.tsx
git commit -m "feat(web): register week event elements for interaction v2"
```

## Task 3: Add Passive WeekInteractionBoundary

**Files:**
- Create: `packages/web/src/views/Week/interaction/v2/WeekInteractionBoundary.tsx`
- Create: `packages/web/src/views/Week/interaction/v2/WeekInteractionController.ts`
- Create: `packages/web/src/views/Week/interaction/v2/WeekInteractionSession.ts`
- Modify: `packages/web/src/views/Week/WeekView.tsx`
- Test: `packages/web/src/views/Week/interaction/v2/WeekInteractionController.test.ts`

- [ ] **Step 1: Create a passive controller**

Controller initially refuses ownership:

```ts
export class WeekInteractionController {
  canOwnPointerDown(): false {
    return false;
  }
}
```

- [ ] **Step 2: Add the boundary around `Grid`**

Insert near the Week grid boundary, inside `DraftProvider` and around the grid/content that contains `Grid`.

Boundary responsibilities:

- attach native capture-phase `pointerdown`.
- call controller.
- fall through to legacy behavior until the controller explicitly owns a session.

- [ ] **Step 3: Run no-behavior-change tests**

Run:

```bash
bun test --cwd packages/web src/views/Week/components/Grid/MainGrid/MainGridEvents.test.tsx src/views/Week/components/Draft/grid/hooks/useGridMouseMove.test.tsx src/views/Week/components/Draft/grid/hooks/useGridMouseUp.test.tsx
bun run type-check
bun run lint
```

- [ ] **Step 4: Run perf smoke**

Run:

```bash
bun run perf:week -- --scenario drag-timed-event,resize-timed-event --compare latest --label v2-passive-boundary
```

Expected:

- no meaningful behavior or perf change.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2/WeekInteractionBoundary.tsx packages/web/src/views/Week/interaction/v2/WeekInteractionController.ts packages/web/src/views/Week/interaction/v2/WeekInteractionSession.ts packages/web/src/views/Week/WeekView.tsx
git commit -m "feat(web): add passive week interaction v2 boundary"
```

## Task 4: Implement Pending Timed Drag Ownership

**Files:**
- Create: `packages/web/src/views/Week/interaction/v2/model/VisualDraft.ts`
- Create: `packages/web/src/views/Week/interaction/v2/model/TimedDragVisual.ts`
- Create: `packages/web/src/views/Week/interaction/v2/geometry/WeekLayoutCache.ts`
- Create: `packages/web/src/views/Week/interaction/v2/math/snap.ts`
- Create: `packages/web/src/views/Week/interaction/v2/math/timedDrag.ts`
- Modify: `packages/web/src/views/Week/interaction/v2/WeekInteractionController.ts`
- Test: V2 controller/math tests

- [ ] **Step 1: Add eligibility guard**

V2 may own only:

- existing timed event.
- form closed.
- not recurring.
- not pending.
- not resize handle.
- same visible week.

Everything else falls through to legacy.

- [ ] **Step 2: Copy current click/drag activation semantics**

Use current thresholds:

- movement threshold: `25px`.
- hold delay: `750ms`.

Pending session:

```ts
type PendingTimedDragSession = {
  eventId: string;
  kind: "timed";
  phase: "pending";
  pointerId: number;
  sourceElement: HTMLElement;
  startX: number;
  startY: number;
  startedAt: number;
};
```

- [ ] **Step 3: Add pure timed drag math**

Rules:

- preserve event duration.
- snap to the current grid step.
- compute day movement from cached column geometry.
- use epoch milliseconds or minutes, not live `dayjs` objects in RAF.

- [ ] **Step 4: Test state transitions**

Tests:

- quick click remains click.
- movement over threshold activates drag.
- hold delay activates drag.
- non-eligible event falls through to legacy.
- final visual draft matches current drag math for representative cases.

Run:

```bash
bun test --cwd packages/web src/views/Week/interaction/v2
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2
git commit -m "feat(web): add pending timed drag controller"
```

## Task 5: Add Cloned DOM Overlay For Timed Drag

**Files:**
- Create: `packages/web/src/views/Week/interaction/v2/dom/DragOverlay.ts`
- Create: `packages/web/src/views/Week/interaction/v2/dom/cloneGridEventNode.ts`
- Create: `packages/web/src/views/Week/interaction/v2/dom/placeholder.ts`
- Modify: `packages/web/src/views/Week/interaction/v2/WeekInteractionController.ts`
- Test: DOM helper tests and browser/perf scenarios

- [ ] **Step 1: Clone the source event DOM at activation**

Use cloning first for visual fidelity:

```ts
export function cloneGridEventNode(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-week-interaction-overlay", "true");
  clone.style.pointerEvents = "none";
  clone.style.margin = "0";
  return clone;
}
```

- [ ] **Step 2: Mount a single overlay node**

Overlay style:

```ts
overlay.style.position = "absolute";
overlay.style.left = `${sourceLeft}px`;
overlay.style.top = `${sourceTop}px`;
overlay.style.width = `${sourceWidth}px`;
overlay.style.height = `${sourceHeight}px`;
overlay.style.transform = `translate3d(${x}px, ${y}px, 0)`;
overlay.style.willChange = "transform";
overlay.style.pointerEvents = "none";
overlay.style.contain = "layout paint style";
```

- [ ] **Step 3: Placeholder original event once**

Use one attribute:

```ts
sourceElement.setAttribute("data-week-interaction-placeholder", "true");
```

Prefer opacity/visibility CSS, not `display: none`, so layout and lane geometry do not change during the interaction.

- [ ] **Step 4: Move overlay with transform only**

During active timed drag:

- no React state.
- no Redux dispatch.
- no layout reads after activation.
- only `transform` updates.

- [ ] **Step 5: Run tests and perf gate**

Run:

```bash
bun test --cwd packages/web src/views/Week/interaction/v2
bun run perf:week -- --scenario input-baseline,timed-drag-v2-sustained,timed-drag-v2-start-first-frame --compare latest --label v2-timed-drag-overlay
```

Required gate:

- React commits during motion: `0`.
- Redux dispatches during motion: `0`.
- unexpected DOM mutations: `0`.
- post-activation layout reads: `0`.
- sustained max frame gap: `input floor + 4ms` or better.
- long tasks: `0`.

If this gate fails, stop and fix the boundary. Do not move to commit, resize, all-day, smart scroll, or edge navigation.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2 packages/scripts/src/performance/week-view.perf.ts performance/week-view/README.md
git commit -m "feat(web): move timed drag through v2 overlay"
```

## Task 6: Commit Existing Timed Drag Once

**Files:**
- Create: `packages/web/src/views/Week/interaction/v2/commit/visualDraftToGridEvent.ts`
- Modify: `packages/web/src/views/Week/interaction/v2/WeekInteractionBoundary.tsx`
- Modify: `packages/web/src/views/Week/interaction/v2/WeekInteractionController.ts`
- Test: controller commit tests plus focused Week behavior tests

- [ ] **Step 1: Convert visual result to `Schema_GridEvent` only on pointerup**

Conversion preserves title, priority, recurrence metadata, and all non-time fields from the original event.

- [ ] **Step 2: Commit through existing boundary actions**

The controller must not dispatch save actions directly.

Boundary provides:

```ts
type CommitAdapter = {
  openExistingEvent(event: Schema_GridEvent): void;
  submitMovedEvent(
    event: Schema_GridEvent,
    meta: { hadFormOpenBeforeInteraction: boolean },
  ): void;
  isFormOpen(): boolean;
  isPendingEvent(eventId: string): boolean;
};
```

- [ ] **Step 3: Test click and save behavior**

Tests:

- unchanged press/release opens existing form once.
- moved existing event saves once.
- save requests during motion: `0`.
- save requests after pointerup: `1`.
- Redux/backend canonical state catches up after completion.

- [ ] **Step 4: Run verification**

Run:

```bash
bun test --cwd packages/web src/views/Week/interaction/v2 src/views/Week/components/Draft/hooks/actions/useDraftActions.test.ts src/views/Week/components/Draft/grid/hooks/useGridMouseUp.test.tsx
bun run type-check
bun run lint
bun run perf:week -- --scenario timed-drag-v2-click-unchanged,timed-drag-v2-pointerup-commit --compare latest --label v2-timed-drag-commit
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2 packages/web/src/views/Week/WeekView.tsx packages/scripts/src/performance/week-view.perf.ts performance/week-view/README.md
git commit -m "feat(web): commit timed drag v2 once on release"
```

## Task 7: Add Explicit Legacy Fallback Tests

**Files:**
- Modify: V2 controller tests
- Modify: existing Week focused tests as needed

- [ ] **Step 1: Prove excluded paths still use legacy behavior**

Add tests for:

- form open before drag.
- recurring event.
- all-day event.
- resize handle.
- smart-scroll drag.
- edge-navigation drag.
- pending event.

Expected:

- V2 refuses ownership.
- current legacy path still handles the interaction.

- [ ] **Step 2: Run focused tests**

Run:

```bash
bun test --cwd packages/web src/views/Week/interaction/v2 src/views/Week/components/Grid/MainGrid/MainGridEvents.test.tsx src/views/Week/components/Grid/AllDayRow/AllDayEvents.test.tsx src/views/Week/components/Draft/grid/hooks/useGridMouseMove.test.tsx src/views/Week/components/Draft/grid/hooks/useGridMouseUp.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/views/Week
git commit -m "test(web): lock week interaction v2 legacy fallbacks"
```

## Task 8: Add Form-Open-Before-Drag Support

**Files:**
- Modify: `WeekInteractionController.ts`
- Modify: `WeekInteractionBoundary.tsx`
- Modify: commit adapter tests

- [ ] **Step 1: Snapshot form state at pointerdown**

Session records:

- `formOpenAtPointerDown`
- `formEventIdAtPointerDown`

- [ ] **Step 2: Preserve current behavior exactly**

Before implementing, write tests for:

- form open + unchanged click.
- form open + drag activation.
- form open + moved existing event.
- no unintended save.
- form remains or reopens exactly as current behavior.

- [ ] **Step 3: Run focused tests and perf**

Run:

```bash
bun test --cwd packages/web src/views/Week/interaction/v2 src/views/Week/components/Draft/hooks/actions/useDraftActions.test.ts
bun run perf:week -- --scenario timed-drag-v2-sustained,timed-drag-v2-pointerup-commit --compare latest --label v2-form-open-drag
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2
git commit -m "feat(web): preserve form-open timed drag in v2"
```

## Task 9: Add Recurrence Support Through Existing Flow

**Files:**
- Modify: commit adapter
- Add focused recurrence tests

- [ ] **Step 1: Keep recurrence out until tests are written**

Write tests proving:

- recurring event move invokes existing recurrence update scope behavior.
- no direct controller dispatch to save/update slices.
- cancellation restores original state.
- save count is correct.

- [ ] **Step 2: Remove recurrence fallback only through adapter**

V2 may own recurrence only when the adapter calls the existing recurrence-aware path.

- [ ] **Step 3: Run verification**

Run relevant focused recurrence/Week tests plus:

```bash
bun run type-check
bun run lint
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/views/Week
git commit -m "feat(web): route recurring timed drag through v2 adapter"
```

## Task 10: Add Timed Resize

**Files:**
- Create: `packages/web/src/views/Week/interaction/v2/model/TimedResizeVisual.ts`
- Create: `packages/web/src/views/Week/interaction/v2/math/timedResize.ts`
- Modify: `WeekInteractionController.ts`
- Modify: `DragOverlay.ts` or split to `InteractionOverlay.ts`
- Test: timed resize tests and perf scenarios

- [ ] **Step 1: Add pure resize math parity tests**

Tests:

- bottom edge later/earlier.
- top edge earlier/later.
- top-to-bottom flip.
- bottom-to-top flip.
- minimum duration.
- resize while scrolled.
- unchanged resize does not save.
- changed resize saves once.

- [ ] **Step 2: Implement resize visual updates**

Rules:

- bottom edge: height changes.
- top edge: transformY and height change.
- edge flip: continuous visual, no jump.
- no React/Redux during motion.

- [ ] **Step 3: Run perf gate**

Run:

```bash
bun run perf:week -- --scenario input-baseline,timed-resize-v2-sustained-bottom,timed-resize-v2-sustained-top,timed-resize-v2-edge-flip --compare latest --label v2-timed-resize
```

Required:

- max frame gap: `input floor + 6ms` or better.
- no repeated gaps over `32ms` during edge flip.
- long tasks: `0`.
- React/Redux during motion: `0`.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2 packages/scripts/src/performance/week-view.perf.ts performance/week-view/README.md
git commit -m "feat(web): move timed resize through v2 controller"
```

## Task 11: Add All-Day Drag

**Files:**
- Create: `packages/web/src/views/Week/interaction/v2/math/allDayDrag.ts`
- Create: `packages/web/src/views/Week/interaction/v2/model/AllDayDragVisual.ts`
- Modify: controller and overlay as needed

- [ ] **Step 1: Add all-day drag parity tests**

Tests:

- drag across days.
- preserve span.
- week-boundary behavior matches current UX.
- fallback behavior remains for unsupported cases.

- [ ] **Step 2: Implement all-day drag**

Use horizontal transform and day-column snapping. Do not force timed math to handle all-day behavior.

- [ ] **Step 3: Run perf gate**

Run:

```bash
bun run perf:week -- --scenario all-day-drag-v2-sustained --compare latest --label v2-all-day-drag
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2 packages/scripts/src/performance/week-view.perf.ts performance/week-view/README.md
git commit -m "feat(web): move all-day drag through v2 controller"
```

## Task 12: Add All-Day Resize

**Files:**
- Create: `packages/web/src/views/Week/interaction/v2/math/allDayResize.ts`
- Create: `packages/web/src/views/Week/interaction/v2/model/AllDayResizeVisual.ts`
- Modify: controller and overlay as needed

- [ ] **Step 1: Add all-day resize parity tests before implementation**

Tests:

- left resize.
- right resize.
- left-to-right flip.
- right-to-left flip.
- one-day minimum.
- exclusive end-date behavior.
- week-boundary behavior.

- [ ] **Step 2: Implement all-day resize**

Preserve current date semantics exactly. This phase is a correctness phase first and a perf phase second.

- [ ] **Step 3: Run verification**

Run:

```bash
bun test --cwd packages/web src/views/Week/interaction/v2 src/views/Week/components/Grid/AllDayRow/AllDayEvents.test.tsx
bun run perf:week -- --scenario all-day-resize-v2-sustained --compare latest --label v2-all-day-resize
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/views/Week/interaction/v2 packages/scripts/src/performance/week-view.perf.ts performance/week-view/README.md
git commit -m "feat(web): move all-day resize through v2 controller"
```

## Task 13: Move Smart Scroll Into The Controller RAF Loop

**Files:**
- Modify: `WeekInteractionController.ts`
- Add: smart-scroll math/helpers under `interaction/v2`
- Modify: legacy smart-scroll hook only to disable itself for V2-owned sessions

- [ ] **Step 1: Add scroll state to session**

Session owns:

- scroll zone.
- velocity.
- last frame time.
- current scrollTop.

- [ ] **Step 2: Run scroll inside the same RAF loop**

No separate timer. No React state. No Redux dispatch.

- [ ] **Step 3: Test**

Tests:

- dragging near top scrolls upward.
- dragging near bottom scrolls downward.
- scroll clamps at top/bottom.
- snapped time remains correct after scroll.
- overlay does not drift.

- [ ] **Step 4: Benchmark**

Run:

```bash
bun run perf:week -- --scenario smart-scroll-drag-v2 --compare latest --label v2-smart-scroll
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/views/Week
git commit -m "feat(web): run week smart scroll in v2 controller"
```

## Task 14: Move Edge Navigation Into The Controller

**Files:**
- Modify: `WeekInteractionController.ts`
- Modify: `WeekInteractionBoundary.tsx`
- Modify: legacy edge navigation hook only to disable itself for V2-owned sessions

- [ ] **Step 1: Add edge dwell state**

Controller owns:

- side.
- enteredAt.
- progress.
- pending navigation flag.

- [ ] **Step 2: Keep React responsible for the actual week change**

Controller emits one request:

```ts
onRequestWeekNavigation("prev" | "next")
```

React changes the week, then the controller rebuilds the layout cache and continues the overlay session.

- [ ] **Step 3: Test**

Tests:

- one navigation per dwell.
- overlay survives week render.
- pointer capture/session survives.
- layout cache rebuilds.
- final save lands in correct week.

- [ ] **Step 4: Benchmark**

Run:

```bash
bun run perf:week -- --scenario edge-navigation-drag-v2 --compare latest --label v2-edge-navigation
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/views/Week
git commit -m "feat(web): run week edge navigation in v2 controller"
```

## Task 15: Remove Legacy Live-Motion Paths

Only do this after every V2 scenario passes.

**Files:**
- Narrow or remove: `useGridMouseMove.ts`
- Narrow or remove: `useGridMouseUp.ts`
- Remove live-motion dependence from old `InteractionEngine`
- Remove `GridDraft` live-position subscription if no longer needed
- Remove `applyDraftDomPosition` as a live motion primitive if no longer used
- Keep Draft/Form code for form editing and creation flows

- [ ] **Step 1: Search for remaining live-motion paths**

Run:

```bash
rg -n "subscribeMotion|applyDraftDomPosition|startDragging|startResizing|selectIsDrafting|useGridMouseMove|useGridMouseUp" packages/web/src/views/Week packages/web/src/ducks/events
```

- [ ] **Step 2: Remove only paths proven obsolete**

Do not remove form/create/edit draft behavior.

- [ ] **Step 3: Run full focused verification**

Run:

```bash
bun test --cwd packages/web src/views/Week
bun run type-check
bun run lint
bun run perf:week -- --compare latest --label v2-final
```

- [ ] **Step 4: Browser smoke**

Use Chrome on `http://localhost:9080/week`:

- drag timed event.
- resize timed event top and bottom.
- drag all-day event.
- resize all-day event left and right.
- smart-scroll drag.
- drag to previous and next week edge.
- click existing event opens form.
- moved existing event saves once.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/views/Week packages/scripts/src/performance/week-view.perf.ts performance/week-view/README.md
git commit -m "refactor(web): remove legacy week live-motion paths"
```

## Explicitly Avoid

- Do not use the current `InteractionEngine` as the V2 controller.
- Do not use `ActiveInteractionLayer` or a React portal for live V2 motion.
- Do not call `draftSlice.actions.startDragging`, `startResizing`, `startDnd`, or `swap` during pointer motion.
- Do not modify `useGridMouseMove.ts` or `useGridMouseUp.ts` in the first proof slice.
- Do not store `Schema_GridEvent` as the live motion state.
- Do not call `getEventPosition`, `dateCalcs.getDateByXY`, `dayjs`, or Redux selectors inside the RAF loop.
- Do not add all-day, resize, smart scroll, or edge navigation before timed drag passes hard counters.
- Do not bypass existing recurrence/save/form behavior.
- Do not start with virtualization. Measure heavy week render separately and revisit after controller ownership is clean.
- Do not accept “looks smooth” as success. Require counters, benchmarks, and browser smoke checks.

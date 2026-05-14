You’re right about the root issue: the architecture is still **React-driven for a problem that is fundamentally continuous + high-frequency**.

Right now:

* Mousemove → React state → context → re-render → layout → paint
* Even with guards, you still push **every interaction through React and Draft state**
* Example: `useGridMouseMove` fires on every mousemove and calls `drag/resize` which updates draft state via `setDraft`
* Draft state itself is plain `useState` (`isDragging`, `draft`, etc.)
* Edge navigation even uses React `useState` for pointer position and `progress` updates on a 16ms interval

That guarantees pressure during drag/resize, no matter how much memoization you add.

---

# 1. Highest-impact architecture direction

## 👉 Move to an **Interaction Engine (imperative, external store + RAF loop)**

**Core idea:**

> React renders snapshots.
> The interaction engine owns *motion*.

### Replace:

```
mousemove → React → Draft state → render → DOM
```

### With:

```
mousemove → InteractionEngine (refs/store)
          → requestAnimationFrame loop
          → direct DOM mutation (transform/position)
          → commit to React only on end
```

This is the same pattern used by:

* Figma
* Google Calendar
* Notion drag systems

---

## Concrete module boundary

Create a new subsystem:

```
/views/Week/interaction/
  InteractionEngine.ts
  interaction.store.ts
  interaction.types.ts
  controllers/
    drag.controller.ts
    resize.controller.ts
    edgeNavigation.controller.ts
    smartScroll.controller.ts
```

---

# 2. What should stay in React state

Keep React for **discrete state only**:

### ✅ Keep in React:

* Week navigation (`useWeek`)
* Redux events + selectors (already memoized)
* Form open/close
* Final draft commit (on mouse up)
* Sidebar / UI chrome

### ❌ Remove from React:

* `draft.startDate / endDate` during drag
* `isDragging / isResizing` (live)
* pointer position
* edge navigation progress
* smart scroll tracking

---

# 3. What moves to refs / external store

## New `interaction.store.ts`

```ts
type InteractionState = {
  mode: 'idle' | 'drag' | 'resize'
  pointer: { x: number; y: number }
  draft: {
    id: string
    start: number
    end: number
  }
  scroll: { velocityY: number }
  edge: { side: 'left' | 'right' | null; progress: number }
}
```

### Implementation:

* plain object + subscriptions
* exposed via `useSyncExternalStore` (React-safe)
* updated imperatively

---

# 4. How to structure interactions

## A. Drag / Resize

### Today:

* `mousemove → useGridMouseMove → actions.drag → setDraft`
* causes React updates every frame

### Rewrite:

```
pointerdown → engine.startDrag(eventId)

pointermove → engine.updatePointer(x,y)
             (NO React)

RAF loop:
  compute next position via dateCalcs
  mutate DOM (style.transform / top)
```

### Commit:

```
pointerup → engine.commit()
          → dispatch Redux update once
```

---

## B. Smart Scroll

Today:

* Hook + refs improvement already exists, but still React-tied

Rewrite:

* integrate into RAF loop

```
if pointer near top/bottom:
  scroll velocity += acceleration
scroll container imperatively
```

---

## C. Edge Navigation

Today:

* uses React state + timers + `setInterval`

Rewrite:

* move to engine

```
if pointer near edge:
  progress += deltaTime
  if progress > threshold:
    week.increment()
```

React only reads:

```
edge.progress (via useSyncExternalStore)
```

---

## D. Draft rendering

### Critical shift:

Instead of:

```
<GridDraft draft={draft} />
```

Move to:

```
<GridDraftShell />  // static React
engine mutates DOM inside it
```

---

# 5. How to keep behavior correct

You already have **great domain logic** in `useDraftActions`:

* snapping
* overflow prevention
* flip logic
* no-op guards

### Keep that logic — but extract pure functions:

```
/interaction/math/
  computeDragPosition.ts
  computeResize.ts
```

Then:

* Engine uses these functions
* React uses them for final commit consistency

---

## Key rule:

> **One source of truth for math, two consumers (engine + React).**

---

# 6. Tests to add first

## Priority 1: deterministic math

* drag snapping correctness
* resize flip behavior
* overflow edge cases

## Priority 2: engine lifecycle

* start → move → commit
* cancel → reset

## Priority 3: no extra renders

* assert React render count during drag is constant

---

# 7. New perf scenarios to add

Your harness already covers:

* drag / resize / load

Add:

### 🔥 High-value scenarios

1. **Long drag (3–5 seconds)**

   * measures sustained FPS

2. **Edge drag navigation**

   * includes week switch mid-drag

3. **Smart scroll drag**

   * pointer near bottom for continuous scroll

4. **Dense overlap drag**

   * heavy week + drag one event

5. **Resize jitter test**

   * rapid back-and-forth resize

---

# 8. Phased implementation plan

## Phase 1 — Extract math (SAFE)

* Move drag/resize calculations into pure functions
* No behavior change
* Benchmark

---

## Phase 2 — Introduce interaction store (SHADOW MODE)

* Create engine but don’t render from it yet
* Mirror draft updates into store

---

## Phase 3 — Read-only rendering from engine

* Render draft from engine store (not React state)
* Still update React draft for compatibility

---

## Phase 4 — Remove high-frequency React updates

* Stop calling `setDraft` in `drag/resize`
* Only update engine

---

## Phase 5 — DOM mutation optimization

* Move draft positioning to imperative updates
* Use `transform` instead of layout where possible

---

## Phase 6 — Edge + scroll migration

* Move `useDragEdgeNavigation` logic out of React
* Remove React timers

---

## Phase 7 — Cleanup

* Delete unused draft state fields:

  * `isDragging`
  * `dragStatus`
  * `resizeStatus`

---

# 9. Risks & rollback points

## Risk 1: visual drift

* mismatch between engine + React math

👉 Mitigation:

* shared pure math layer

---

## Risk 2: event commit bugs

* incorrect final dates

👉 Mitigation:

* always recompute on commit via React path

---

## Risk 3: lost accessibility / keyboard flows

👉 Keep:

* keyboard editing in React

---

## Rollback points:

* After Phase 2 (engine shadow mode)
* After Phase 4 (React updates removed)

Each phase is independently benchmarkable.

---

# 10. Strong /goal prompt for another agent

```
Goal: Replace React-driven drag/resize interactions in Week View with an imperative Interaction Engine to eliminate high-frequency React re-renders.

Constraints:
- Preserve existing UX exactly
- Reuse existing date calculation and draft logic
- All behavior must pass current interaction guide flows
- Each step must be benchmarked using week-view.perf.ts

Tasks:

1. Extract drag and resize math from useDraftActions into pure functions:
   - computeDragPosition
   - computeResize

2. Implement /views/Week/interaction/InteractionEngine.ts:
   - pointer tracking
   - RAF loop
   - internal state store

3. Implement interaction.store.ts using useSyncExternalStore:
   - expose snapshot for React reads
   - no React writes during movement

4. Replace useGridMouseMove:
   - route mousemove to engine only
   - remove setDraft calls during movement

5. Implement DOM mutation layer:
   - update draft element position via style.transform/top/height
   - avoid React renders during drag

6. Move edge navigation + smart scroll into engine:
   - remove React timers and state

7. On pointerup:
   - compute final event via shared math
   - dispatch Redux update

8. Benchmark after each phase:
   - drag timed event
   - resize timed event
   - heavy week load

Success criteria:
- Drag interaction produces near-zero React renders
- Max frame gap reduced significantly in perf harness
- No UX regression in interaction guide scenarios
```

---

# Bottom line

Your current architecture is **React-first**, but this problem is **interaction-first**.

> The winning move is not “optimize React more” —
> it’s **move the interaction loop out of React entirely**.

Once you do that, all the small optimizations you already made will finally compound instead of fighting the system.

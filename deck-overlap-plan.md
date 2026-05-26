# Implementation Plan — Deck overlap layout for Week timed events

Branch: `feature/timed-event-overlap-cascade`
Companion docs: [progress.md](./progress.md), prototype + verdict in
`packages/web/src/views/Prototype/NOTES.md`.

## 1. Verdict & goal

We prototyped three overlap treatments (`/prototype/overlap`) and chose **Deck**:
overlapping timed events are **left-anchored, uniform width, fanned to the right
by a fixed indent**, with each card's **top edge equal to its true start time**.
It won on legibility and "easy to understand."

Goal: replace the current fully-stacked "blob" in the **Week** timed grid with the
Deck layout. Day view is explicitly out of scope for this PR (see §11), but the
layout logic ships as a shared, pure util so Day can adopt it later.

### What "Deck" means (locked design from the prototype)

For a set of timed events that overlap on the same day, ordered **background-first**
(earliest start, then longest duration first → that event sits at the back):

- All events share the **same left anchor** as a non-overlapping event would, then
  each is indented right by `order * DECK_INDENT`.
- **Uniform width** across the group: `colWidth - insets - RIGHT_RESERVE - (n-1)*DECK_INDENT`,
  floored at a minimum.
- **z-index = order + 1**, so the most-indented (front) card is fully visible and
  the wider cards behind peek a thin strip on the **left**.
- **top / height unchanged** — never offset vertically (that was variant B's whole
  advantage: a card never lies about when it starts).
- A **right reserve** lane is kept open so there's empty grid to drag-create into.
- Non-overlapping events stay **full width** (no reserve, no indent).

### Visual treatment to carry over (applies to overlapping cards)

- **Dark gutter ring**, not a lightened border: `box-shadow: 0 0 0 ~0.75px <grid-bg>`
  so stacked cards read as distinct floating tiles. (A lightened border looked muddy
  on the pastel priority fills.)
- **One downward light source**: a soft tinted drop shadow that casts down; intensity
  rises when a card is raised (keyboard focus). Plus a 1px top inner highlight.
- **Time label gates on width** (only render when the card is wide enough, e.g. ≥~90px)
  so it never clips mid-string.

### Rejected in the prototype (do NOT build)

- **Hover-to-front raise** — a trap: to reach what's behind you must leave the hover,
  which re-covers it.
- **Count badge / "+N" collapse / click-to-expand** — the user found it visually noisy.
- **Sticky click-to-bring-forward mode** — clicking already means "edit"; don't add a
  competing click state.

The full story of how we got here — the research, the prototype, the variant
iterations, and the Deck decision — is recorded in
[progress.md → "Overlap layout prototype and Deck decision"](./progress.md).

## 2. Current state (verified on this branch)

| Fact | Location |
| --- | --- |
| Week timed grid runs **no** overlap algorithm; events render fully stacked at full width | `selectGridEvents` in `packages/web/src/ducks/events/selectors/event.selectors.ts` |
| Overlap algorithm (`adjustOverlappingEvents`) is wired into **Day view only** | `selectTimedDayEvents`, same file (~line 93-105) |
| Overlap algo mutates `isOverlapping`, `totalEventsInGroup`, `widthMultiplier` (`@deprecated`), `horizontalOrder` | `packages/web/src/common/utils/overlap/overlap.ts` |
| `getOverlappingStyles` in `overlap.ts` is **dead code** (no imports) | same file, lines ~67-92 |
| `position` schema fields | `packages/web/src/common/types/web.event.types.ts` (~28-36) |
| Position defaults (`isOverlapping:false, widthMultiplier:1, horizontalOrder:1, totalEventsInGroup:1`) | `gridEventDefaultPosition` in `packages/web/src/common/utils/event/event.util.ts` (~34-42) |
| Timed width/left math reads `widthMultiplier` + `horizontalOrder` + `isOverlapping` | `getTimedEventPosition` / `getTimedEventWidth` / `getAbsoluteLeftPosition` / `getRelativeLeftPosition` in `packages/web/src/common/utils/position/position.util.ts` |
| `GridEvent` applies `position.left/top/width/height`; zIndex only `isDragging ? LAYER_5 : LAYER_1`; no border | `packages/web/src/views/Week/components/Event/Grid/GridEvent/GridEvent.tsx` (~143-157) |
| Test currently **locks in** equal left/width + no `data-week-event-overlap` for overlapping Week events | `packages/web/src/views/Week/components/Grid/MainGrid/MainGrid.test.tsx` (~474-508) |

Implication: the Week and Day overlap paths are independent. We can add Deck to Week
without changing Day, as long as the new geometry is keyed off a **new, additive**
field rather than overloading `isOverlapping`/`widthMultiplier` (which Day's
equal-split still uses).

## 3. Architecture & integration approach

Additive and decoupled from Day's equal-split:

1. **New `position.deck` field** (nullable). Set only by the Week path. Its presence
   switches `position.util.ts` into Deck math; its absence preserves all existing
   behavior (Day equal-split, single events, all-day).
2. **New pure layout util** `weekTimedOverlapLayout.ts` — groups Week timed events
   **per day column**, finds transitive overlap groups, orders background-first, and
   writes `position.deck = { order, groupSize }`. Mirrors the prototype's
   `groupByOverlap` + `orderForCascade`. Pure + unit-tested (the removed
   `timedOverlapLayout.test.ts` is a template).
3. **Wire into `selectGridEvents`** (Week selector) only.
4. **`position.util.ts`**: a Deck branch in `getTimedEventPosition` computes uniform
   width, left indent, and a `zIndex`. `getEventPosition`'s return type gains an
   optional `zIndex`.
5. **`GridEvent`**: consume `position.zIndex`; apply the gutter ring + shadow + top
   highlight when the event is in a deck group; raise z-index on **keyboard focus**.
6. **Constants** in `layout.constants.ts`.

Why a new field instead of reusing `horizontalOrder`/`totalEventsInGroup`: those drive
Day's equal-split math in the same shared `position.util.ts`. A separate `deck` field
keeps the two layouts from fighting over the same code path and makes the Week change
purely additive (lower risk, no Day test churn).

## 4. Data model changes

**`packages/web/src/common/types/web.event.types.ts`** — add to the `position` object:

```ts
deck: z
  .object({
    order: z.number(),      // 0-based; 0 = backmost, groupSize-1 = front
    groupSize: z.number(),  // number of events overlapping in this day stack
  })
  .nullable()
  .default(null),
```

**`packages/web/src/common/utils/event/event.util.ts`** — add `deck: null` to
`gridEventDefaultPosition` so every assembled event has a defined value.

## 5. Implementation tasks (ordered, TDD where practical)

### Task 1 — Constants
`packages/web/src/views/Week/layout.constants.ts`:
- `DECK_INDENT = 8` (px the fan shifts right per depth; prototype used 10 on a 200px col)
- `DECK_RIGHT_RESERVE = 24` (px kept open on the right for drag-create)
- `DECK_MIN_WIDTH = 72` (floor; or reuse existing `EVENT_WIDTH_MINIMUM = 80` — decide during tuning)

All three are tuning dials; values above are starting points to verify in-browser.

### Task 2 — Schema + defaults
- Add `position.deck` (Task in §4) to the Zod schema.
- Add `deck: null` to `gridEventDefaultPosition`.
- Run `bun type-check` and fix any exhaustive object literals that now need `deck`.

### Task 3 — Pure layout util (write test first)
New file `packages/web/src/common/utils/overlap/weekTimedOverlapLayout.ts`:

```ts
// applyWeekTimedOverlapLayout(events): returns a new array with position.deck set.
// - deep-copy events (don't mutate, like adjustOverlappingEvents)
// - bucket by start day (startIndex / day-of-week) — events on different days
//   never visually overlap, so they never share a deck
// - within each day bucket, build transitive overlap groups (a.start < b.end && a.end > b.start)
// - groups of size 1 -> deck = null
// - groups of size >1 -> order background-first (start asc, then end desc),
//   set deck = { order: i, groupSize: n }
```

Test `weekTimedOverlapLayout.test.ts`:
- two same-day overlaps → `{order:0,groupSize:2}` / `{order:1,groupSize:2}`, background-first
- three transitive overlaps → groupSize 3, correct order
- two events on **different days** at the same clock time → both `deck:null` (no shared stack)
- non-overlapping same-day events → `deck:null`
- chain A∩B, B∩C, A∌C → all one group of 3 (transitive)
- ordering: longest/earliest gets `order:0`

### Task 4 — Wire into the Week selector
`event.selectors.ts` → `selectGridEvents`: pass the mapped `weekEvents` through
`applyWeekTimedOverlapLayout(...)` before returning. Do **not** touch
`selectTimedDayEvents`.

### Task 5 — Deck geometry in `position.util.ts` (write test first)
`getTimedEventPosition`: when `event.position.deck` is set, compute:
- `order = deck.order`, `n = deck.groupSize`
- `width = max(DECK_MIN_WIDTH, colWidths[startIndex] - 2*TIMED_EVENT_COLUMN_INSET - DECK_RIGHT_RESERVE - (n-1)*DECK_INDENT)`
- `left = <existing non-overlap base left> + order * DECK_INDENT`
  (use the existing date-based left; skip the legacy `horizontalOrder`/`isOverlapping`
  offset path — Week deck events keep `isOverlapping:false`)
- `zIndex = order + 1`

When `deck` is null, behavior is unchanged. Add `zIndex?: number` to the object
`getEventPosition` returns.

Unit tests in `position.util` spec: deck width shrinks by `(n-1)*DECK_INDENT`, left
increases by `order*DECK_INDENT`, width floors at `DECK_MIN_WIDTH`, zIndex = order+1,
non-deck events unchanged.

### Task 6 — `GridEvent` rendering
`GridEvent.tsx`:
- `zIndex: isDragging ? ZIndex.LAYER_5 : (position.zIndex ?? ZIndex.LAYER_1)`
- When `event.position.deck` is set, add the **gutter ring + downward shadow + top
  highlight** (via `style`/`className`). Leave non-deck events visually unchanged.
- **Keyboard focus raise**: track focus (`onFocus`/`onBlur` local state, or
  `:focus-visible` driving a raised z-index) so a Tab/`I`-targeted buried card lifts
  to the front and its focus ring + content are fully visible. This is the real-app
  analog of the prototype's click-focus, triggered by genuine focus (not hover).
- Keep the time-label width gate (don't render the time row below a width threshold).
- Preserve all existing a11y wiring: `aria-label`, `role="button"`,
  `data-calendar-event-target`, `data-calendar-event-type`, `data-event-id`,
  resize handles.

### Task 7 — Update the existing component test
`MainGrid.test.tsx` ("renders overlapping saved timed events without resting stack
offsets"): this asserts equal left/width — it now codifies the **old** blob behavior.
Rewrite it to assert Deck: overlapping same-day events have **staggered left**
(`order*DECK_INDENT` apart), **uniform width**, and **increasing zIndex**; a
non-overlapping event stays full width; keyboard focus raises the focused card.

### Task 8 — Manual verification in the real Week grid
Run the app, create overlapping events (2, 3, 5), confirm: left-anchored fan, true
tops, readable front card, peeks on the left, open right lane, gutter separation,
focus-raise on Tab, drag-create still works in the reserved lane.

### Task 9 — Delete the prototype
Per `packages/web/src/views/Prototype/NOTES.md` cleanup checklist:
- delete `packages/web/src/views/Prototype/`
- remove the `PROTOTYPE_OVERLAP` dev route in `packages/web/src/routers/index.tsx`
- remove `PROTOTYPE_OVERLAP` from `packages/web/src/common/constants/routes.ts`

## 6. Edge cases & decisions

- **Per-day grouping is mandatory.** Two events at 10am on Tue and Wed must not share
  a deck. Group by start day, then by time overlap. (The prototype was single-day so
  this is new.)
- **Drafts stay full width + on top.** A draft being created/edited already renders at
  full column width (`isDraft` path); it should not join the deck. After commit, the
  next layout pass folds it in. Keep `deck:null` for the draft.
- **Drag/resize of a deck event:** while a card is in motion (`motionMode` dragging/
  resizing), render it full width + top z (don't constrain to its deck slot) so the
  user sees what they're moving. Re-layout on settle. Verify the motion path in the
  Week interaction code passes geometry that bypasses the deck branch (treat like a
  draft for the duration of motion).
- **Buried-card drag/resize is limited** (handles are covered by cards in front).
  Accepted tradeoff for this PR: reach a buried card via its left peek (click → edit)
  or keyboard focus (raises it). Document; revisit if it bites.
- **6+ overlaps:** widths hit `DECK_MIN_WIDTH` and front cards begin overlapping each
  other again. Accepted — the count-badge/collapse answer was rejected. Note it; a
  future "+N" or expand could be added if real calendars hit this.
- **Multi-day timed events** (rare): group by start day; a timed event spanning days is
  positioned by its start day. Don't over-engineer.
- **All-day events:** unchanged. Deck applies to timed only.

## 7. Testing plan

- `weekTimedOverlapLayout.test.ts` — pure grouping/order/per-day (Task 3).
- `position.util` spec — deck width/left/zIndex math (Task 5).
- `MainGrid.test.tsx` — rewritten overlap assertions + focus-raise (Task 7).
- Focused run:
  `bun test --cwd packages/web src/common/utils/overlap src/common/utils/position src/views/Week/components/Grid/MainGrid/MainGrid.test.tsx`
- `bun type-check`, `bun lint`, `git diff --check`.
- Manual browser pass (Task 8).

## 8. Accessibility notes

- Keyboard focus must raise the focused card to the front (z-index) so the
  `focus-visible:ring` and content are not occluded.
- The existing `I` (focus first visible) / `M` (edit targeted) shortcuts keep working —
  with Deck, all cards are at least partially visible (left peek), so "first visible"
  is well-defined.
- `aria-label` already encodes title + time range; preserve it so screen-reader users
  get full info regardless of visual occlusion.

## 9. Constants summary (tuning dials)

`layout.constants.ts`: `DECK_INDENT` (≈8px), `DECK_RIGHT_RESERVE` (≈24px),
`DECK_MIN_WIDTH` (≈72px, or reuse `EVENT_WIDTH_MINIMUM`). Verify against real column
widths (which vary — "today" is wider via `FLEX_TODAY`).

## 10. Out of scope (deliberately)

- Day view overlap (stays equal-split; unify in the future shared-grid work).
- All-day overlap.
- Count badge / collapse / expand (rejected).
- Hover-to-front and sticky click-to-bring-forward (rejected).
- Removing the dead `getOverlappingStyles` (separate cleanup; optional).

## 11. Future follow-ups

- Adopt the shared `weekTimedOverlapLayout` in Day view during the Day/Week shared-grid
  extraction, retiring the `widthMultiplier`/`horizontalOrder` equal-split path and the
  dead `getOverlappingStyles`.
- Reconsider a density affordance only if real calendars regularly exceed ~5 concurrent
  timed events.

## 12. Risk register

| Risk | Mitigation |
| --- | --- |
| Breaking Day view | New `deck` field is additive; Day path untouched and unit-guarded |
| Per-day grouping bug (cross-day decks) | Explicit per-day bucketing + a cross-day test case |
| Motion path still constrains a dragged card to its slot | Verify + bypass deck during `dragging`/`resizing` |
| Column-width variance breaks fixed-px indent/reserve | Tune constants against `FLEX_TODAY`/`FLEX_TMRW` columns in-browser |
| Existing overlap test contradicts new behavior | Rewrite it in Task 7 as part of the change |

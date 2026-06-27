# Day Drag Form Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every successfully moved Day event save immediately without reopening or retaining an event form, while preserving click-to-edit for no-movement interactions.

**Architecture:** Keep the behavior at the `DayInteractionCoordinator` commit boundary. A moved interaction will update the event, close the floating form, and discard the transient Redux draft; an unchanged interaction will continue through `openDayCalendarEvent`.

**Tech Stack:** React 18, Redux Toolkit, Bun test, React Testing Library, TypeScript

---

## File structure

- Modify `packages/web/src/views/Day/interaction/DayInteractionCoordinator.tsx`: enforce the moved-interaction form and draft lifecycle.
- Modify `packages/web/src/views/Day/interaction/DayInteractionCoordinator.test.tsx`: capture moved and no-movement behavior at the coordinator boundary.

### Task 1: Capture the moved-drag regression

**Files:**
- Test: `packages/web/src/views/Day/interaction/DayInteractionCoordinator.test.tsx:207-242`

- [ ] **Step 1: Replace the old reopen expectation with the required save-and-close behavior**

```tsx
it("saves a moved event without reopening its previously open form", async () => {
  const { dispatch, store } = renderCoordinator();
  const source = screen.getByTestId("timed-source");
  const child = screen.getByTestId("timed-child");

  openFloatingForm(source);
  fireEvent.pointerDown(child, {
    button: 0,
    clientX: 160,
    clientY: 160,
    isPrimary: true,
    pointerId: 1,
  });
  fireEvent.pointerMove(window, {
    clientX: 160,
    clientY: 220,
    pointerId: 1,
  });
  flushFrame();
  fireEvent.pointerUp(window, {
    clientX: 160,
    clientY: 220,
    pointerId: 1,
  });

  await waitFor(() => {
    expect(
      dispatch.mock.calls.some(
        ([action]) => action.type === editEventSlice.actions.request.type,
      ),
    ).toBe(true);
  });
  expect(isOpenAtCursor(CursorItem.EventForm)).toBe(false);
  expect(store.getState().events.draft.event).toBeNull();
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
bun test --cwd packages/web src/views/Day/interaction/DayInteractionCoordinator.test.tsx
```

Expected: FAIL because the current coordinator reopens the form, does not dispatch `editEventSlice.actions.request`, and retains the moved event as the Redux draft.

- [ ] **Step 3: Commit the failing regression test**

```bash
git add packages/web/src/views/Day/interaction/DayInteractionCoordinator.test.tsx
git commit -m "test(web): cover day drag form lifecycle"
```

### Task 2: Implement the moved-interaction lifecycle

**Files:**
- Modify: `packages/web/src/views/Day/interaction/DayInteractionCoordinator.tsx:106-124`

- [ ] **Step 1: Remove the form-open branch and clear transient state after saving**

```tsx
const commitSavedMutation = (
  result:
    | DayAllDayDragCommitResult
    | DayAllDayResizeCommitResult
    | DayTimedDragCommitResult
    | DayTimedResizeCommitResult,
) => {
  if (!result.hasMoved) {
    openDayCalendarEvent(result.event);
    return;
  }

  closeFloatingAtCursor();
  updateEvent({ event: result.event }, true);
  dispatch(draftSlice.actions.discard(undefined));
};
```

The discard must occur after `updateEvent`, because `useUpdateEvent` synchronously stores the moved event in the draft before dispatching the edit request.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run:

```bash
bun test --cwd packages/web src/views/Day/interaction/DayInteractionCoordinator.test.tsx
```

Expected: all Day coordinator tests PASS. The existing jsdom CSS parse warning may still print before the passing summary.

### Task 3: Preserve click-to-edit and no-form drag behavior

**Files:**
- Test: `packages/web/src/views/Day/interaction/DayInteractionCoordinator.test.tsx`

- [ ] **Step 1: Add a no-movement click regression test**

```tsx
it("opens the event form when pointer interaction does not move the event", async () => {
  const { store } = renderCoordinator();
  const child = screen.getByTestId("timed-child");

  fireEvent.pointerDown(child, {
    button: 0,
    clientX: 160,
    clientY: 160,
    isPrimary: true,
    pointerId: 1,
  });
  fireEvent.pointerUp(window, {
    clientX: 160,
    clientY: 160,
    pointerId: 1,
  });

  await waitFor(() => {
    expect(isOpenAtCursor(CursorItem.EventForm)).toBe(true);
  });
  expect(store.getState().events.draft.event?._id).toBe(timedEvent._id);
});
```

- [ ] **Step 2: Add a moved-drag-without-open-form assertion**

Use the existing pointer sequence without `openFloatingForm(source)` and assert:

```tsx
expect(isOpenAtCursor(CursorItem.EventForm)).toBe(false);
expect(store.getState().events.draft.event).toBeNull();
expect(
  dispatch.mock.calls.some(
    ([action]) => action.type === editEventSlice.actions.request.type,
  ),
).toBe(true);
```

- [ ] **Step 3: Run the focused coordinator test**

Run:

```bash
bun test --cwd packages/web src/views/Day/interaction/DayInteractionCoordinator.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 4: Commit the implementation and completed regression coverage**

```bash
git add packages/web/src/views/Day/interaction/DayInteractionCoordinator.tsx packages/web/src/views/Day/interaction/DayInteractionCoordinator.test.tsx
git commit -m "fix(web): keep day event form closed after drag"
```

### Task 4: Verify and publish

**Files:**
- No product file changes expected.

- [ ] **Step 1: Run affected web tests**

```bash
bun test --cwd packages/web src/views/Day/interaction src/views/Week/components/Draft
```

Expected: all affected tests PASS.

- [ ] **Step 2: Run React quality diagnostics**

Run the repository React Doctor workflow and address only regressions caused by this change.

- [ ] **Step 3: Run static verification**

```bash
bun type-check
bun lint
```

Expected: both commands exit successfully.

- [ ] **Step 4: Push and open a draft PR**

```bash
git push origin fix/1887-form-open
gh pr create --draft --title "fix(web): keep day event form closed after drag" --body "Closes #1887"
```

Expected: the branch is pushed and GitHub returns the draft PR URL.

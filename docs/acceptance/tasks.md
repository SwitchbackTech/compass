# Tasks

This runbook covers the task management UX in Compass.

## Scope

Use this guide to validate:

- creating tasks from the keyboard
- creating tasks with the mouse
- marking tasks complete and incomplete
- deleting tasks and undoing deletions
- reordering tasks by drag and drop
- moving tasks to adjacent days

Do not use this guide to validate:

- event management (see `events.md`)
- keyboard navigation between views (see `shortcuts.md`)

## Setup

1. Start the app with `bun run dev:web`.
2. Navigate to the Day view (`/day`).
3. Tasks are stored locally in the browser (IndexedDB) and do not require a backend connection.

Helpful notes:

- Tasks are always tied to a specific date. There is no undated or Someday task concept — that is handled by Someday events.
- Completed tasks display with reduced opacity and are sorted below incomplete tasks in the list.
- Undo is available immediately after a deletion via toast or Cmd+Z / Ctrl+Z.
- Keyboard shortcuts using `Mod` map to Command on Mac and Control on Windows/Linux.

---

## Scenario 1: Create A Task From The Keyboard

### UX

In Day view, pressing `C` opens a new inline task input at the bottom of the task list. The user types a title and presses Enter to save.

### Steps

1. Navigate to `/day`.
2. Press `C` (while not focused in any input).
3. Type a task title.
4. Press Enter.

### Expected Results

- An inline task input appears at the bottom of the task list.
- Pressing Enter saves the task and it appears in the list.
- The task persists after a page reload.
- Pressing Escape instead of Enter cancels the input without creating a task.

---

## Scenario 2: Create A Task With The Mouse

### UX

Clicking the "Create Task" button in the Day view task panel opens the same inline input.

### Steps

1. Navigate to `/day`.
2. Click the Create Task button in the task panel.
3. Type a task title.
4. Press Enter.

### Expected Results

- The inline task input appears.
- The saved task appears in the list.
- The task persists after a page reload.

---

## Scenario 3: Mark A Task Complete

### UX

Each task has a checkbox (circle icon). Clicking it or pressing Enter while the checkbox is focused marks the task as completed. Completed tasks move below incomplete tasks and appear faded.

### Steps

1. Create at least one task.
2. Click the checkbox on the task.

### Expected Results

- The task status changes to completed.
- The task moves below any remaining incomplete tasks.
- The task appears with reduced opacity (faded).
- The completed state persists after a page reload.

---

## Scenario 4: Mark A Task Incomplete (Toggle Back)

### UX

Clicking the checkbox of a completed task toggles it back to incomplete.

### Steps

1. Mark a task as complete (see Scenario 3).
2. Click the checkbox on the completed task.

### Expected Results

- The task status returns to incomplete.
- The task moves back above completed tasks.
- The opacity returns to full.
- The change persists after a page reload.

---

## Scenario 5: Delete A Task

### UX

Pressing Delete or Backspace while a task checkbox is focused removes the task. A brief undo opportunity is shown.

### Steps

1. Focus a task checkbox (click or tab to it).
2. Press Delete or Backspace.

### Expected Results

- The task disappears from the list.
- An undo toast notification appears.
- The task does not reappear after a page reload if undo is not used.

---

## Scenario 6: Undo A Task Deletion

### UX

Immediately after deleting a task, pressing Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) restores it.

### Steps

1. Delete a task (see Scenario 5).
2. Immediately press Cmd+Z (Mac) or Ctrl+Z (Windows/Linux).

### Expected Results

- The deleted task reappears in the list with its original title, status, and position.
- The undo toast dismisses.

---

## Scenario 7: Reorder Tasks By Drag And Drop

### UX

Tasks can be dragged within the list to change their order. Incomplete and completed tasks each reorder independently within their own group.

### Steps

1. Create three or more incomplete tasks.
2. Click and hold on the first task.
3. Drag it below the third task.
4. Release.

### Expected Results

- The task list reorders in real time while dragging.
- On release, the new order is reflected in the list.
- The order persists after a page reload.
- Keyboard drag instructions appear for screen-reader users: "use arrow keys to move, space to drop, or escape to cancel."

---

## Scenario 8: Move A Task To The Next Day

### UX

Pressing Ctrl+Meta+ArrowRight (Mac) or the equivalent moves the focused task to the following calendar date.

### Steps

1. Navigate to `/day` on a date that is not the last day of the month.
2. Focus a task checkbox.
3. Press Ctrl+Meta+ArrowRight.

### Expected Results

- The task disappears from the current day's list.
- Navigating to the next day shows the task there.
- The move persists after a page reload.

---

## Scenario 9: Move A Task To The Previous Day

### UX

Pressing Ctrl+Meta+ArrowLeft moves the focused task to the previous calendar date.

### Steps

1. Navigate to `/day` on a date that is not the first day of the month.
2. Focus a task checkbox.
3. Press Ctrl+Meta+ArrowLeft.

### Expected Results

- The task disappears from the current day's list.
- Navigating to the previous day shows the task there.
- The move persists after a page reload.

---

## Focused Regression Checks

If time is limited, run these checks before shipping task-related changes:

1. `C` in Day view opens an inline task input; Enter saves; Escape cancels.
2. Completed tasks move below incomplete tasks and appear faded.
3. Toggling a completed task back to incomplete restores its position and full opacity.
4. Delete/Backspace on a focused task checkbox removes the task and shows an undo toast.
5. Cmd+Z / Ctrl+Z restores the deleted task with its original properties.
6. Drag-and-drop reordering persists after a page reload.
7. Ctrl+Meta+ArrowRight moves a task to the next day; Ctrl+Meta+ArrowLeft to the previous day.

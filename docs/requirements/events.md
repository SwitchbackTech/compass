# Events

This runbook covers the core event management UX in Compass.

## Scope

Use this guide to validate:

- creating timed events on the calendar grid
- creating all-day events
- creating Someday (Week) and Someday (Month) events
- editing events via the form
- changing event priority via the right-click context menu
- deleting standalone events
- dragging events to a new time slot
- resizing events
- moving events to the Someday sidebar by drag
- scheduling Someday events onto the grid by drag
- duplicating events (Cmd+D)
- undoing an event deletion (Cmd+Z / Ctrl+Z)

Do not use this guide to validate:

- recurring event create, edit, and delete (see `recurring-events.md`)
- Google Calendar sync behavior (see `google-sync.md`)

## Setup

1. Start the app with `bun run dev:web`.
2. Start the backend if you need events to persist across page reloads.
3. Log in with any account that does not need Google connected (password-only is fine).
4. Navigate to the Week view (`/week`) or Day view (`/day`) depending on the scenario.

Helpful notes:

- All event interactions require a loaded calendar grid. If the grid is blank, reload and wait for events to fetch.
- The right-click context menu on an event opens a small overlay. It closes if you click elsewhere.
- The Someday sidebar must be open (toggle with `[`) for sidebar drag scenarios.

---

## Scenario 1: Create A Timed Event By Clicking The Grid

### UX

Clicking an empty hour slot on the calendar grid should open a new event form with the start time pre-filled to the slot that was clicked.

### Steps

1. Navigate to `/week`.
2. Click an empty slot in the hourly grid (for example, the 2 PM row on Wednesday).
3. Enter a title in the form.
4. Submit the form.

### Expected Results

- The event form opens with the start time set to the clicked slot.
- After submitting, the event block appears on the grid at the correct time.
- The event persists after a page reload.

---

## Scenario 2: Create An All-Day Event

### UX

Clicking the all-day row at the top of the week grid should open a new event form pre-configured as an all-day event.

### Steps

1. Navigate to `/week`.
2. Click in the all-day row at the top of the grid for a specific day.
3. Enter a title.
4. Submit the form.

### Expected Results

- The event form opens with the all-day toggle enabled.
- No start/end time fields are shown in the form.
- After submitting, the event appears in the all-day row for that day.
- The event persists after a page reload.

---

## Scenario 3: Create A Someday (Week) Event

### UX

The Someday sidebar holds unscheduled events not tied to a specific date. Users can create a Someday Week event from the sidebar or command palette. The sidebar enforces a limit of 9 Someday Week events at a time.

### Steps

1. Open the sidebar with `[` if it is not already open.
2. Press `Shift+W` (or use the command palette → Create Week Event).
3. Enter a title in the form and submit.
4. Repeat until you have 9 Someday Week events.
5. Attempt to create a 10th Someday Week event.

### Expected Results

- Each new event appears in the Week section of the Someday sidebar.
- On the 10th attempt, an error message appears: "Sorry, you can only have 9 unscheduled events per week."
- No 10th event is created.

---

## Scenario 4: Create A Someday (Month) Event

### UX

Someday Month events appear in the Month section of the Someday sidebar. The same 9-event limit applies per month.

### Steps

1. Open the sidebar with `[`.
2. Press `Shift+M` (or use the command palette → Create Month Event).
3. Enter a title and submit.
4. Confirm the event appears in the Month section of the sidebar (below the Week section).

### Expected Results

- The new event appears in the Month section of the Someday sidebar.
- The event does not appear on the calendar grid.

---

## Scenario 5: Edit An Event Via The Form

### UX

Right-clicking an event and selecting Edit (or clicking the event directly) opens the event form pre-filled with the event's current values. The user can change any field and save.

### Steps

1. Create or locate an existing timed event on the grid.
2. Right-click the event and select Edit (or click the event).
3. Change the title.
4. Change the start time.
5. Change the priority to a different value.
6. Submit the form.

### Expected Results

- The event block on the grid updates immediately to reflect the new title, time, and priority color.
- Changes persist after a page reload.

---

## Scenario 6: Change Event Priority Via Right-Click Context Menu

### UX

Right-clicking an event opens a context menu with a quick priority picker. This is faster than opening the full form.

### Steps

1. Right-click a timed event on the grid.
2. Select a different priority from the context menu (Work, Self, or Relations).
3. Click elsewhere to close the menu.

### Expected Results

- The event block color updates immediately to match the new priority.
- No full form is required.
- The priority change persists after a page reload.

---

## Scenario 7: Delete A Standalone Event

### UX

Deleting a standalone event (non-recurring) removes it immediately. No scope dialog appears.

### Steps

1. Right-click a standalone event on the grid.
2. Select Delete from the context menu.

### Expected Results

- The event disappears from the grid immediately.
- No "Apply Changes To" scope dialog appears.
- The event does not reappear after a page reload.

---

## Scenario 8: Drag An Event To A New Time Slot

### UX

Users can click-hold and drag an event block to a new time or date. The event snaps to 30-minute grid intervals. The event updates when dropped.

### Steps

1. Locate a timed event on the week grid.
2. Click and hold on the event body (not the top or bottom resize handle).
3. Drag the event to a different day and time slot.
4. Release to drop.

### Expected Results

- While dragging, the event block highlights and follows the cursor.
- A ghost or preview shows the target position.
- On release, the event moves to the new slot.
- The updated position persists after a page reload.
- If the event has a pending backend operation (cursor shows wait), drag is blocked.

---

## Scenario 9: Resize An Event

### UX

Hovering near the top or bottom edge of an event reveals a resize cursor. Dragging from the bottom edge changes the end time; dragging from the top edge changes the start time.

### Steps

1. Locate a timed event on the grid.
2. Hover over the bottom edge of the event until the cursor changes to a row-resize cursor.
3. Click and drag downward to extend the event by approximately 30 minutes.
4. Release.
5. Repeat from the top edge, dragging upward to move the start time earlier.

### Expected Results

- The event block grows or shrinks in real time while dragging.
- On release, the event reflects the new start or end time.
- The start time cannot be dragged past the end time.
- Changes persist after a page reload.

---

## Scenario 10: Schedule A Someday Event By Dragging To The Grid

### UX

Someday events can be dragged from the sidebar onto a specific day and time on the calendar grid, converting them into scheduled events.

### Steps

1. Open the sidebar with `[`.
2. Locate a Someday event in the sidebar.
3. Drag it from the sidebar and drop it onto a specific time slot on the calendar grid.

### Expected Results

- The event disappears from the sidebar.
- The event appears on the grid at the dropped time.
- The event is now a regular scheduled event and persists after a page reload.

---

## Scenario 11: Duplicate An Event (Cmd+D)

### UX

With an event form open, pressing Cmd+D (Mac) or Ctrl+D (Windows) creates a copy of the event with the same properties on the same date. The user can then move or edit the duplicate.

### Steps

1. Open an event form by clicking or right-clicking an existing event and selecting Edit.
2. Press Cmd+D (Mac) or Ctrl+D (Windows).
3. Close the original form.

### Expected Results

- A new event appears on the grid with the same title, time, priority, and description as the original.
- Both the original and the duplicate are present on the grid.
- The duplicate persists after a page reload.

---

## Scenario 12: Undo An Event Deletion (Cmd+Z / Ctrl+Z)

### UX

After deleting an event, a brief undo opportunity is available. Pressing Cmd+Z (Mac) or Ctrl+Z (Windows/Linux), or using the undo toast, restores the event.

### Steps

1. Delete a standalone event via the right-click context menu.
2. Immediately press Cmd+Z (Mac) or Ctrl+Z (Windows/Linux).

### Expected Results

- The deleted event reappears on the grid.
- The restored event retains all original properties.

---

## Focused Regression Checks

If time is limited, run these checks before shipping event-related changes:

1. Clicking an empty grid slot opens a form with the correct start time pre-filled.
2. Submitting a new event places it on the grid and it survives a page reload.
3. All-day events appear in the all-day row, not the hourly grid.
4. Someday Week and Month event creation is blocked at 9 events each with a clear error message.
5. Editing an event updates the grid block immediately.
6. Right-click priority change updates the event color without opening the full form.
7. Deleting a standalone event shows no scope dialog.
8. Dragging an event to a new slot moves it and persists after reload.
9. Resizing an event updates the duration and persists after reload.
10. Dragging to/from the Someday sidebar correctly converts events between scheduled and unscheduled states.
11. Cmd+D duplicates an event with the same properties.
12. Cmd+Z / Ctrl+Z after deletion restores the event.

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
- failed-write optimistic rollback
- Week/Day navigation cache reuse
- Google revocation and SSE-driven query refresh
- picking a target calendar when creating/duplicating events, and read-only
  calendar/busy-event behavior

Do not use this guide to validate:

- recurring event create, edit, and delete (see `recurring-events.md`)
- Google Calendar sync behavior (see `google-sync.md`)

## Setup

1. Start the app with `bun run dev:web`.
2. Start the backend if you need events to persist across page reloads.
3. Log in with any account that does not need Google connected (password-only is fine).
4. Navigate to the Week view (`/week`) or Day view (`/day`) depending on the scenario.
5. Scenarios 16 and 17 need a read-only Google calendar (a `reader` or
   `freeBusyReader` calendar) in addition to a writable one — see
   `google-sync.md` to connect Google and import one. Skip those two
   scenarios if only writable calendars are available.

Helpful notes:

- All event interactions require a loaded calendar grid. If the grid is blank, reload and wait for events to fetch.
- The right-click context menu on an event opens a small overlay. It closes if you click elsewhere.
- The Someday sidebar must be open (toggle with `[`) for sidebar drag scenarios.
- For rollback checks, reject one repository write and verify the optimistic Event returns exactly to its prior state.
- Navigate away from and back to a recently viewed Week/Day range; cached Events should render immediately.
- Validate both anonymous local writes and authenticated remote writes so query and mutation sources remain aligned.

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

- While the Someday event is over a timed grid slot, the preview uses the same
  layout as a Timed Event: title at the top, time underneath.
- The preview shows the tentative time while hovering, even if the target time
  has already passed.
- If the target time has already passed, the time disappears after drop the same
  way it does on saved past Timed Events.
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

## Calendar-Aware Events

### UX

Every event belongs to exactly one calendar. Creating and duplicating let
you pick a target calendar; once an event exists, its calendar is fixed
(A6) — there is no move-to-another-calendar control anywhere in the UI.
Events on a calendar you can't write to (a Google reader or free/busy-only
calendar) can still be opened and inspected, but every mutation surface is
blocked.

---

## Scenario 13: Create An Event On A Specific Calendar

### UX

The new-event form includes a "Calendar" field. It lists only calendars you
can write to, defaults to your primary calendar, and is fully keyboard
operable.

### Steps

1. Navigate to `/week`.
2. Click an empty slot in the hourly grid to open a new event form.
3. Open the "Calendar" field.
4. Confirm only writable calendars are listed (no reader or free/busy-only
   calendars appear) and the primary calendar is preselected.
5. Choose a non-primary writable calendar, if you have one.
6. Enter a title and submit.
7. Reload the page.

### Expected Results

- The "Calendar" field offers only writable calendars; the primary calendar
  is preselected and labeled "(primary)".
- The field is operable with arrow keys and Enter, not just the mouse.
- After submitting, the event is associated with the calendar you chose.
- If no writable calendar exists at all, the field shows "No writable
  calendar available" instead of a picker.
- The choice persists after a page reload.

---

## Scenario 14: Duplicating An Event Defaults To Its Source Calendar

### UX

Cmd+D (see Scenario 11) creates a copy on the same calendar as the
original, as long as that calendar is still writable.

### Steps

1. Open the form of an existing event on a writable, non-primary calendar
   (if you have more than one writable calendar).
2. Press Cmd+D (Mac) or Ctrl+D (Windows).
3. Open the new duplicate's form and check its "Calendar" field.

### Expected Results

- The duplicate is created on the same calendar as the source event, not
  the primary calendar, as long as the source calendar is writable.
- The duplicate's form still shows a "Calendar" picker (it's a new,
  independent event), with that calendar preselected.

---

## Scenario 15: Editing Shows The Calendar As Read-Only Text

### UX

Once an event exists, its calendar assignment cannot change from the event
form — moving an event to a different calendar is out of scope for v1 (A6).

### Steps

1. Open an existing, previously-saved event's form (any calendar).
2. Look for the calendar field.

### Expected Results

- The form shows "Calendar: `<calendar name>`" as plain text, not a picker
  or dropdown.
- There is no control anywhere in the form to change which calendar the
  event belongs to.

---

## Scenario 16: Read-Only Calendar Events Are Inspectable But Never Editable

### UX

An event on a calendar you can't write to (or a private event showing busy
content) can still be opened to view its details, but every mutating
action is unavailable.

### Steps

1. Locate an event on a read-only calendar on the grid.
2. Hover the event (or Tab to focus it, without clicking) and press `M`.
3. Close the form, then right-click the same event.
4. Try to drag the event to a new time slot.
5. Hover the event's edges, looking for a resize cursor.
6. If the event is in the Someday sidebar, try to drag it to reorder it
   among other Someday events.

### Expected Results

- Pressing `M` opens the event in a read-only form: fields are disabled,
  no Save button appears, and a note reads "Read-only — you don't have
  permission to edit this event."
- The right-click context menu shows "View" (not "Edit"), "Duplicate", and
  no Delete option or priority-color picker.
- The event cannot be picked up and dragged to a new time or day; no drag
  preview appears.
- No resize cursor or resize handle appears at the event's edges.
- A read-only Someday event cannot be reordered by drag.
- A direct left-click on the event may not reliably open the form (a known
  intermittent gap); `M` and the context menu's "View" are the reliable
  ways to inspect a read-only event.

---

## Scenario 17: Busy Private Events Show No Details

### UX

A private event on a calendar you only have reader access to is redacted:
Compass shows that the time is busy without exposing Google's private
title, description, or attendees.

### Steps

1. In Google Calendar, mark a test event as private on a calendar you've
   shared with your Compass account as a reader.
2. Confirm the event syncs to Compass (see `google-sync.md`).
3. Open the busy event in Compass, using `M` or the context menu's "View".

### Expected Results

- The event displays with the title "Busy" on the grid and in its form,
  regardless of the event's real Google title.
- No description, location, or attendee details are shown anywhere.
- The event is read-only the same way Scenario 16 describes. (Busy content
  forces read-only even on a calendar you can otherwise write to — the
  redaction is per-event, not just per-calendar.)

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
13. A new/duplicate event form offers only writable calendars, defaulting to
    primary; an existing event's form shows its calendar as read-only text.
14. Read-only calendar events can be inspected (`M` / context-menu "View")
    but never dragged, resized, deleted, or reordered.

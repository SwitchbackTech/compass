# Recurring Events

This runbook covers the recurring event UX in Compass.

## Scope

Use this guide to validate:

- creating weekly recurring events
- creating daily recurring events with an end date
- editing a recurring event with each of the three scopes: This Event, This and Following Events, All Events
- deleting a recurring event with each of the three scopes
- duplicating a recurring series (Cmd+D)

Do not use this guide to validate:

- standalone (non-recurring) event CRUD (see `events.md`)
- Google Calendar sync behavior for recurring events (see `google-sync.md`)

## Setup

1. Start the app with `bun run dev:web`.
2. Start the backend — recurring events require server-side processing.
3. Log in with any account.
4. Navigate to the Week view (`/week`).

Helpful notes:

- The "Apply Changes To" scope dialog appears any time you edit or delete an instance or base event of a recurring series.
- If you are changing the recurrence rule itself (for example removing recurrence entirely), the "This Event" option is removed from the scope dialog — only "This and Following Events" and "All Events" are available.
- Someday recurring events skip the scope dialog entirely and default to "All Events" for any mutation.
- Recurring events synced with Google Calendar will push scope changes back to Google automatically.

---

## Scenario 1: Create A Weekly Recurring Event

### UX

When creating an event, enabling the Repeat toggle reveals recurrence options. Setting the frequency to Weekly and selecting specific days of the week creates a recurring series that repeats on those days indefinitely (or until a specified end date).

### Steps

1. Navigate to `/week`.
2. Click an empty hour slot to open a new event form.
3. Enter a title.
4. Enable the Repeat toggle at the bottom of the form.
5. Set Frequency to Week.
6. Set Interval to 1 (every week).
7. Select Monday and Wednesday as the repeat days.
8. Leave the end date unset.
9. Submit the form.

### Expected Results

- The event appears on every Monday and Wednesday going forward in the calendar.
- Each instance is visually identical (same title, priority, and time).
- The series persists after a page reload.

---

## Scenario 2: Create A Daily Recurring Event With An End Date

### UX

Setting an end date on a recurring event stops the series on that date. No instances appear after the end date.

### Steps

1. Navigate to `/week`.
2. Click an empty hour slot to open a new event form.
3. Enter a title.
4. Enable the Repeat toggle.
5. Set Frequency to Day, Interval to 1.
6. Set an end date two weeks from today.
7. Submit the form.

### Expected Results

- The event appears on every day from creation date up to and including the end date.
- No instances appear after the end date.
- The series persists after a page reload.

---

## Scenario 3: Edit A Recurring Event — This Event Only

### UX

Editing a single instance of a recurring series and selecting "This Event" updates only that instance. All other instances in the series remain unchanged.

### Steps

1. Create a weekly recurring event (see Scenario 1).
2. Right-click one instance (for example, next Monday's) and select Edit.
3. Change the title to something distinct (for example, "Team Sync — Special").
4. Submit the form.
5. In the "Apply Changes To" dialog, select This Event.
6. Confirm.

### Expected Results

- The dialog presents three options: This Event, This and Following Events, All Events.
- Only the selected instance updates to the new title.
- All other instances in the series retain the original title.
- The change persists after a page reload.

---

## Scenario 4: Edit A Recurring Event — This And Following Events

### UX

Selecting "This and Following Events" splits the series. The selected instance and all future instances adopt the change, while past instances remain unchanged.

### Steps

1. Create a weekly recurring event.
2. Navigate to an instance that has at least two past instances and two future instances.
3. Right-click the instance and select Edit.
4. Change the title.
5. Submit the form.
6. In the scope dialog, select This and Following Events.
7. Confirm.

### Expected Results

- The selected instance and all future instances show the new title.
- Past instances retain the original title.
- The change persists after a page reload.

---

## Scenario 5: Edit A Recurring Event — All Events

### UX

Selecting "All Events" updates the base event, which propagates the change to every instance in the series — past and future.

### Steps

1. Create a weekly recurring event.
2. Right-click any instance and select Edit.
3. Change the title.
4. Submit the form.
5. In the scope dialog, select All Events.
6. Confirm.

### Expected Results

- Every instance of the series (past and future) shows the updated title.
- The change persists after a page reload.

---

## Scenario 6: Edit A Recurring Event — Removing Recurrence (Rule Change)

### UX

When the recurrence rule itself is changed (for example, turning off the Repeat toggle to make an event standalone), the "This Event" scope option is removed from the dialog. Only "This and Following Events" and "All Events" are available.

### Steps

1. Create a weekly recurring event.
2. Right-click an instance and select Edit.
3. Disable the Repeat toggle to remove recurrence.
4. Submit the form.
5. Observe the scope dialog.

### Expected Results

- The scope dialog does not include a "This Event" option.
- Only "This and Following Events" and "All Events" are shown.
- Selecting "This and Following Events" converts the selected instance and future instances to standalone events.
- Selecting "All Events" converts the entire series to a standalone event.

---

## Scenario 7: Delete A Recurring Event — This Event Only

### UX

Deleting a single instance removes only that occurrence. The rest of the series continues on its normal schedule.

### Steps

1. Create a weekly recurring event.
2. Right-click one instance and select Delete.
3. In the scope dialog, select This Event.
4. Confirm.

### Expected Results

- The selected instance is removed from the grid.
- All other instances of the series remain on the grid.
- The deletion persists after a page reload.

---

## Scenario 8: Delete A Recurring Event — This And Following Events

### UX

Deleting "This and Following Events" truncates the series. The selected instance and all future instances are removed; past instances remain.

### Steps

1. Create a weekly recurring event with at least four future instances.
2. Right-click the second instance and select Delete.
3. In the scope dialog, select This and Following Events.
4. Confirm.

### Expected Results

- The selected instance and all instances after it are removed from the grid.
- The instance immediately before the selected one (and any earlier instances) remain on the grid.
- The truncation persists after a page reload.

---

## Scenario 9: Delete A Recurring Event — All Events

### UX

Deleting "All Events" removes the entire recurring series from the calendar.

### Steps

1. Create a weekly recurring event.
2. Right-click any instance and select Delete.
3. In the scope dialog, select All Events.
4. Confirm.

### Expected Results

- Every instance of the series disappears from the grid.
- No instances remain after a page reload.

---

## Scenario 10: Duplicate A Recurring Series (Cmd+D)

### UX

Pressing Cmd+D with a recurring event form open duplicates the entire series. The duplicate is independent of the original.

### Steps

1. Right-click a recurring event instance and select Edit.
2. Press Cmd+D (Mac) or Ctrl+D (Windows) with the form open.
3. Close the original form.

### Expected Results

- A new independent recurring series appears on the grid with the same recurrence pattern, title, and time as the original.
- Both series coexist on the grid.
- The duplicate persists after a page reload.
- Editing one series does not affect the other.

---

## Focused Regression Checks

If time is limited, run these checks before shipping recurring event changes:

1. Creating a weekly recurring event with specific days shows instances on only those days.
2. A daily recurring event with an end date shows no instances after that date.
3. "This Event" scope updates only the selected instance.
4. "This and Following Events" scope splits the series at the selected instance.
5. "All Events" scope propagates the change to every instance.
6. Disabling the Repeat toggle removes the "This Event" option from the scope dialog.
7. Deleting "This Event" removes only that instance; the rest of the series persists.
8. Deleting "This and Following Events" truncates the series at the selected instance.
9. Deleting "All Events" removes every instance of the series.
10. Cmd+D on a recurring event form creates an independent duplicate series.

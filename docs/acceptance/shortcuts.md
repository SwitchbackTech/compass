# Shortcuts

This runbook covers keyboard shortcut parity in Compass. The principle: anything a user can do with a mouse should also be doable with the keyboard.

## Scope

Use this guide to validate:

- navigating between views with the keyboard (D, W, N)
- navigating between days in Day view (J, K, T)
- navigating between weeks in Week view (J, K, T)
- opening and using the command palette (Cmd+K)
- creating events with keyboard shortcuts (C, A, Shift+W, Shift+M in Week view)
- creating tasks with the keyboard (C in Day view)
- toggling the sidebar ([)
- completing tasks with the keyboard (Enter on checkbox)
- deleting tasks with the keyboard (Delete/Backspace)
- undoing with the keyboard (Cmd+Z / Ctrl+Z)
- confirming that shortcuts do not fire while typing in inputs

Do not use this guide to validate:

- Now mode navigation shortcuts (see `tasks.md`, Scenarios 10–13)
- full event CRUD flows (see `events.md`)
- full task management flows (see `tasks.md`)

## Setup

1. Start the app with `bun run dev:web`.
2. Log in with any account.
3. Ensure no input or textarea is focused unless a scenario requires it.

Helpful notes:

- All shortcuts are context-aware. They do not fire when the user is typing in a text input, textarea, or form field — except Cmd+K / Ctrl+K, which opens the command palette from anywhere.
- Shortcuts shown as `Cmd` apply on Mac. On Windows/Linux, use `Ctrl` in place of `Cmd` unless noted otherwise.
- `Mod` means Command on Mac and Control on Windows/Linux.
- `Meta` in key combinations refers to the Command key on Mac and the Windows key on Windows.

---

## Shortcut Reference

| Shortcut               | View      | Action                            |
| ---------------------- | --------- | --------------------------------- |
| `D`                    | Global    | Navigate to Day view              |
| `W`                    | Global    | Navigate to Week view             |
| `N`                    | Global    | Navigate to Now view              |
| `R`                    | Global    | Edit personal reminder note       |
| `Z`                    | Global    | Log out                           |
| `Cmd+K` / `Ctrl+K`     | Global    | Open command palette              |
| `[`                    | Global    | Toggle sidebar                    |
| `J`                    | Day view  | Previous day                      |
| `K`                    | Day view  | Next day                          |
| `T`                    | Day view  | Go to today                       |
| `U`                    | Day view  | Focus task list                   |
| `C`                    | Day view  | Create task                       |
| `E`                    | Day view  | Edit focused task                 |
| `Delete` / `Backspace` | Day view  | Delete focused task               |
| `Enter`                | Day view  | Mark focused task complete        |
| `Ctrl+Meta+ArrowRight` | Day view  | Move focused task to next day     |
| `Ctrl+Meta+ArrowLeft`  | Day view  | Move focused task to previous day |
| `Cmd+Z` / `Ctrl+Z`     | Day view  | Undo last action                  |
| `J`                    | Week view | Previous week                     |
| `K`                    | Week view | Next week                         |
| `T`                    | Week view | Go to today                       |
| `C`                    | Week view | Create timed event                |
| `A`                    | Week view | Create all-day event              |
| `Shift+W`              | Week view | Create Someday Week event         |
| `Shift+M`              | Week view | Create Someday Month event        |

---

## Scenario 1: Navigate Between Views With The Keyboard

### UX

Pressing `D`, `W`, or `N` from anywhere in the app (while not focused in an input) navigates to Day view, Week view, or Now view respectively.

### Steps

1. Navigate to `/week`.
2. Press `D`.
3. Press `W`.
4. Press `N`.
5. Press `D` to return to Day view.

### Expected Results

- `D` navigates to `/day`.
- `W` navigates to `/week`.
- `N` navigates to `/now`.
- Each transition happens without a full page reload.

---

## Scenario 2: Navigate Between Days In Day View (J, K, T)

### UX

In Day view, `J` goes back one day, `K` goes forward one day, and `T` returns to today (or scrolls to the current time if already on today).

### Steps

1. Navigate to `/day`.
2. Press `K` three times.
3. Press `J` twice.
4. Note the current date shown, then press `T`.

### Expected Results

- Each `K` advances the view by one day.
- Each `J` moves the view back one day.
- `T` returns the view to today's date regardless of current position.
- If already on today, `T` scrolls the grid to the current time.

---

## Scenario 3: Navigate Between Weeks In Week View (J, K, T)

### UX

In Week view, `J` goes to the previous week, `K` goes to the next week, and `T` returns to the current week.

### Steps

1. Navigate to `/week`.
2. Press `K` twice to advance two weeks.
3. Press `J` once to go back one week.
4. Press `T`.

### Expected Results

- Each `K` advances the view by one week.
- Each `J` moves the view back one week.
- `T` returns the view to the current week.

---

## Scenario 4: Open And Use The Command Palette (Cmd+K)

### UX

Pressing Cmd+K opens the command palette from any view, including while a text input is focused. The palette lists common actions. Pressing Escape closes it.

### Steps

1. Navigate to `/week`.
2. Press Cmd+K (or Ctrl+K on Windows).
3. Observe the palette contents.
4. Use the search/filter to type "event".
5. Select "Create Event" from the palette.
6. Press Cmd+K again and then Escape.

### Expected Results

- The command palette opens immediately.
- Items include: Create Event, Create All-Day Event, Create Week Event, Create Month Event, Go to Today, Connect Google Calendar (if not connected), Log Out.
- Typing filters the list.
- Selecting "Create Event" opens the event creation form.
- Pressing Escape closes the palette without taking action.
- Cmd+K works even when a text input elsewhere has focus.

---

## Scenario 5: Create An Event With A Keyboard Shortcut (C In Week View)

### UX

Pressing `C` in Week view opens a new event creation form, equivalent to clicking an empty grid slot.

### Steps

1. Navigate to `/week`.
2. Ensure no input is focused.
3. Press `C`.

### Expected Results

- The event creation form opens.
- The form is equivalent to what would appear after clicking an empty grid slot.

---

## Scenario 6: Create An All-Day Event With A Keyboard Shortcut (A In Week View)

### UX

Pressing `A` in Week view opens a new event form pre-configured as an all-day event.

### Steps

1. Navigate to `/week`.
2. Ensure no input is focused.
3. Press `A`.

### Expected Results

- The event creation form opens with the all-day toggle already enabled.
- No start/end time fields are shown.

---

## Scenario 7: Create Someday Events With Keyboard Shortcuts

### UX

`Shift+W` creates a Someday Week event and `Shift+M` creates a Someday Month event, both from Week view.

### Steps

1. Navigate to `/week`.
2. Open the sidebar with `[` if it is not open.
3. Press `Shift+W`.
4. Enter a title and submit.
5. Press `Shift+M`.
6. Enter a title and submit.

### Expected Results

- `Shift+W` opens an event form for a Someday Week event; the saved event appears in the sidebar Week section.
- `Shift+M` opens an event form for a Someday Month event; the saved event appears in the sidebar Month section.

---

## Scenario 8: Create A Task With The Keyboard (C In Day View)

### UX

Pressing `C` in Day view opens an inline task input — distinct from `C` in Week view, which opens an event form.

### Steps

1. Navigate to `/day`.
2. Ensure no input is focused.
3. Press `C`.
4. Type a title and press Enter.

### Expected Results

- An inline task input appears in the task panel (not an event form).
- The saved task appears in the task list.

---

## Scenario 9: Toggle The Sidebar ([)

### UX

Pressing `[` toggles the sidebar open or closed from any view.

### Steps

1. Navigate to `/week`.
2. Press `[` to close the sidebar (if open).
3. Press `[` again to reopen it.
4. Navigate to `/day` and repeat.

### Expected Results

- `[` toggles the sidebar in both Week view and Day view.
- The calendar grid expands to fill the space when the sidebar is closed.

---

## Scenario 10: Complete A Task With The Keyboard (Enter On Checkbox)

### UX

Pressing Enter while a task checkbox is focused marks the task as complete — equivalent to clicking the checkbox.

### Steps

1. Navigate to `/day` and create a task.
2. Tab to or click the task checkbox to focus it.
3. Press Enter.

### Expected Results

- The task is marked as completed.
- The task moves below any remaining incomplete tasks and appears faded.
- This is functionally identical to clicking the checkbox with the mouse.

---

## Scenario 11: Delete A Task With The Keyboard (Delete/Backspace)

### UX

Pressing Delete or Backspace while a task checkbox is focused removes the task — equivalent to a mouse-driven delete action.

### Steps

1. Navigate to `/day` and create a task.
2. Focus the task checkbox.
3. Press Delete (or Backspace).

### Expected Results

- The task is removed from the list.
- An undo toast appears.
- This is functionally identical to a mouse-driven delete.

---

## Scenario 12: Undo With The Keyboard (Cmd+Z / Ctrl+Z)

### UX

After deleting an event or task, pressing Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) restores it — equivalent to clicking the undo toast.

### Steps

1. In Day view, delete a task.
2. Immediately press Cmd+Z (Mac) or Ctrl+Z (Windows/Linux).

### Expected Results

- The deleted task is restored with its original properties.
- The undo toast dismisses.

---

## Scenario 13: Shortcuts Do Not Fire While Typing In Inputs

### UX

All view-navigation and action shortcuts are suppressed when the user is focused inside a text input, textarea, or other form control. This prevents accidental navigation or destructive actions while the user is typing.

### Steps

1. Navigate to `/day`.
2. Click the Create Task button to open the inline task input.
3. With the input focused, press `D`, `W`, `N`, `J`, `K`.
4. Press `Delete`.
5. Press Cmd+K.

### Expected Results

- `D`, `W`, `N`, `J`, `K`, and `Delete` do not trigger any navigation or action while the task input is focused. The characters type normally into the input.
- Cmd+K (or Ctrl+K) still opens the command palette even from inside the input.
- After pressing Escape to cancel the input, the same shortcuts resume normal behavior.

---

## Focused Regression Checks

If time is limited, run these checks before shipping shortcut-related changes:

1. `D`, `W`, `N` navigate to the correct views from any starting view.
2. `J` and `K` navigate days in Day view and weeks in Week view.
3. `T` returns to today from any offset in both Day and Week view.
4. Cmd+K opens the command palette; Escape closes it without action.
5. `C` in Week view opens an event form; `C` in Day view opens a task input.
6. `A` in Week view opens an all-day event form.
7. `Shift+W` and `Shift+M` create Someday events in the correct sidebar sections.
8. `[` toggles the sidebar in both Week and Day view.
9. Enter on a focused task checkbox marks the task complete.
10. Delete/Backspace on a focused task checkbox removes the task.
11. Cmd+Z / Ctrl+Z restores the last deleted task or event.
12. No shortcuts fire inside a focused text input except Cmd+K.

# Shortcuts

This runbook covers keyboard shortcut parity in Compass. The principle: anything a user can do with a mouse should also be doable with the keyboard.

## Scope

Use this guide to validate:

- navigating between views with the keyboard (D, W)
- navigating between days in Day view (J, K, T)
- navigating between weeks in Week view (J, K, T)
- opening and using the command palette (Cmd+K)
- creating events with keyboard shortcuts (C, A in both Day and Week view)
- toggling the sidebar ([)
- undoing with the keyboard (Cmd+Z / Ctrl+Z)
- confirming that shortcuts do not fire while typing in inputs

Do not use this guide to validate:

- full event CRUD flows (see `events.md`)

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

| Shortcut                    | View      | Action                            |
| --------------------------- | --------- | --------------------------------- |
| `D`                         | Global    | Navigate to Day view              |
| `W`                         | Global    | Navigate to Week view             |
| `Cmd+K` / `Ctrl+K`          | Global    | Open command palette              |
| `[`                         | Global    | Toggle sidebar                    |
| `Cmd+Z` / `Ctrl+Z`          | Global    | Undo last event action            |
| `Cmd+Shift+Z` / `Ctrl+Shift+Z` | Global | Redo last undone event action     |
| `J`                         | Day view  | Previous day                      |
| `K`                         | Day view  | Next day                          |
| `T`                         | Day view  | Go to today                       |
| `I`                         | Day view  | Focus sidebar                     |
| `U`                         | Day view  | Focus calendar                    |
| `C`                         | Day view  | Create timed event                |
| `A`                         | Day view  | Create all-day event              |
| `Shift+ArrowUp` / `Shift+ArrowDown` | Day view | Move focused timed event 15 min earlier/later |
| `J`                         | Week view | Previous week                     |
| `K`                         | Week view | Next week                         |
| `T`                         | Week view | Go to today                       |
| `C`                         | Week view | Create timed event                |
| `A`                         | Week view | Create all-day event              |
| `I`                         | Week view | Focus sidebar                     |
| `U`                         | Week view | Focus first calendar event        |
| `Delete`                    | Week view | Delete focused/hovered event      |
| `Shift+ArrowLeft`           | Week view | Move focused event to previous day |
| `Shift+ArrowRight`          | Week view | Move focused event to next day    |
| `Shift+ArrowUp` / `Shift+ArrowDown` | Week view | Move focused timed event 15 min earlier/later |

---

## Scenario 1: Navigate Between Views With The Keyboard

### UX

Pressing `D` or `W` from anywhere in the app (while not focused in an input) navigates to Day view or Week view respectively.

### Steps

1. Navigate to `/week`.
2. Press `D`.
3. Press `W`.

### Expected Results

- `D` navigates to `/day`.
- `W` navigates to `/week`.
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
- Items include: Create Event, Create All-Day Event, Go to Today, Connect Google Calendar (if not connected), Log Out.
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

## Scenario 7: Create An Event With A Keyboard Shortcut (C In Day View)

### UX

Pressing `C` in Day view opens a new timed event form, the same behavior as `C` in Week view.

### Steps

1. Navigate to `/day`.
2. Ensure no input is focused.
3. Press `C`.

### Expected Results

- The event creation form opens.

---

## Scenario 8: Toggle The Sidebar ([)

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

## Scenario 9: Delete A Focused Event With The Keyboard (Delete, Week View)

### UX

Pressing Delete while an event is focused or hovered in the Week grid deletes it — equivalent to a mouse-driven delete action.

### Steps

1. Navigate to `/week`.
2. Focus or hover an event in the grid.
3. Press Delete.

### Expected Results

- The event is removed from the grid.
- An undo toast appears.

---

## Scenario 10: Undo With The Keyboard (Cmd+Z / Ctrl+Z)

### UX

After deleting or moving an event, pressing Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) undoes it — equivalent to clicking the undo toast.

### Steps

1. Delete an event (see Scenario 9).
2. Immediately press Cmd+Z (Mac) or Ctrl+Z (Windows/Linux).

### Expected Results

- The deleted event is restored with its original properties.
- The undo toast dismisses.
- Pressing Cmd+Shift+Z (or Ctrl+Shift+Z) immediately after redoes the undone action.

---

## Scenario 11: Shortcuts Do Not Fire While Typing In Inputs

### UX

All view-navigation and action shortcuts are suppressed when the user is focused inside a text input, textarea, or other form control. This prevents accidental navigation or destructive actions while the user is typing.

### Steps

1. Navigate to `/week`.
2. Press `C` to open the event creation form, focusing the title input.
3. With the input focused, press `D`, `W`, `J`, `K`.
4. Press `Delete`.
5. Press Cmd+K.

### Expected Results

- `D`, `W`, `J`, `K`, and `Delete` do not trigger any navigation or action while the form input is focused. The characters type normally into the input.
- Cmd+K (or Ctrl+K) still opens the command palette even from inside the input.
- After pressing Escape to cancel the form, the same shortcuts resume normal behavior.

---

## Focused Regression Checks

If time is limited, run these checks before shipping shortcut-related changes:

1. `D`, `W` navigate to the correct views from any starting view.
2. `J` and `K` navigate days in Day view and weeks in Week view.
3. `T` returns to today from any offset in both Day and Week view.
4. Cmd+K opens the command palette; Escape closes it without action.
5. `C` opens a timed event form and `A` an all-day event form, in both Day and Week view.
6. `[` toggles the sidebar in both Week and Day view.
7. Delete removes a focused/hovered event in Week view and shows an undo toast.
8. Cmd+Z / Ctrl+Z undoes the last event action; Cmd+Shift+Z / Ctrl+Shift+Z redoes it.
9. No shortcuts fire inside a focused text input except Cmd+K.

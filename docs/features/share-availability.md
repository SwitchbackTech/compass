# Share Availability — Implementation Specification

Status: **Ready for implementation**
Scope: **Frontend-only MVP; Day and Week views; desktop keyboard and pointer**

## 1. Summary

Share Availability turns free time into a concise plain-text message. Pressing
`A` enters availability mode, Compass proposes future 30-minute slots in the
visible calendar window, and the user toggles or draws slots before copying the
message. An optional recipient time zone renders every interval in both zones.

This is selection and formatting only. It does not create events, reserve time,
create booking links, contact recipients, or persist availability to a server.

## 2. Goals and non-goals

### Goals

- Produce an accurate, human-friendly message with few keystrokes.
- Make the four most useful free slots selected by default.
- Keep keyboard and pointer workflows at parity.
- Never propose or allow a slot wholly or partly in the past.
- Make source and recipient zones unambiguous, including across DST.
- Work in anonymous/local mode and with connected calendars.

### Non-goals for MVP

- Booking pages, group polls, attendees, meeting metadata, or configurable
  conflict policies.
- Saving/reusing slot sets or syncing them across devices.
- Natural-language editing of the generated message.
- Mobile support. The existing mobile gate remains unchanged.

## 3. Entry, exit, and shortcut changes

### Entry

- From Day or Week view, while no input, modal, event draft, or app lock owns
  the keyboard, `A` enters availability mode.
- Add **Share availability — A** to the Create shortcut section and a **Share
  availability** command-palette row.
- Entry opens a collapsed sidebar without changing the visible range or scroll.
- If an event form is open, `A` remains suppressed and must not discard it.

### All-day creation remap

- Remap **Create all-day event** from `A` to the simultaneous chord `Shift+C`
  in Day, Week, command-palette keycaps, shortcut registry, onboarding/showcase
  copy if present, tests, and acceptance docs.
- This is a chord, not sequential `Shift`, then `C`.
- Plain `C` continues to create a timed event.

### Exit

- `Escape` exits availability mode and restores the normal sidebar. If the
  zone picker is open, the first `Escape` closes only the picker.
- The sidebar close button exits the mode and closes the sidebar.
- Top-level view navigation exits and discards availability state.
- Copying does not exit, so the user can adjust and copy again.
- Restore focus to the grid, or to the command launcher if still mounted.

## 4. Availability-mode layout

### Sidebar

Replace the normal month picker / Up Next / calendar list body with an
`AvailabilityPanel`, while retaining `SidebarShell` and its close control.

Panel order:

1. Heading **Share availability** and close button.
2. Read-only live preview of the exact clipboard text.
3. Source-zone chip; **Add recipient timezone** (`Z`); removable recipient chip.
4. Help: **Arrow keys move · Enter or Space toggles · drag to add**.
5. Sticky **Copy to clipboard** footer with `⌘ C` on macOS or `Ctrl C` elsewhere.

When empty, disable and rename the button **Select a time to copy**. The preview
is generated document text rather than a textbox, but remains pointer-selectable.

### Grid

- Render slots in a dedicated overlay above backgrounds and below event cards.
  Never model slots as events or put them in event caches.
- Unselected candidates use low-emphasis semantic accent; selected slots use a
  high-emphasis fill and selected marker; the active slot has a separate focus
  ring distinguishable from selection.
- Busy and past cells have no candidate and cannot be selected.
- Do not obscure event text, the now line, or day labels.
- Grid and preview update immediately after selection changes.

## 5. Slot model and conflict rules

Use instants for correctness and IANA zone IDs for presentation:

```ts
type AvailabilitySlot = {
  id: string; // `${start}/${end}`
  start: string; // ISO instant
  end: string; // ISO instant
  selected: boolean;
  origin: "suggested" | "user";
};
```

State is ephemeral and feature-local (Zustand store or provider), not event
draft state. Store instants and zone IDs; derive labels. Adjacent cells may be
stored separately but normalize into intervals for preview/copy.

### Candidate generation

1. Use the visible Day/Week interval, clipped to `now`.
2. Use 30-minute duration with starts aligned to local `:00`/`:30` in the
   effective/source zone.
3. Generate only 09:00–17:00 Monday–Friday; the last slot ends at 17:00.
4. Exclude any candidate overlapping a timed event by even one instant;
   end-equals-start is not overlap.
5. An all-day event makes its local date unavailable.
6. Include events from every calendar available to the repository, even hidden
   calendars. Cancelled/deleted and transparent/free events do not block when
   known; otherwise treat returned events as busy (fail safe).
7. Never generate `start < now`. Recheck on toggle and copy so long-open panels
   cannot copy a newly past slot.

Candidate generation and normalization are pure, unit-tested utilities. Fetch
the visible range independently of the visible-calendar-filtered grid model.

### Four default selections

Select up to four candidates deterministically:

1. Rank weekdays chronologically from the first visible future day.
2. Within a day rank by distance from 10:00, then 14:00, then earlier start.
3. First pass: at most one per day.
4. Second pass fills remaining positions, keeping at least 60 minutes between
   selected starts on one day where possible.
5. Stop at four; if fewer exist, select all; if none, show the empty state.

This spreads choices across days, favors ordinary work hours, and is testable.
Defaults compute once on entry. Query refreshes remove new conflicts but do not
select replacements, avoiding surprising changes under the user.

### User-created slots

- Drag on empty timed-grid space to create a selected interval, snapping to
  30-minute boundaries with a 30-minute minimum.
- Support upward/downward drag; clamp to the day, `now`, and 09:00–17:00.
- A drag may span adjacent free cells and normalizes to one interval. It stops
  at rather than crosses a busy interval.
- Clicking a candidate toggles its 30-minute slot.
- In this mode, drag/click must not create drafts or move/resize events. Event
  cards remain visible but non-editable until exit.

## 6. Keyboard interaction

On entry, activate the earliest selected candidate, otherwise the earliest
available candidate.

- `ArrowUp`/`ArrowDown`: previous/next candidate on the same day.
- `ArrowLeft`/`ArrowRight`: nearest start time on the adjacent visible day,
  continuing across days with no candidates.
- `Enter` or `Space`: toggle active candidate.
- `Z`: use the existing zone search UI with a new `availability-recipient`
  purpose; commit only to this mode, not pinning or time travel.
- `Mod+C`: copy while the mode owns the shortcut and prevent browser copy.
- Suspend normal creation, navigation, editing, event-jump, and time-travel
  shortcuts. Global Escape/sidebar rules remain as above.

Use roving focus or `aria-activedescendant`, not a tab stop per cell. Expose the
overlay as a multiselectable grid/listbox. Accessible names include full source
date, time range, and **selected**/**not selected**; announce changes politely.

## 7. Time-zone behavior

- Freeze `useEffectiveTimeZone()` as the source zone on entry. Show its
  abbreviation while retaining its IANA ID.
- Extend the existing picker with an explicit recipient purpose/callback; never
  temporarily mutate the time-travel store.
- Selecting the same IANA zone as source removes the recipient zone.
- Calculate abbreviations per interval. If DST changes within the slot set, use
  the applicable abbreviation on each row.
- The heading uses slash-separated abbreviations only when each zone has one
  unambiguous abbreviation across selected slots (for example `MDT/GMT`).
  Otherwise use compact IANA-derived labels (for example `Denver/London`) and
  retain per-row abbreviations.

## 8. Message formatting

Preview and clipboard call the same pure formatter. Output uses `\n`, no
Markdown, no trailing whitespace, and no final newline. Use Compass's 12/24-hour
preference if one exists, otherwise locale-default formatting.

Single zone:

```text
Do any of these times (MDT) work for you?

August 27 (Thursday):
- 10:00am–10:30am (MDT)
- 2:00pm–2:30pm (MDT)
```

Two zones:

```text
Do any of these times (EST/GMT) work for you?

March 6 (Friday):
- 8:00am–8:30am (EST) / 1:00pm–1:30pm (GMT)
- 9:30am–10:00am (EST) / 2:30pm–3:00pm (GMT)
```

Rules:

- Sort by source start and group by source calendar date.
- Heading is `MMMM D (dddd):`; include year when different from the current
  source-zone year or the selection spans years.
- Merge exactly adjacent selected cells with no conflict gap.
- Use an en dash without spaces and ` / ` between zones.
- Always show a zone abbreviation per bullet.
- If the recipient date differs, prefix its short date, e.g.
  `11:30pm–12:00am (MDT) / Mar 7, 6:30am–7:00am (GMT)`.
- Empty preview: **Select times on the calendar to build your message.** Never
  copy this placeholder.

## 9. Copy feedback and failures

- Button and `Mod+C` call `navigator.clipboard.writeText` with formatter output.
- Success toast: **Copied slots to clipboard.** in the normal `aria-live`
  status region and existing toast position/timing.
- On rejection/unavailability show **Couldn’t copy availability. Select the
  message and copy it manually.**, focus the preview, and select it
  programmatically. Never show success.
- Before copy, remove newly past or conflicting slots. If none remain, disable
  copy and announce why.

## 10. Loading, empty, error, and live-update states

- While conflicts load, show panel/grid skeletons and disable copy; never flash
  unverified suggestions.
- No candidates: **No free 30-minute times in this view.** Offer **Next week**
  in Week or **Next day** in Day; navigation recomputes defaults.
- Query failure: **Availability couldn’t be checked. Try again.** with retry.
  Fail closed and offer no unchecked slots.
- If a live update creates a conflict, remove the slot, update preview, and
  announce **A selected time was removed because it is no longer free.**

## 11. Architecture and file ownership

Create `packages/web/src/availability/` without a barrel file:

- `availability.store.ts`: mode, active/selected slots, and zones.
- `availability-slot.util.ts`: candidates, overlap, ranking, normalization.
- `availability-message.util.ts`: deterministic formatter.
- `useAvailabilityEvents.ts`: all-calendar range query.
- `useAvailabilityShortcuts.ts`: mode-owned bindings.
- `AvailabilityPanel.tsx`: sidebar UI.
- `AvailabilityGridOverlay.tsx`: semantic grid layer.
- A small toast utility using existing toast primitives.

Integration points:

- `Sidebar.tsx` renders availability content ahead of normal content; event
  details retain priority because the mode cannot enter over a draft.
- Day/Week owners provide visible dates/range and mount the overlay.
- `useCalendarViewShortcuts.ts` remaps all-day creation and enters the mode.
- Update `shortcuts.registry.ts`, command-palette event constants, and any
  keymap/showcase source together.
- Extend `timezone-dialog.store.ts` and `TimezonePickerDialog.tsx` with the
  recipient selection purpose without coupling it to time travel.

No backend/core contract is needed because no data crosses a network boundary.

## 12. Privacy-safe analytics

When analytics consent is active, emit no titles, calendar IDs, dates, times, or
zone IDs. Suggested events:

- `availability_opened` (`view`, `entrypoint`)
- `availability_slot_toggled` (`selected`, `origin`)
- `availability_recipient_zone_added`
- `availability_copied` (`slot_count`, `interval_count`, `has_recipient_zone`)
- `availability_copy_failed` (`reason_category`)
- `availability_closed` (`copied`, `selected_slot_count`)

## 13. Test plan

### Unit

- Alignment, window/future clipping, timed/all-day overlap, boundary equality,
  hidden-calendar conflicts, and DST days.
- Default ranking with zero, fewer than four, and many candidates.
- Adjacent merge, sorting/grouping, year/date rollover, 12/24-hour output,
  one/two zones, and DST abbreviation changes.

### React Testing Library

- Entry/exit, draft suppression, and sidebar replacement/restoration.
- Arrow navigation, roving focus, toggles, and live announcements.
- `Z` selection without changing pinned/time-travel state.
- Button/`Mod+C` success/failure, disabled/empty, query, and live-conflict states.
- Registry, command palette, and `Shift+C` all-day regression.
- Use role/name/text queries and `user-event`, never CSS/data locators.

### Integration / E2E

1. Enter Week mode with events and verify exactly four valid defaults.
2. Toggle by keyboard and drag a multi-cell interval; no event draft opens.
3. Add a recipient zone whose date differs, copy, and compare exact clipboard
   text with the preview.
4. Confirm past, busy, and all-day periods cannot be selected.
5. After exit, confirm `Shift+C` creates all-day and `C` creates timed.
6. Run accessibility checks in light/dark themes and reduced motion.

## 14. Acceptance criteria

- `A` enters from idle Day/Week views in one keystroke.
- Up to four free, future working-hour slots are selected deterministically,
  including conflicts from hidden calendars.
- Pointer and keyboard users can change slots without mutating events.
- Preview exactly matches successful clipboard content.
- Recipient-zone output is instant-correct and leaves global zones unchanged.
- Empty selections cannot copy; success and failures are announced.
- `Shift+C` replaces `A` everywhere for all-day creation.
- Tests cover selection, formatting edges, keyboard, clipboard, and shortcuts.

## 15. Deferred product decisions

Do not block MVP on configurable duration/working hours, calendar-specific
conflicts, persisted presets, booking links, editable prose, multiple recipient
zones, or history-based ranking. Each needs a separate product and privacy
decision.

# July 11, 2026 — Summary

## Executive summary

Today's implementation window (a large event-runtime/someday-sidebar refactor day,
~30 merged PRs) was driven by a separate autonomous session and isn't re-summarized
here in detail — this entry covers the evening `/cleanup` ritual, run for the first
time in this repo.

Cleanup added a new `ux-sweep` skill (proactive UX/a11y exploration), shipped it,
then used it to find and fix a live bug: the two known time-picker issues from this
spec's open item were reproduced in the browser, root-caused, fixed, and shipped.

## Before and after

| Area | Before | After |
|---|---|---|
| UX/a11y regression detection | Only caught if the PO happened to notice and write it up | New `ux-sweep` skill proactively drives recently-changed surfaces looking for friction, wired into `/handoff` (per-PR) and `/cleanup` (whole-day window) |
| Time picker (`fix(web): time picker input selection`, open since yesterday) | Dropdown stayed open when clicking elsewhere in the form; end-time dropdown sometimes opened scrolled to the wrong position | Both fixed — [#2051](https://github.com/SwitchbackTech/compass-calendar/pull/2051) |
| `.claude/skills/` | No proactive UX-testing skill | `ux-sweep/SKILL.md` added — [#2048](https://github.com/SwitchbackTech/compass-calendar/pull/2048) |

## Decisions

- **Skipped `simplify` for this cleanup's review window.** The window (`30d07784..6f9448d`)
  covered ~307 files / ~37k lines across ~30 PRs already shipped via `ship`'s own
  per-PR correctness+simplify pass. Re-running a full simplify sweep over the whole
  day would have meant dozens more auto-merged PRs with limited incremental value —
  confirmed this scoping with the PO before proceeding.
- **`ux-sweep` found the time-picker bug independently, converging with an already-open
  spec item.** `TimePickers.tsx`/`TimePicker.tsx` had been touched during today's
  refactor but the two known bugs (menu stuck open, wrong scroll position) were never
  fixed. Root cause was a single bug in `TimePicker.tsx`: `onMenuClose` never called
  `setIsMenuOpen(false)`, so the controlled `react-select` menu couldn't close on
  blur/outside-click — and because both start/end pickers share a `classNamePrefix`,
  the stuck-open menu caused the sibling's scroll-into-view query
  (`document.getElementsByClassName(...)[0]`) to grab the wrong list's selected option.
  Fixed by scoping the query to each picker's own container via a `ref`, and by
  actually flipping `isMenuOpen` in `onMenuClose`. Shipped as
  [#2051](https://github.com/SwitchbackTech/compass-calendar/pull/2051).
- **Logged, not fixed:** a React "duplicate key" console warning in
  `DayCalendarTimedEventsLayer` (`DayTimedCalendarEvent`, keyed on `event._id`),
  surfaced incidentally while testing the time picker with two overlapping test
  events. This reads as a correctness bug (possibly from today's event-runtime
  refactor), not UX/a11y friction, so it's out of `ux-sweep`'s remit per its own
  guardrail — see PO follow-ups.

## PO follow-ups

- **Duplicate React key warning** in `DayCalendarTimedEventsLayer` when two timed
  events render close together in the Day view grid (console: "Each child in a list
  should have a unique 'key' prop", pointing at `DayTimedCalendarEvent`, keyed on
  `event._id` in `DayCalendarEventLayers.tsx`). Not investigated further — likely
  worth a `/code-review` or debug pass, possibly related to today's `GridEventDraft`
  cutover producing two entries with the same id during a draft/persisted-event
  transition.

## Token spend

Not logged for this session — run `/usage` to record if needed for tomorrow's planning.

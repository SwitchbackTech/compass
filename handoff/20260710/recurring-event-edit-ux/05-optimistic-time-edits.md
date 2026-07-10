# Slice 5: Optimistic Time Edits

## Goal

Immediately reflect moves, resizes, and all-day transitions that retain the existing occurrence set.

## Temporal model

Derive edits by comparing the original cached occurrence with the submitted occurrence:

- start-time change;
- duration change;
- all-day state change;
- for an all-series edit, preserve each occurrence's recurrence date while applying the edited wall-clock time and duration;
- for this-and-following, apply the transform only at/after the original cutoff.

Use project date utilities. Do not perform date arithmetic with string slicing or native `Date` alone.

## Scope behavior

### This event

Use the existing full-event upsert and range reconciliation.

### All events

- Timed series: retain each occurrence's local calendar date, apply the edited start wall time, and derive end from the edited duration.
- All-day series: preserve occurrence day and apply the edited day span.
- Re-evaluate membership in every cached range.

### This and following

- Use the original occurrence start as cutoff.
- Remove affected old-series instances from their prior ranges.
- Project their new time/date where the rule's occurrence set is otherwise unchanged.
- Earlier instances stay untouched.

Moving a series to a different weekday changes its occurrence set and belongs to Slice 6, even if the UI expresses it as a drag.

## Edge cases

- DST spring-forward and fall-back weeks.
- Timed events crossing midnight.
- Negative or zero durations must remain rejected by existing validation.
- All-day exclusive end dates.
- Events moving outside all cached ranges.
- Events moving into two overlapping cached ranges.
- Resize-only edits.

## Tests

- Weekly timed series changes from 09:00–10:00 to 11:30–13:00.
- This-and-following resize leaves earlier durations intact.
- Event leaves the current day cache and enters the next day cache immediately.
- DST cases preserve intended local wall time.
- All-day span changes use exclusive end semantics.
- Pending repository assertions prove the update is optimistic.

## Acceptance criteria

- Supported time edits update before repository settlement.
- No old-position ghost remains in any cached range.
- Day/week caches agree when both are populated.
- Date arithmetic matches backend behavior for timed and all-day events.
- Unsupported rule-changing moves fall back safely to refetch until Slice 6.

## Non-goals

- Generating a different recurrence set.
- Changing date storage formats.
- Rewriting calendar layout code.


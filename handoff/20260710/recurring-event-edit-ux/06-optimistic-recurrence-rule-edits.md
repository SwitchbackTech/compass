# Slice 6: Optimistic Recurrence-Rule Edits

## Goal

Immediately add and remove visible occurrences when a recurrence rule changes or a following-series split changes the schedule.

## Core approach

Use the browser-safe `CompassEventRRule` from core to generate occurrences only for currently cached calendar ranges. Do not generate an unbounded series and do not port backend persistence logic.

Build the desired occurrence set, then reconcile it with cached instances.

## Occurrence identity

Match a desired occurrence to an existing instance using:

1. series ID;
2. original occurrence start in a normalized date/date-time form;
3. all-day status and duration where needed to disambiguate.

When matched, retain the real instance ID and provider identifiers. For the first occurrence in a this-and-following edit, preserve the actively edited instance ID even though the backend will create a new base.

For unmatched desired occurrences, create a temporary ID:

```text
optimistic-recurring:<mutation-id>:<normalized-occurrence-start>
```

The mutation ID must distinguish rapid edits to the same series.

## Scope behavior

### All events

- Generate the edited rule across the union of cached day/week ranges.
- Remove cached instances no longer present.
- Reuse matching instances and add previews for new occurrences.
- Keep the original base ID in optimistic recurrence metadata until refetch.

### This and following

- Preserve old-series instances before the original cutoff.
- Remove old-series instances at/after the cutoff.
- Generate the replacement rule from the edited occurrence through cached range ends.
- Give projected occurrences a deterministic optimistic series identity if necessary, without pretending it is a persisted ObjectId.

### Remove recurrence

- Preserve/render the edited occurrence as standalone.
- Remove the other affected cached instances according to the chosen scope.
- Let refetch establish the canonical retained ID and provider data.

## Range handling

- Deduplicate overlapping query ranges before generation.
- Bound generation by the earliest cached start and latest cached end, then filter each projection through `eventBelongsToEntry`.
- Preserve `COUNT` and `UNTIL` semantics.
- Never insert generated events into someday queries.

## Tests

- Weekly weekday changes.
- Interval changes.
- `COUNT` and `UNTIL` expansion/contraction.
- This-and-following split from the middle and first occurrence.
- Recurrence removal.
- Overlapping day/week ranges do not duplicate entities.
- Temporary IDs are stable within a mutation and replaced after refetch.
- Active selection remains attached to the edited occurrence.

## Acceptance criteria

- Rule changes immediately produce the expected visible occurrence set.
- No unbounded recurrence generation occurs.
- Existing IDs are reused when safe; temporary IDs are limited to new previews.
- Canonical refetch removes every temporary ID.
- Projection behavior is covered by pure unit tests independent of React.

## Non-goals

- Predicting final MongoDB or Google IDs.
- Client-side persistence of generated instances.
- Full RFC recurrence support beyond `CompassEventRRule`.


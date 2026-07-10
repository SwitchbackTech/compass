# Slice 4: Optimistic Shared-Field Edits

## Goal

Make title, description, priority, and other non-temporal series edits appear immediately for all affected cached occurrences.

## Field contract

Start with fields accepted by `EventUpdateSchema` that do not alter occurrence placement:

- `title`
- `description`
- `priority`
- `isSomeday` only where the existing product flow already supports it

Do not blindly copy provider identifiers, `_id`, `user`, `updatedAt`, `startDate`, `endDate`, or `recurrence.eventId` from the edited instance.

## Scope behavior

### This event

Keep the current single-instance upsert.

### All events

Patch every cached event whose `recurrence.eventId` matches the edited instance. Preserve its identity, dates, and provider data.

### This and following

Patch matching series instances whose original start is at or after the edited instance's original start. Earlier instances remain unchanged.

Date comparison must use Compass date parsing utilities and support both date-only and date-time values.

## Mutation integration

- Read the original instance before optimistic mutation.
- Compute the projection in `onMutate` after query cancellation.
- Continue using settle-time invalidation for canonical convergence.
- Use the series ID as the write-coordination key for series scopes; keep instance ID for `THIS_EVENT`.
- Continue skipping recurring edits in undo history until a complete series snapshot design exists.

## Interaction coverage

- Event form title and description.
- Priority picker in form.
- Day/week context-menu priority changes once scope selection is available.
- Timed and all-day cards.

## Tests

- All-events title patches past and future cached instances.
- This-and-following title leaves earlier cached instances intact.
- Dates, IDs, recurrence IDs, and Google IDs are preserved.
- Unrelated series with the same title/date is untouched.
- The change is visible while the repository promise is pending.
- Settle-time refetch replaces optimistic fields with server truth.
- Repository failure eventually restores server truth and reports the error.

## Acceptance criteria

- Shared-field series edits update every affected cached day/week occurrence synchronously.
- No occurrence moves or disappears for a shared-field-only edit.
- Payloads sent to the repository are unchanged.
- Existing standalone and `THIS_EVENT` behavior does not regress.

## Non-goals

- Time changes.
- Recurrence-rule changes.
- Adding series-scope undo/redo.


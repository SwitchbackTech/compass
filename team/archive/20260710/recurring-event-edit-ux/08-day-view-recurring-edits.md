# Slice 8: Complete Day-View Recurring Edits

## Goal

Give day view the same recurrence-scope choices and optimistic behavior as week view across all supported edit interactions.

## Current shape

Day view already uses shared query caches, event cards, the event form, and `useEventMutations`. The missing work is primarily interaction and scope-selection consistency, not a second recurrence engine.

## Scope-selection design

Extract the existing recurrence-scope decision into a view-neutral component/hook used by both day and week flows.

The selector must:

- appear only when the target is a recurring instance and the operation supports multiple scopes;
- offer `This event`, `This and following`, and `All events` where backend schemas permit them;
- preserve the pending edit while the user chooses;
- cancel without mutating cache or repository;
- return a typed `RecurringEventUpdateScope` to the originating action.

Keep operation-specific wording concise, such as “Apply this change to…”.

## Interactions

- Open event and save form edits.
- Drag timed and all-day events.
- Resize start/end or all-day span.
- Keyboard nudge.
- Context-menu priority change.
- Delete.

Direct actions must not silently default to `THIS_EVENT` unless that behavior is explicitly retained as the product contract. Reuse one scope selector instead of separate dialogs for each gesture.

## Draft and interaction lifecycle

- Finish the visual gesture first, but do not persist until scope is selected.
- Keep the edited event visually selected while the selector is open.
- On cancel, restore the pre-gesture draft/card state.
- On confirm, submit once and let the shared optimistic projection update both day and week caches.
- Prevent double submission from keyboard and pointer completion paths.

## Accessibility

- Scope selector has an accessible name and initial focus.
- Options are real buttons/radios with semantic names.
- Escape cancels and returns focus to the edited card.
- Keyboard-only drag/nudge flows can complete scope selection.
- Tests use roles, accessible names, text, and `user-event`.

## Tests

- Form edit for all three scopes.
- Timed drag/resize and all-day resize.
- Keyboard nudge.
- Context priority and delete.
- Cancel restores the original event.
- Day and week cache entries update together while repository is pending.
- Recurrence selector is not shown for standalone events.

## Acceptance criteria

- Every supported day interaction submits the intended recurrence scope.
- Day view updates immediately through the shared projection.
- No week-specific recurrence logic is duplicated.
- Pointer and keyboard flows are covered with semantic RTL tests.
- Focus returns predictably after confirm or cancel.

## Non-goals

- New recurrence options.
- A day-specific cache or mutation hook.
- Redesigning the event form.


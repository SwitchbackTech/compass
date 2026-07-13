# Slice 1: Characterize Recurring-Edit Latency

## Goal

Establish an executable baseline for where recurring edits remain stale or flicker. This slice changes no production behavior.

## Questions to answer

- Does `onMutate` run immediately for every edit entry point?
- Which scope/field combinations cannot be represented by the current single-instance upsert?
- Can an SSE invalidation refetch over a pending optimistic update?
- Do day and week caches contain identical instance shapes and recurrence metadata?
- Does the perceived delay originate before the repository call, during provider propagation, or during cache convergence?

## Scope

- Form saves, drag, resize, keyboard nudge, context-menu priority changes, and deletion.
- `THIS_EVENT`, `ALL_EVENTS`, and `THIS_AND_FOLLOWING_EVENTS`.
- Timed and all-day events in day and week queries.
- Compass-local and remote repository sources where existing tests can cover them without login setup.

## Implementation

1. Extend `useEventMutations.test.tsx` with a deferred repository promise. Assert cache state immediately after `edit()` and before resolving it.
2. Seed overlapping day, week, previous-week, and next-week query entries. Verify which entries change for each operation.
3. While the edit is pending, trigger the same invalidation used by event and Google SSE hooks. Record whether a refetch replaces the optimistic value.
4. Add focused interaction coverage for each day/week entry point to prove the submitted payload and `applyTo` value.
5. Use test assertions as the durable instrumentation. Remove console logging, timing hooks, or debug UI after the behavior is understood.

## Scenario matrix

At minimum cover:

| Scope | Change | Expected immediate state |
| --- | --- | --- |
| This event | Title | Edited instance only |
| This event | Move | Old position removed; new position inserted |
| All events | Title | All cached series instances updated |
| All events | Time | All cached dates retain their day and adopt the new time |
| This and following | Title | Cutoff and future instances updated |
| This and following | Move/rule | Old future occurrences removed; replacement occurrences shown |

## Deliverable

A focused regression suite that initially documents failures and passes as later slices land. If tests cannot be committed failing, mark unimplemented cases with `test.todo` and precise expected behavior.

## Acceptance criteria

- Every edit entry point and recurrence scope has a documented payload path.
- Tests prove current cache state before repository settlement.
- SSE-during-mutation behavior is known and captured.
- No permanent production instrumentation is introduced.

## Non-goals

- Fixing cache behavior.
- Changing backend recurrence semantics.
- Performance benchmarking beyond the mutation lifecycle.


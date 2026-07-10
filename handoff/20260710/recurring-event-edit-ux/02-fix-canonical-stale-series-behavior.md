# Slice 2: Fix Canonical Stale-Series Behavior

## Goal

Guarantee that a split series has correct persisted state before optimistic rendering can conceal latency. This slice owns the stale-recurrence regression represented by #1744.

## Required invariant

After `THIS_AND_FOLLOWING_EVENTS` at cutoff `C`:

- old-series instances before `C` remain attached to the old base;
- no old-series instance exists at or after `C`;
- replacement instances at or after `C` point to the new base;
- `readAll` hydrates each instance from the correct base rule;
- Google and Compass eventually describe the same two series.

Use the original stored instance start as `C`. Do not derive the cutoff from the edited start.

## Investigation path

1. Add a database-level regression around `CompassEventFactory.genThisAndFollowingEvents` and the executor/service operations it emits.
2. Assert Mongo state after truncation and new-series creation, not only outgoing Google requests.
3. Exercise the existing Compass-to-Google propagation suite and Google-to-Compass split/upsert suite.
4. Inspect deletion boundaries for timed and all-day events. The existing backend computes different `until` values for them.
5. Confirm `readAll` excludes bases and hydrates instance rules from the correct replacement base.

## Cases

- Timed weekly series moved to another weekday.
- Timed series with a duration crossing midnight.
- All-day series split at a middle occurrence.
- Split at the first occurrence, which should follow the backend's `ALL_EVENTS` path.
- Cancellation of this and following.
- Finite `COUNT` and `UNTIL` rules.
- Google-originated series with provider identifiers.
- Compass-originated series after provider round-trip.

## Implementation constraints

- Fix the earliest layer that violates the invariant.
- Keep recurrence expansion in backend/core code; do not compensate in the web cache.
- Preserve transaction/session use across truncation, deletion, and creation.
- Avoid broad cleanup of sync code unless the regression proves it necessary.
- Do not weaken existing provider-propagation assertions.

## Likely files

- `packages/backend/src/event/classes/compass.event.generator.ts`
- `packages/backend/src/event/services/event.service.ts`
- `packages/backend/src/event/services/recur/`
- `packages/backend/src/sync/services/event-propagation/__tests__/`
- `packages/backend/src/event/services/event.service.test.ts`

## Acceptance criteria

- The database invariant above is asserted in a focused backend test.
- A subsequent `readAll` contains the replacement schedule and no stale old occurrence.
- Existing Compass/Google recurrence propagation tests pass.
- The fix works for timed and all-day series.
- No frontend workaround is required for canonical correctness.

## Verification

- Run the focused backend test files first.
- Run `bun test:backend`, `bun type-check`, and `bun lint` before handoff.

## Non-goals

- Optimistic cache updates.
- Redesigning Google sync.
- Changing the product meaning of recurrence scopes.


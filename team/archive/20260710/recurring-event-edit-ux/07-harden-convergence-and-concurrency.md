# Slice 7: Harden Convergence and Concurrency

## Goal

Ensure optimistic recurring edits remain correct through refetches, SSE, failures, rapid edits, and navigation.

## Risks to address

- SSE invalidation may refetch over a pending optimistic projection.
- Two edits to different instances of one series may execute concurrently because current ordering is instance-ID based.
- A canonical response replaces temporary IDs while the draft still references one.
- A failed write relies on invalidation rather than per-mutation rollback.
- A superseded edit may skip its write while its optimistic state remains visible.

## Series-level coordination

For `ALL_EVENTS` and `THIS_AND_FOLLOWING_EVENTS`, derive the logical write key from `recurrence.eventId`. Use the instance ID for `THIS_EVENT` and standalone edits.

Update waiting/coalescing tests to cover:

- two edits to different instances of one series;
- a series edit followed by an individual edit;
- an individual edit followed by a series split;
- superseded edits and failed preceding writes.

Define and document ordering rather than depending on network completion timing.

## SSE/refetch policy

Preferred policy:

1. allow invalidation to mark queries stale;
2. do not let refetch replace a live optimistic recurring projection;
3. once relevant event mutations settle, perform one canonical invalidation;
4. if suppressing refetch is impractical, reapply active projections after incoming query data is normalized.

Choose the smallest implementation supported by the characterization tests. Avoid a general-purpose offline mutation journal.

## Temporary-ID reconciliation

- Refetch is the primary reconciliation mechanism.
- Draft/selection state should resolve by retained edited-instance ID where possible.
- If the active selection uses a temporary ID, map it to a canonical occurrence by series identity plus occurrence start after refetch.
- Remove all optimistic IDs when no active projection references them.

## Failure behavior

Maintain the existing product policy: report the error, then invalidate back to server truth. Add an explicit loading/optimistic flag only if tests prove users can interact with invalid preview instances during the convergence window.

## Tests

- SSE event during a deferred mutation.
- Google SSE event during a deferred mutation.
- Success and failure convergence.
- Rapid edits across different instances of one series.
- Navigate day → week → adjacent week while pending.
- Mutation settles while component is unmounted.
- Canonical data replaces every preview ID without duplicate cards.

## Acceptance criteria

- Pending optimistic state is not visibly overwritten by SSE/refetch.
- Series writes execute in a deterministic order.
- One final invalidation establishes canonical state.
- Failures restore server truth and surface the existing error path.
- No temporary IDs survive convergence.
- Focus and active draft do not disappear during successful reconciliation.

## Non-goals

- General offline support.
- A new global mutation framework.
- Series-scope undo/redo unless separately designed.


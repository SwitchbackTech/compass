# Slice 3: Build the Optimistic Recurrence Projection

## Goal

Introduce the smallest reusable architecture needed to update all cached instances of a recurring series atomically.

## Design

Create a pure projection function and a cache adapter:

```ts
type RecurringEditProjection = {
  removeIds: ReadonlySet<string>;
  upserts: readonly Schema_Event[];
};

projectRecurringEdit(input): RecurringEditProjection;
applyRecurringEditProjection(queryClient, projection, source): void;
```

Suggested locations:

- `packages/web/src/events/recurrence/projectRecurringEdit.ts`
- `packages/web/src/events/queries/event.recurrence.cache.ts`

Do not add a barrel file.

## Series identity

- Instance series ID: `event.recurrence?.eventId`.
- Base events are not expected in normal day/week cache results.
- A standalone event has no series ID.
- Compare IDs as strings and require the active repository source to match.

## Projection inputs

The projection needs:

- the original cached instance;
- the edited instance;
- `applyTo`;
- deduplicated cached instances in the same series;
- cached range metadata only when future recurrence generation is added.

Keep TanStack Query types outside the pure projection. Build the input in the adapter/mutation layer.

## Atomic cache application

For each matching query entry, make one `setQueryData` update that:

1. removes all `removeIds` from `ids` and `entities`;
2. evaluates each upsert with `eventBelongsToEntry`;
3. removes an upsert from entries it no longer belongs to;
4. inserts or merges it into entries it belongs to;
5. preserves unrelated events, pagination metadata, and ID ordering where possible.

Avoid calling remove and insert helpers sequentially because React could observe an intermediate state.

## Initial supported behavior

- `THIS_EVENT` delegates to the current upsert semantics.
- Series scopes may initially return only projections for cached existing instances.
- Rule-generated occurrences and temporary IDs belong to Slice 6.

## Tests

- Same instance duplicated across day and week caches.
- Same series present in adjacent prefetched ranges.
- Unrelated source and someday caches remain unchanged.
- Edited event moves between cached ranges.
- Removal and replacement happen in one cache callback per entry.
- Missing original event safely falls back to the existing single-event behavior.
- Duplicate cached series instances are deduplicated by ID before projection.

## Acceptance criteria

- The projection is deterministic and independent of React/TanStack Query.
- The adapter updates all active-source calendar caches.
- No cached base-event lookup is introduced.
- Existing non-recurring optimistic tests continue to pass unchanged.
- The mutation layer has one clear branch between single-event and recurring projections.

## Non-goals

- Recurrence generation.
- Provider ID reconciliation.
- Series-scope undo/redo.


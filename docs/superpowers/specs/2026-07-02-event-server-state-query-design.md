# Event Server State in TanStack Query — Design

## Goal

Make TanStack Query the sole owner of persisted Event data in the web app while
keeping Redux for genuinely client-only calendar state. Remove the remaining
Redux event entity/list mirrors, async mutation slices, and listener-driven
persistence without forcing transient draft or interaction state into the query
cache.

## Starting Point

PR #1920 makes TanStack Query responsible for fetching and caching day, week,
and Someday Event reads, but each query still copies its result into Redux.
Components render Redux selectors, and writes still start as Redux actions that
listener middleware routes into operations. Those operations optimistically
modify Redux and invalidate TanStack Query afterward.

This creates two owners for the same persisted Event data:

- TanStack Query owns freshness, fetching, and cached ranges.
- Redux owns the Event entities and ID lists used for rendering and optimistic
  writes.

The next migration removes that duplication.

## State Ownership Boundary

### TanStack Query owns

- persisted Event entities returned by repositories;
- day, week, and Someday Event collections;
- loading, fetching, and read errors;
- create, edit, delete, convert, and reorder mutation state;
- optimistic persisted-Event updates and rollback snapshots;
- cache invalidation after repository writes, SSE notifications, and Event
  repository source changes.

### Redux retains

- Draft Event state while a form, drag, resize, or keyboard interaction is in
  progress;
- calendar interaction state that coordinates multiple components;
- pending Event IDs only where the UI needs a global cross-component guard that
  cannot be expressed by a colocated mutation result;
- view, settings, authentication UI, and other client-only state.

The migration should delete `pendingEventsSlice` if all consumers can derive
pending IDs from TanStack Query's mutation cache. It should remain only if a
concrete interaction consumer requires a stable global set that mutation
filters cannot provide cleanly.

## Cache Model

Keep the existing source- and range-aware query keys:

```ts
["events", "day", { source, startDate, endDate, someday: false }]
["events", "week", { source, startDate, endDate, someday: false }]
["events", "someday", { source, startDate, endDate, someday: true }]
```

Each cached query continues to store normalized data:

```ts
type NormalizedEventQueryData = {
  ids: string[];
  entities: Record<string, Schema_Event>;
};
```

Someday queries additionally retain pagination metadata. Normalization remains
useful because optimistic updates must edit an Event consistently inside every
cached range containing its ID.

Introduce focused cache utilities with no React or Redux dependencies:

- enumerate all Event query entries with `queryClient.getQueriesData`;
- find an Event by ID across active or cached Event queries;
- insert, replace, patch, or remove an Event in matching cached ranges;
- snapshot all Event query entries before an optimistic write;
- restore those exact entries on rollback;
- update Someday ordering without changing unrelated ranges.

Cache utilities must be immutable and unit-tested. They must preserve each
query's pagination metadata and must not invent membership for a range when the
Event does not satisfy that range. When range membership is ambiguous after an
edit or recurrence operation, remove the known stale representation and rely
on invalidation for canonical membership.

## Read API and Derived View Models

The primary day, week, and Someday hooks should return query data directly and
stop dispatching Redux synchronization effects. Status-only hooks may remain
where a consumer needs only `isPending` or `isFetching`.

Replace Redux Event selectors with pure derivation functions and focused hooks:

- `useWeekEventViewModel(range)` returns normalized entities, timed Grid Events,
  All-Day Events, and all-day row count for that week query;
- `useDayEventViewModel(range)` returns raw day Events, timed Grid Events,
  All-Day Events, and row count for that day query;
- `useSomedayEventViewModel(range)` returns ordered Someday Events and section
  groupings;
- `useEventById(id)` searches known Event query caches and returns the Event or
  `null`;
- pure functions perform layout and filtering so tests do not require React.

Consumers should call one view-model hook near the owning view or interaction
coordinator and pass derived data down where practical. Do not replace Redux
prop drilling with many unrelated `useQuery` calls in leaf components.

## Mutation API

Create a focused Event mutation module exposing hooks for the seven persisted
write behaviors:

- create calendar or Someday Event;
- edit Event;
- delete calendar Event;
- convert calendar Event to Someday Event;
- convert Someday Event to calendar Event;
- delete Someday Event;
- reorder Someday Events.

Repository calls remain framework-independent functions. React hooks bind those
functions to `useMutation` and the active Event repository source.

Each mutation follows this lifecycle:

1. `onMutate` cancels Event reads that could overwrite the optimistic state.
2. Snapshot every Event query entry that may be changed.
3. Apply an immutable optimistic cache update.
4. Persist through the repository selected from the mutation's captured source.
5. Preserve existing anonymous-change prompting after a successful anonymous
   write.
6. `onError` restores all snapshots and reports the operation error.
7. `onSettled` invalidates `eventQueryKeys.all` so recurrence expansion,
   server-generated changes, and range membership become canonical.

Mutation keys include the operation and Event ID when available. Global pending
guards use `useIsMutating` or `useMutationState` with those keys rather than
Redux async slices. Cancellation means aborting or ignoring the repository
result; it must not leave an optimistic cache update without either settlement
or rollback.

### Operation-specific optimistic behavior

- **Create:** assign the client ID before mutation, insert into the currently
  relevant day/week or Someday cache, and remove it on rollback.
- **Edit:** patch every cached copy of the Event. If `shouldRemove` is true,
  remove it from all lists. Recurring edits invalidate all ranges after the
  optimistic patch.
- **Delete:** remove the Event from every cached list and entity map; restore all
  snapshots on failure.
- **Calendar → Someday:** remove the Event from calendar ranges and insert the
  optimistic converted Event into active Someday queries.
- **Someday → calendar:** remove it from Someday queries and insert it into the
  active destination day/week ranges.
- **Delete Someday:** remove it from Someday queries and restore on failure.
- **Reorder Someday:** patch `order` and IDs consistently in each Someday cache;
  restore the previous order on failure.

## Action Call-Site Migration

Replace listener-triggering Redux dispatches with mutation callbacks exposed by
hooks. High-fan-out action modules such as Week Draft actions and Planner Sidebar
actions should receive a narrow `eventMutations` dependency instead of importing
query internals.

Use an interface such as:

```ts
type EventMutations = {
  create: (event: Schema_Event) => void;
  edit: (payload: Payload_EditEvent) => void;
  delete: (payload: Payload_DeleteEvent) => void;
  convertToSomeday: (payload: Payload_ConvertEvent) => void;
  convertToCalendar: (payload: Payload_ConvertEvent) => void;
  deleteSomeday: (payload: Payload_DeleteEvent) => void;
  reorderSomeday: (payload: Payload_Order[]) => void;
};
```

Existing UI hooks can keep their public behavior while changing their internal
dependency from `dispatch(action)` to the appropriate mutation function. This
keeps the migration incremental and avoids rewriting draft/interaction logic at
the same time.

## Auth, Google Revocation, and SSE

Keep query invalidation as the realtime boundary:

- Event SSE invalidates day/week or Someday scopes;
- Google sync completion invalidates all Event queries;
- login and repository-source transitions remove stale-source queries and
  re-key active reads;
- Google revocation removes Google-origin Events from every cached Event query,
  refreshes the repository source, removes remote-source queries, and then lets
  active local queries refetch.

The Google revocation path must use a cache utility instead of dispatching
`eventsEntitiesSlice.actions.removeEventsByOrigin`.

## Incremental Delivery Order

1. Add and test framework-independent Event cache utilities.
2. Expose query-native read view models and migrate Week consumers.
3. Migrate Day consumers.
4. Migrate Someday consumers and section derivation.
5. Add query-native mutations with optimistic cache updates and rollback.
6. Replace form, common-hook, Week Draft, and Planner Sidebar mutation
   dispatches with the mutation interface.
7. Move pending/error consumers to mutation state.
8. Convert Google revocation cleanup to cache updates.
9. Delete Event listener registration, Redux persisted-Event slices/selectors,
   query-to-Redux synchronization effects, and obsolete operation runtime code.
10. Update architecture docs and run full automated and manual acceptance.

Every delivery step must leave the app runnable and preserve the previous
public behavior. Temporary compatibility should be local to the step that needs
it and deleted before the final cleanup task.

## Error Handling and Consistency Rules

- Keep the current user-facing error reporting behavior for calendar mutations.
- Preserve the current quieter Someday read-error behavior unless product
  requirements change separately.
- Never mutate cached objects in place.
- Snapshot before every optimistic update and restore the complete affected
  query entries on failure.
- Always invalidate after settlement, including rollback, so cache membership
  and recurring-series expansion are reconciled with repository truth.
- Do not clear Draft Event or interaction state merely because a background
  refetch occurs.
- Query source and repository source must be captured from the same value for a
  mutation, preventing local/remote drift during auth transitions.

## Testing Strategy

### Pure cache tests

Cover insert, patch, remove, source isolation, multiple cached ranges,
pagination preservation, Someday reorder, and exact rollback restoration.

### Hook tests

For every mutation, assert:

- the optimistic cache state is visible before the repository resolves;
- success invalidates Event queries;
- failure restores all snapshots;
- pending state is discoverable through mutation keys;
- anonymous writes preserve the signup prompt behavior;
- recurrence and conversion operations invalidate all relevant ranges.

### Consumer tests

Update Week, Day, Planner Sidebar, forms, context menus, draft actions, and
interaction coordinators to render from query-provided data. Prefer real
`QueryClientProvider` harnesses and semantic assertions over module-wide mocks.

### Deletion checks

Use repository-wide searches to prove no production imports remain for deleted
Event entity/list selectors, async mutation slices, listener registrations, or
Redux-to-query synchronization code.

### Verification

Run focused tests after each task, then:

```bash
bun run test:web
bun run type-check
bun run lint
```

Manual acceptance must cover anonymous and authenticated create/edit/delete,
calendar↔Someday conversion, Someday reorder, recurrence scopes, failed-write
rollback, Week/Day navigation cache reuse, Google revocation, and SSE refresh.

## Documentation Updates

Update:

- `docs/frontend/frontend-runtime-flow.md` to show query-native reads and
  mutations with no Redux Event mirror;
- `docs/development/feature-file-map.md` so Event frontend entry points point to
  queries/mutations instead of listeners and slices;
- `docs/acceptance/events.md` if mutation rollback or cache-navigation checks
  are not already explicit.

## Out of Scope

- moving Draft Event or drag/resize state out of Redux;
- changing repository persistence contracts or backend Event APIs;
- redesigning recurrence semantics;
- introducing offline mutation queues or persisted TanStack Query caches;
- changing task storage;
- altering SSE event contracts;
- refactoring unrelated auth, view, or settings Redux state.

## Completion Criteria

- Persisted Event data has one frontend owner: TanStack Query.
- No Event read hook dispatches Redux synchronization actions.
- No persisted Event write begins through Redux listener middleware.
- All Event render and interaction consumers derive persisted data from query
  caches.
- Redux contains only client-side Event draft/interaction state that has a
  concrete consumer.
- Optimistic create/edit/delete/convert/reorder operations rollback correctly.
- Source transitions, Google revocation, and SSE produce correct cache state.
- Full web tests, type-check, lint, and manual Event acceptance pass.

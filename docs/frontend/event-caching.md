# Event Caching

How Compass caches events.

## The one-sentence model

**TanStack Query is the cache and the single owner of persisted events.** Each
cache entry holds one *window* of events — a `(source, scope, date range)` slice —
stored in a normalized `{ ids, entities }` shape. Views render from these entries;
mutations edit them optimistically and then let the server reconcile.

Redux does **not** hold persisted events (only transient drafts/interaction). See
[State Systems](./frontend-runtime-flow.md#state-systems).

## Cache-key anatomy

Every event cache entry is keyed by three parts (`event.query.keys.ts`):

```
["events", scope, { source, startDate, endDate, someday }]
             │              │
             │              └─ "local" (IndexedDB) or "remote" (API)
             └─ "day" | "week" | "someday"
```

```
QueryClient cache
├─ ["events","week",   {source:"local",  2026-07-01 … 07-08}] → { ids:[…], entities:{…} }
├─ ["events","day",    {source:"local",  2026-07-03 … 07-04}] → { ids:[…], entities:{…} }
└─ ["events","someday",{source:"local",  2026-07-01 … 08-01}] → { ids, entities, pagination }
```

Two consequences fall straight out of the key:

- **Source is part of the key**, so `local` and `remote` events never collide.
  A mutation reads and writes only its captured source (no cross-source drift).
- **Range is part of the key**, so navigating to a new week fetches; navigating
  back to a recent one renders instantly from cache (within `staleTime`, 2 min).

## Reads: view → cache → screen

```
useWeekEventsQuery(range)
   │  key = ["events","week",{ source, range }]
   ▼
TanStack Query ── cache hit? ──► return cached { ids, entities }
   │ miss / stale
   ▼
fetchWeekEvents → repository.get(source) → filter to range → normalize → cache
   │
   ▼
deriveCalendarEventViewModel(query.data)   // pure; memoized on the data reference
   ▼
timedEvents / allDayEvents / rowCount → components
```

- The active **source** comes from `event.repository.source.store.ts` (local vs
  remote — see [Repository Selection](./frontend-runtime-flow.md#repository-selection)).
- The view model is derived by a pure function memoized on the `query.data`
  reference, so all consumers of a week's data share one computation.

## Writes: optimistic, then reconcile

Mutations go through the narrow `EventMutations` interface
(`useEventMutations.ts`). Each one follows the same lifecycle:

```
mutate(payload)
   │
   ├─ onMutate:   cancel in-flight reads
   │              → apply optimistic edit to matching cache entries   (instant UI)
   │
   ├─ mutationFn: persist via repository (captured source)
   │
   ├─ onError:    report the error (no cache rollback)
   │
   └─ onSettled:  once NO event mutation remains in flight (checked on a
                  deferred macrotask), invalidate ["events"] → refetch to
                  get canonical data
```

- **Optimistic edits** insert/patch/remove events across exactly the entries they
  belong to, so a created or dragged-in event shows immediately — before the
  server responds.
- **No per-mutation rollback.** Rapid successive edits are allowed (events stay
  interactive while pending), so a failed mutation must not restore a snapshot —
  that would clobber a newer edit's optimistic write. Instead, failures leave the
  optimistic value in place and the settle-time refetch converges the cache to
  server truth. Invalidation is deferred to a macrotask and gated on
  `queryClient.isMutating(...) === 0` so a refetch never overwrites another
  mutation's live optimistic update (the TanStack Query recipe for concurrent
  optimistic updates, deferred so simultaneous settles cannot all skip).
- **Writes racing their own create wait.** Editing or deleting a just-created
  event defers its repository call via `waitForPendingEventCreate` until the
  create settles: the id doesn't exist server-side before then, and a skipped
  delete would resurrect the event once the create landed. When the create
  fails, the dependent write is skipped entirely.
- **Pending state** is derived from TanStack Query's mutation state via
  `usePendingEventIds`, not stored separately. It never blocks interaction; its
  only UI is the "Syncing changes…" spinner in `PlannerAccountSummary`.

## One membership rule for reads and writes

Reads and optimistic writes must agree on "does this event belong in this
window", or an edit could render in a spot a refetch would disagree with. Both
sides call the **same** predicate:

- `eventMatchesRange` (`event.query.normalize.ts`) — timed events by containment,
  all-day by overlap. Used by the read filter *and* by `eventBelongsToEntry`
  (`event.query.cache.ts`), which layers on the source + scope check for writes.

## What refreshes the cache

- **Mutations** — invalidate `["events"]` on settle (see above).
- **SSE** — background `EVENT_CHANGED` / `SOMEDAY_EVENT_CHANGED` invalidate the
  relevant scope so it refetches. See [SSE Runtime](./frontend-runtime-flow.md#sse-runtime).
- **Auth / source transitions** — refresh the repository source store and drop
  stale entries (e.g. Google revoked → fall back to `local`).

## Navigation: placeholder data + prefetch

Two small TanStack features make prev/next navigation feel instant:

- **Someday keeps the previous month's list visible** while a new month
  fetches (`placeholderData: keepPreviousData` on `somedayEventsQueryOptions`).
  Deliberately *not* applied to day/week: the calendar grid gates its entire
  render on `query.isPending` and positions events by absolute date, so
  keeping stale data visible there would transiently render the previous
  range's events in the new range's grid columns. Extending this to the grid
  needs those consumers rewired to treat `isPlaceholderData` as still-loading.
- **The adjacent day/week is prefetched** as soon as the current one renders
  (`usePrefetchAdjacentEvents`, wired into `useWeek`/`useDayEvents`). It calls
  `queryClient.prefetchQuery` with the *same* options builder and date
  formatting the real read hook uses, so the warmed entry lands under the
  exact key a subsequent read looks up. `prefetchQuery` is a no-op for
  entries that are already cached and fresh, so this adds no extra fetches on
  repeat renders of the same range — only the next click resolves from cache
  instead of paying a fetch.

## What the cache is *not*

- **Not Redux.** Redux owns only the in-progress draft and calendar interaction
  state (`draft.slice.ts`). Do not mirror persisted events into Redux.
- **Not IndexedDB directly.** IndexedDB is the *offline store behind the `local`
  repository*; components never touch it — they read through the query cache.

## Testing note

Tests seed the query cache directly (there is no Redux→query bridge): pass an
`events` array to the render/store harnesses, which calls `seedEventQueries`
(`__tests__/utils/event-query-test-data.ts`). See the
[Testing Playbook](../development/testing-playbook.md).

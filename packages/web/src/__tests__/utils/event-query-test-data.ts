import { type QueryClient } from "@tanstack/react-query";
import {
  type EventMutationOperation,
  eventMutationKeys,
} from "@web/events/mutations/event.mutation.keys";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";

/**
 * Builds the normalized `{ ids, entities }` shape the event query caches store.
 * Events without an `_id` are skipped. Shared by the render test harnesses so
 * they seed the cache identically.
 */
// TODO(packet-03-phase-3c): render-test harnesses across the component tree
// still seed legacy Schema_Event-shaped (`_id`) fixtures; cast until those
// fixtures are converted to the new `Event` contract (see
// packages/web/src/__tests__/utils/factories/event.factory.ts for the
// contract-shaped factory new tests should use instead).
export const toNormalizedEventQueryData = (
  events: Array<{ _id?: string }>,
): NormalizedEventQueryData =>
  ({
    ids: events.flatMap((event) => (event._id ? [event._id] : [])),
    entities: Object.fromEntries(
      events.flatMap((event) => (event._id ? [[event._id, event]] : [])),
    ),
  }) as unknown as NormalizedEventQueryData;

/**
 * First-class query-seeding entry point for tests: registers the given events
 * as `initialData` for every event read scope (day/week/someday), so any event
 * query a component mounts resolves from the cache.
 */
export const seedEventQueries = (
  queryClient: QueryClient,
  events: Array<{ _id?: string }>,
) => {
  queryClient.setQueryDefaults(eventQueryKeys.all, {
    initialData: toNormalizedEventQueryData(events),
  });
};

/**
 * Seeds an in-flight (status "pending") mutation into the mutation cache for
 * each event id, so hooks deriving pending state from TanStack Query mutation
 * state (e.g. `useHasPendingEventMutations`) see the events as syncing.
 */
export const seedPendingEventMutations = (
  queryClient: QueryClient,
  eventIds: string[],
  operation: EventMutationOperation = "replace",
) => {
  for (const eventId of eventIds) {
    queryClient.getMutationCache().build(
      queryClient,
      { mutationKey: eventMutationKeys.operation(operation) },
      {
        context: undefined,
        data: undefined,
        error: null,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: "pending",
        variables: { _id: eventId },
        submittedAt: Date.now(),
      },
    );
  }
};

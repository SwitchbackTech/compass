import { type QueryClient, type QueryKey } from "@tanstack/react-query";
import { type Origin } from "@core/constants/core.constants";
import { type Payload_Order, type Schema_Event } from "@core/types/event.types";
import { type EventRepositorySource } from "@web/common/repositories/event/event.repository.factory";
import { eventQueryKeys } from "./event.query.keys";
import {
  type EventQueryData,
  type EventQueryKey,
  type EventQueryKeyMetadata,
  type EventQueryScope,
  type EventQuerySnapshot,
} from "./event.query.types";

type EventQueryEntry = {
  queryKey: EventQueryKey;
  data: EventQueryData;
  scope: EventQueryScope;
  metadata: EventQueryKeyMetadata;
};

type EventQueryFilter = {
  source?: EventRepositorySource;
  scope?: EventQueryScope;
};

const isEventQueryKey = (queryKey: QueryKey): queryKey is EventQueryKey => {
  if (queryKey[0] !== eventQueryKeys.all[0] || queryKey.length !== 3) {
    return false;
  }

  const scope = queryKey[1];
  const metadata = queryKey[2];
  return (
    (scope === "day" || scope === "week" || scope === "someday") &&
    typeof metadata === "object" &&
    metadata !== null &&
    "source" in metadata
  );
};

const matchesFilter = (entry: EventQueryEntry, filter: EventQueryFilter) =>
  (filter.source === undefined || entry.metadata.source === filter.source) &&
  (filter.scope === undefined || entry.scope === filter.scope);

export function getEventQueryEntries(
  queryClient: QueryClient,
  filter: EventQueryFilter = {},
): EventQueryEntry[] {
  return queryClient
    .getQueriesData<EventQueryData>({ queryKey: eventQueryKeys.all })
    .flatMap(([queryKey, data]) => {
      if (!data || !isEventQueryKey(queryKey)) return [];
      const entry: EventQueryEntry = {
        queryKey,
        data,
        scope: queryKey[1],
        metadata: queryKey[2],
      };
      return matchesFilter(entry, filter) ? [entry] : [];
    });
}

export function findEventInCache(
  queryClient: QueryClient,
  eventId: string,
  source?: EventRepositorySource,
): Schema_Event | null {
  for (const { data } of getEventQueryEntries(queryClient, { source })) {
    const event = data.entities[eventId];
    if (event) return event;
  }
  return null;
}

export function snapshotEventQueries(
  queryClient: QueryClient,
  filter: EventQueryFilter = {},
): EventQuerySnapshot[] {
  return getEventQueryEntries(queryClient, filter).map(
    ({ queryKey, data }) => ({
      queryKey,
      data,
    }),
  );
}

export function restoreEventQueries(
  queryClient: QueryClient,
  snapshots: EventQuerySnapshot[],
) {
  for (const { queryKey, data } of snapshots) {
    queryClient.setQueryData(queryKey, data);
  }
}

export function insertEventIntoQueries(
  queryClient: QueryClient,
  event: Schema_Event,
  isMember: (entry: EventQueryEntry) => boolean,
) {
  if (!event._id) throw new Error("Cached Event insertion requires an id");

  for (const entry of getEventQueryEntries(queryClient)) {
    if (!isMember(entry)) continue;
    queryClient.setQueryData<EventQueryData>(entry.queryKey, (current) => {
      if (!current) return current;
      const isPresent = current.ids.includes(event._id as string);
      return {
        ...current,
        ids: isPresent ? current.ids : [...current.ids, event._id as string],
        entities: { ...current.entities, [event._id as string]: event },
      };
    });
  }
}

export function patchEventInQueries(
  queryClient: QueryClient,
  eventId: string,
  patch: Partial<Schema_Event> | ((event: Schema_Event) => Schema_Event),
  filter: EventQueryFilter = {},
) {
  for (const entry of getEventQueryEntries(queryClient, filter)) {
    queryClient.setQueryData<EventQueryData>(entry.queryKey, (current) => {
      const existing = current?.entities[eventId];
      if (!current || !existing) return current;
      const updated =
        typeof patch === "function"
          ? patch(existing)
          : { ...existing, ...patch };
      return {
        ...current,
        entities: { ...current.entities, [eventId]: updated },
      };
    });
  }
}

export function removeEventFromQueries(
  queryClient: QueryClient,
  eventId: string,
  filter: EventQueryFilter = {},
) {
  for (const entry of getEventQueryEntries(queryClient, filter)) {
    queryClient.setQueryData<EventQueryData>(entry.queryKey, (current) => {
      if (!current?.entities[eventId] && !current?.ids.includes(eventId)) {
        return current;
      }
      const entities = { ...current.entities };
      delete entities[eventId];
      return {
        ...current,
        ids: current.ids.filter((id) => id !== eventId),
        entities,
      };
    });
  }
}

export function removeEventsByOriginFromQueries(
  queryClient: QueryClient,
  origins: readonly Origin[],
) {
  const originSet = new Set(origins);
  for (const entry of getEventQueryEntries(queryClient)) {
    queryClient.setQueryData<EventQueryData>(entry.queryKey, (current) => {
      if (!current) return current;
      const removedIds = new Set(
        current.ids.filter((id) => {
          const origin = current.entities[id]?.origin;
          return origin !== undefined && originSet.has(origin);
        }),
      );
      if (removedIds.size === 0) return current;
      const entities = { ...current.entities };
      for (const id of removedIds) delete entities[id];
      return {
        ...current,
        ids: current.ids.filter((id) => !removedIds.has(id)),
        entities,
      };
    });
  }
}

export function reorderSomedayEventsInQueries(
  queryClient: QueryClient,
  orderUpdates: Payload_Order[],
  source?: EventRepositorySource,
) {
  const orderById = new Map(
    orderUpdates.map(({ _id, order }) => [_id, order] as const),
  );
  for (const entry of getEventQueryEntries(queryClient, {
    source,
    scope: "someday",
  })) {
    queryClient.setQueryData<EventQueryData>(entry.queryKey, (current) => {
      if (!current) return current;
      const entities = { ...current.entities };
      for (const [id, order] of orderById) {
        const existing = entities[id];
        if (existing) entities[id] = { ...existing, order };
      }
      const ids = [...current.ids].sort(
        (left, right) =>
          (entities[left]?.order ?? Number.MAX_SAFE_INTEGER) -
          (entities[right]?.order ?? Number.MAX_SAFE_INTEGER),
      );
      return { ...current, ids, entities };
    });
  }
}

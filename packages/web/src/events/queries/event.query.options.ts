import { queryOptions } from "@tanstack/react-query";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";
import { getEventRepositoryBySource } from "@web/events/repositories/event.repository.util";
import { fetchDayEvents } from "./day.event.query";
import { eventQueryKeys } from "./event.query.keys";
import { fetchWeekEvents } from "./week.event.query";

/**
 * Shared cache policy for event reads. `staleTime` lets back-navigation to a
 * recently viewed range render instantly from cache; mutations and SSE still
 * invalidate explicitly. Window-focus refetch covers gaps a laptop sleep /
 * native SSE reconnect may miss while `retry: false` left a failed fetch idle.
 */
const EVENT_QUERY_CACHE_OPTIONS = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  // "always": staleTime would otherwise skip focus refetch for 2 minutes and
  // leave a missed SSE/sleep gap on screen.
  refetchOnWindowFocus: "always" as const,
};

export type EventsQueryArgs = {
  source: EventRepositorySource;
  startDate: string;
  endDate: string;
};

export function dayEventsQueryOptions({
  source,
  startDate,
  endDate,
}: EventsQueryArgs) {
  return queryOptions({
    queryKey: eventQueryKeys.day({ source, start: startDate, end: endDate }),
    queryFn: () =>
      fetchDayEvents(
        { startDate, endDate },
        getEventRepositoryBySource(source),
        source,
      ),
    ...EVENT_QUERY_CACHE_OPTIONS,
  });
}

export function weekEventsQueryOptions({
  source,
  startDate,
  endDate,
}: EventsQueryArgs) {
  return queryOptions({
    queryKey: eventQueryKeys.week({ source, start: startDate, end: endDate }),
    queryFn: () =>
      fetchWeekEvents(
        { startDate, endDate },
        getEventRepositoryBySource(source),
        source,
      ),
    ...EVENT_QUERY_CACHE_OPTIONS,
  });
}

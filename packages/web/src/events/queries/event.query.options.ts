import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";
import { getEventRepositoryBySource } from "@web/events/repositories/event.repository.util";
import { fetchDayEvents } from "./day.event.query";
import { eventQueryKeys } from "./event.query.keys";
import { fetchSomedayEvents } from "./someday.event.query";
import { fetchWeekEvents } from "./week.event.query";

/**
 * Shared cache policy for event reads. `staleTime` lets back-navigation to a
 * recently viewed range render instantly from cache; all data-change paths
 * (mutations, SSE, auth transitions) invalidate explicitly, so fetch triggers
 * stay identical to the pre-migration behavior (mount, key change, invalidation).
 */
const EVENT_QUERY_CACHE_OPTIONS = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
} as const;

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
    queryKey: eventQueryKeys.day({ source, startDate, endDate }),
    queryFn: () =>
      fetchDayEvents(
        { startDate, endDate },
        getEventRepositoryBySource(source),
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
    queryKey: eventQueryKeys.list({
      source,
      scope: "week",
      params: { startDate, endDate, someday: false },
    }),
    queryFn: () =>
      fetchWeekEvents(
        { startDate, endDate },
        getEventRepositoryBySource(source),
      ),
    ...EVENT_QUERY_CACHE_OPTIONS,
  });
}

export function somedayEventsQueryOptions({
  source,
  startDate,
  endDate,
}: EventsQueryArgs) {
  return queryOptions({
    queryKey: eventQueryKeys.list({
      source,
      scope: "someday",
      params: { startDate, endDate, someday: true },
    }),
    queryFn: () =>
      fetchSomedayEvents(
        { startDate, endDate },
        getEventRepositoryBySource(source),
      ),
    ...EVENT_QUERY_CACHE_OPTIONS,
    // Keep the previous month's Someday list visible while a new month range
    // fetches, instead of a momentary empty list. Safe here because the
    // sidebar renders straight from the derived list with no isPending gate.
    //
    // Deliberately NOT applied to day/week options: the calendar grid gates
    // its entire render on `query.isPending` and positions events by absolute
    // date (see MainGridEvents/AllDayEvents/DayCalendarGrid), so keeping stale
    // data visible there would transiently render the previous range's events
    // in the new range's grid columns. Extending this to the grid needs those
    // consumers rewired to treat `isPlaceholderData` as still-loading — a
    // separate, larger change.
    placeholderData: keepPreviousData,
  });
}

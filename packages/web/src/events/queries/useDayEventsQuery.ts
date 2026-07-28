import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { handleError } from "@web/common/utils/event/event.util";
import { dayEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { deriveCalendarEventViewModel } from "./event.view-model";
import { filterEventsByVisibleCalendars } from "./filter-events-by-visible-calendars";

type DayEventsQueryArgs = {
  startDate: string;
  endDate: string;
};

function useDayEventsQueryInternal({ startDate, endDate }: DayEventsQueryArgs) {
  const source = useEventRepositorySource();
  return useQuery(dayEventsQueryOptions({ source, startDate, endDate }));
}

/**
 * Primary day-events read hook. Data is filtered to visible calendars before
 * it leaves this module - no caller can see a hidden calendar's events.
 * TanStack Query owns the normalized (unfiltered) result underneath; this
 * hook and {@link useDayEventViewModel} are the only ways to read it.
 */
export function useDayEventsQuery(args: DayEventsQueryArgs) {
  const query = useDayEventsQueryInternal(args);
  const { data: calendars } = useCalendarsQuery();
  const { error } = query;

  useEffect(() => {
    if (!error) return;
    handleError(error as Error);
  }, [error]);

  const data = useMemo(
    () => filterEventsByVisibleCalendars(query.data, calendars),
    [query.data, calendars],
  );

  return { ...query, data };
}

export function useDayEventViewModel(args: DayEventsQueryArgs) {
  const query = useDayEventsQuery(args);
  const viewModel = useMemo(
    () => deriveCalendarEventViewModel(query.data),
    [query.data],
  );
  return { ...query, ...viewModel };
}

/**
 * Read-only day-events loading state. Subscribes to the same cache entry as
 * {@link useDayEventsQuery} (shared key → no extra fetch), but strips `data`
 * so a status-only consumer can never read event data - filtered or not.
 * Callers that only need `isPending`/`isError`/`refetch`-style fields (fetch
 * triggering, loading UI) should use this instead of discarding the result
 * of {@link useDayEventsQuery}.
 */
export function useDayEventsQueryStatus(args: DayEventsQueryArgs) {
  const { data: _data, ...status } = useDayEventsQueryInternal(args);
  return status;
}

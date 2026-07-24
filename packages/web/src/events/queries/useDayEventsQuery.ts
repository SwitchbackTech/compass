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

/**
 * Primary day-events read hook. TanStack Query owns the normalized result.
 */
export function useDayEventsQuery({ startDate, endDate }: DayEventsQueryArgs) {
  const source = useEventRepositorySource();

  const query = useQuery(dayEventsQueryOptions({ source, startDate, endDate }));
  const { error } = query;

  useEffect(() => {
    if (!error) return;
    handleError(error as Error);
  }, [error]);

  return query;
}

export function useDayEventViewModel(args: DayEventsQueryArgs) {
  const query = useDayEventsQuery(args);
  const { data: calendars } = useCalendarsQuery();
  const viewModel = useMemo(
    () =>
      deriveCalendarEventViewModel(
        filterEventsByVisibleCalendars(query.data, calendars),
      ),
    [query.data, calendars],
  );
  return { ...query, ...viewModel };
}

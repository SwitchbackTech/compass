import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
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
 * Load failures are shown contextually (e.g. EventGrid) — no global toast.
 */
export function useDayEventsQuery({ startDate, endDate }: DayEventsQueryArgs) {
  const source = useEventRepositorySource();

  return useQuery(dayEventsQueryOptions({ source, startDate, endDate }));
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

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { dayEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { deriveEventListCalendarIds } from "./derive-event-list-calendar-ids";
import { deriveCalendarEventViewModel } from "./event.view-model";
import { filterEventsByVisibleCalendars } from "./filter-events-by-visible-calendars";

type DayEventsQueryArgs = {
  startDate: string;
  endDate: string;
};

export function useDayEventsQuery({ startDate, endDate }: DayEventsQueryArgs) {
  const source = useEventRepositorySource();
  const { data: calendars } = useCalendarsQuery();
  const calendarIds = useMemo(
    () => deriveEventListCalendarIds(calendars),
    [calendars],
  );

  return useQuery(
    dayEventsQueryOptions({ source, startDate, endDate, calendarIds }),
  );
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

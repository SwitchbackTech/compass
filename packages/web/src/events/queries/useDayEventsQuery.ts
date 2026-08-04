import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { dayEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { deriveCalendarEventViewModel } from "./event.view-model";
import { filterEventsByVisibleCalendars } from "./filter-events-by-visible-calendars";
import { mergeCrossAccountDuplicates } from "./merge-cross-account-duplicates";
import { useEventListCalendarIds } from "./useEventListCalendarIds";

type DayEventsQueryArgs = {
  startDate: string;
  endDate: string;
};

export function useDayEventsQuery({ startDate, endDate }: DayEventsQueryArgs) {
  const source = useEventRepositorySource();
  const calendarIds = useEventListCalendarIds();
  const query = useQuery(
    dayEventsQueryOptions({ source, startDate, endDate, calendarIds }),
  );
  return { ...query, calendarIds };
}

export function useDayEventViewModel(args: DayEventsQueryArgs) {
  const query = useDayEventsQuery(args);
  const { data: calendars } = useCalendarsQuery();
  const defaultAccountEmail = useDefaultTargetCalendar(
    calendars ?? [],
  )?.accountEmail;
  // Merge AFTER the visibility filter, so hiding one account's calendar
  // unmerges on its own, and BEFORE the view model, so the grid and the Up
  // Next banner both see one event per meeting.
  const { data, duplicates } = useMemo(
    () =>
      mergeCrossAccountDuplicates(
        filterEventsByVisibleCalendars(query.data, calendars),
        calendars,
        defaultAccountEmail,
      ),
    [query.data, calendars, defaultAccountEmail],
  );
  const viewModel = useMemo(() => deriveCalendarEventViewModel(data), [data]);
  return { ...query, ...viewModel, crossAccountDuplicates: duplicates };
}

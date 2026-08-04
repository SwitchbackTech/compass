import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { deriveOverlappingEventQueryData } from "@web/events/queries/event.query.cache";
import { weekEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { deriveCalendarEventViewModel } from "./event.view-model";
import { filterEventsByVisibleCalendars } from "./filter-events-by-visible-calendars";
import { mergeCrossAccountDuplicates } from "./merge-cross-account-duplicates";
import { useEventListCalendarIds } from "./useEventListCalendarIds";

type WeekEventsQueryArgs = {
  startOfView: Dayjs;
  endOfView: Dayjs;
};

/**
 * Primary week-events read hook. TanStack Query owns the normalized result;
 * consumers derive render data through {@link useWeekEventViewModel}.
 * Load failures are shown contextually (e.g. EventGrid) — no global toast.
 */
export function useWeekEventsQuery({
  startOfView,
  endOfView,
}: WeekEventsQueryArgs) {
  const queryClient = useQueryClient();
  const source = useEventRepositorySource();
  const calendarIds = useEventListCalendarIds();
  const startDate = toUTCOffset(startOfView);
  const endDate = toUTCOffset(endOfView);

  const query = useQuery({
    ...weekEventsQueryOptions({ source, startDate, endDate, calendarIds }),
    placeholderData: () =>
      deriveOverlappingEventQueryData(queryClient, {
        source,
        startDate,
        endDate,
      }),
  });
  return { ...query, calendarIds };
}

export function useWeekEventViewModel(args: WeekEventsQueryArgs) {
  const query = useWeekEventsQuery(args);
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

/**
 * Read-only week-events loading state. Subscribes to the same cache entry as
 * {@link useWeekEventsQuery} (shared key → no extra fetch).
 */
export function useWeekEventsQueryStatus(args: WeekEventsQueryArgs) {
  return useWeekEventsQuery(args);
}

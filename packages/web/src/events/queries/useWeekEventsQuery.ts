import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { deriveOverlappingEventQueryData } from "@web/events/queries/event.query.cache";
import { weekEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { deriveCalendarEventViewModel } from "./event.view-model";
import { filterEventsByVisibleCalendars } from "./filter-events-by-visible-calendars";

type WeekEventsQueryArgs = {
  startOfView: Dayjs;
  endOfView: Dayjs;
};

function useWeekEventsQueryInternal({
  startOfView,
  endOfView,
}: WeekEventsQueryArgs) {
  const queryClient = useQueryClient();
  const source = useEventRepositorySource();
  const startDate = toUTCOffset(startOfView);
  const endDate = toUTCOffset(endOfView);

  return useQuery({
    ...weekEventsQueryOptions({ source, startDate, endDate }),
    placeholderData: () =>
      deriveOverlappingEventQueryData(queryClient, {
        source,
        startDate,
        endDate,
      }),
  });
}

/**
 * Primary week-events read hook. TanStack Query owns the normalized result;
 * consumers derive render data through {@link useWeekEventViewModel}.
 * Load failures are shown contextually (e.g. EventGrid) — no global toast.
 */
export function useWeekEventsQuery(args: WeekEventsQueryArgs) {
  return useWeekEventsQueryInternal(args);
}

export function useWeekEventViewModel(args: WeekEventsQueryArgs) {
  const query = useWeekEventsQuery(args);
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

/**
 * Read-only week-events loading state. Subscribes to the same cache entry as
 * {@link useWeekEventsQuery} (shared key → no extra fetch).
 */
export function useWeekEventsQueryStatus(args: WeekEventsQueryArgs) {
  return useWeekEventsQueryInternal(args);
}

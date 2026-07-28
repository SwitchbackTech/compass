import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { handleError } from "@web/common/utils/event/event.util";
import { deriveOverlappingEventQueryData } from "@web/events/queries/event.query.cache";
import { weekEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { deriveCalendarEventViewModel } from "./event.view-model";
import { filterEventsByVisibleCalendars } from "./filter-events-by-visible-calendars";

type WeekEventsQueryArgs = {
  startOfView: Dayjs;
  endOfView: Dayjs;
  reportError?: (error: Error) => void;
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
 * Primary week-events read hook. Data is filtered to visible calendars
 * before it leaves this module - no caller can see a hidden calendar's
 * events. TanStack Query owns the normalized (unfiltered) result underneath;
 * this hook and {@link useWeekEventViewModel} are the only ways to read it.
 */
export function useWeekEventsQuery(args: WeekEventsQueryArgs) {
  const query = useWeekEventsQueryInternal(args);
  const { data: calendars } = useCalendarsQuery();
  const reportError = args.reportError ?? handleError;
  const { error } = query;

  useEffect(() => {
    if (!error) return;
    reportError(error as Error);
  }, [error, reportError]);

  const data = useMemo(
    () => filterEventsByVisibleCalendars(query.data, calendars),
    [query.data, calendars],
  );

  return { ...query, data };
}

export function useWeekEventViewModel(args: WeekEventsQueryArgs) {
  const query = useWeekEventsQuery(args);
  const viewModel = useMemo(
    () => deriveCalendarEventViewModel(query.data),
    [query.data],
  );
  return { ...query, ...viewModel };
}

/**
 * Read-only week-events loading state. Subscribes to the same cache entry as
 * {@link useWeekEventsQuery} (shared key → no extra fetch), but strips
 * `data` so a status-only consumer can never read event data - filtered or
 * not. Callers that only need `isPending`/`isError`/`refetch`-style fields
 * (fetch triggering, loading UI) should use this instead of discarding the
 * result of {@link useWeekEventsQuery}.
 */
export function useWeekEventsQueryStatus(args: WeekEventsQueryArgs) {
  const { data: _data, ...status } = useWeekEventsQueryInternal(args);
  return status;
}

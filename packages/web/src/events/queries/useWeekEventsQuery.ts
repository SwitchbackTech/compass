import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { handleError } from "@web/common/utils/event/event.util";
import { weekEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { deriveCalendarEventViewModel } from "./event.view-model";

type WeekEventsQueryArgs = {
  startOfView: Dayjs;
  endOfView: Dayjs;
};

function useWeekEventsQueryInternal({
  startOfView,
  endOfView,
}: WeekEventsQueryArgs) {
  const source = useEventRepositorySource();
  const startDate = toUTCOffset(startOfView);
  const endDate = toUTCOffset(endOfView);

  return useQuery(weekEventsQueryOptions({ source, startDate, endDate }));
}

/**
 * Primary week-events read hook. TanStack Query owns the normalized result;
 * consumers derive render data through {@link useWeekEventViewModel}.
 */
export function useWeekEventsQuery(args: WeekEventsQueryArgs) {
  const query = useWeekEventsQueryInternal(args);
  const { error } = query;

  useEffect(() => {
    if (!error) return;
    handleError(error as Error);
  }, [error]);

  return query;
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
 * {@link useWeekEventsQuery} (shared key → no extra fetch).
 */
export function useWeekEventsQueryStatus(args: WeekEventsQueryArgs) {
  return useWeekEventsQueryInternal(args);
}

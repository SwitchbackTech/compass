import { useIsFetching, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { useEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";
import { computeSomedayEventsRequestFilter } from "@web/common/utils/datetime/web.date.util";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { somedayEventsQueryOptions } from "@web/events/queries/event.query.options";
import { deriveSomedayEventViewModel } from "./event.view-model";

/**
 * Primary someday-events read hook. TanStack Query owns normalized entities,
 * ID order, pagination, and read status.
 * @param start Start of the current week view; the someday request range is
 *   derived from it (matches the pre-migration request filter).
 */
export function useSomedayEventsQuery(start: Dayjs) {
  const source = useEventRepositorySource();
  const { startDate, endDate } = computeSomedayEventsRequestFilter(
    start,
    start.endOf("month"),
  );

  return useQuery(somedayEventsQueryOptions({ source, startDate, endDate }));
}

export function useSomedayEventViewModel(start: Dayjs, end: Dayjs) {
  const query = useSomedayEventsQuery(start);
  const startValue = start.valueOf();
  const endValue = end.valueOf();
  const range = useMemo(
    () => ({ start: dayjs(startValue), end: dayjs(endValue) }),
    [startValue, endValue],
  );
  const viewModel = useMemo(
    () => deriveSomedayEventViewModel(query.data, range),
    [query.data, range],
  );
  return {
    ...query,
    ...viewModel,
  };
}

/**
 * Read-only someday-events loading state. Counts any in-flight someday query
 * (range-agnostic, matching the previous global `isProcessing` selector).
 */
export function useSomedayEventsQueryStatus() {
  const fetchingCount = useIsFetching({
    queryKey: eventQueryKeys.scope("someday"),
  });

  return { isFetching: fetchingCount > 0 };
}

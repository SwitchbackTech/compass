import { useIsFetching, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { somedayEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { type NormalizedEventQueryData } from "./event.query.types";
import { deriveSomedayEventViewModel } from "./event.view-model";

const weekAnchorDate = (start: Dayjs) =>
  start.startOf("week").toYearMonthDayString();
const monthAnchorDate = (start: Dayjs) =>
  start.startOf("month").toYearMonthDayString();

/**
 * Primary someday-events read hook. Runs two independently-cached backend
 * reads — one per (period, anchorDate) bucket (A35: week bucket anchored on
 * the visible week's start, month bucket anchored on the visible month's
 * start) — and exposes a single merged result, matching the shape consumers
 * had before the two-query split.
 * @param start Start of the current week view; both buckets' anchors derive
 *   from it (matches the pre-migration week/month anchoring).
 */
export function useSomedayEventsQuery(start: Dayjs) {
  const source = useEventRepositorySource();
  const week = useQuery(
    somedayEventsQueryOptions({
      source,
      period: "week",
      anchorDate: weekAnchorDate(start),
    }),
  );
  const month = useQuery(
    somedayEventsQueryOptions({
      source,
      period: "month",
      anchorDate: monthAnchorDate(start),
    }),
  );

  const data: NormalizedEventQueryData | undefined =
    week.data && month.data
      ? {
          ids: [...week.data.ids, ...month.data.ids],
          entities: { ...week.data.entities, ...month.data.entities },
        }
      : undefined;

  return {
    week,
    month,
    data,
    error: week.error ?? month.error,
    isPending: week.isPending || month.isPending,
    isFetching: week.isFetching || month.isFetching,
    isPlaceholderData: week.isPlaceholderData || month.isPlaceholderData,
  };
}

export function useSomedayEventViewModel(start: Dayjs, _end?: Dayjs) {
  const query = useSomedayEventsQuery(start);
  const viewModel = useMemo(
    () => deriveSomedayEventViewModel(query.week.data, query.month.data),
    [query.week.data, query.month.data],
  );
  return {
    ...query,
    ...viewModel,
  };
}

/**
 * Read-only someday-events loading state. Counts any in-flight someday query
 * (week or month bucket, range-agnostic, matching the previous global
 * `isProcessing` selector).
 */
export function useSomedayEventsQueryStatus() {
  const fetchingCount = useIsFetching({
    queryKey: eventQueryKeys.scope("someday"),
  });

  return { isFetching: fetchingCount > 0 };
}

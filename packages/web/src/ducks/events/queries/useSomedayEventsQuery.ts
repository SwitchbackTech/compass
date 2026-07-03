import { useIsFetching, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";
import { type Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { computeSomedayEventsRequestFilter } from "@web/common/utils/datetime/web.date.util";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import { somedayEventsQueryOptions } from "@web/ducks/events/queries/event.query.options";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { useAppDispatch } from "@web/store/store.hooks";

/**
 * Primary someday-events read hook. Fetches via TanStack Query and syncs results
 * into Redux (entities + someday id-list). Mount exactly once; use
 * {@link useSomedayEventsQueryStatus} elsewhere to observe loading state.
 * @param start Start of the current week view; the someday request range is
 *   derived from it (matches the pre-migration request filter).
 */
export function useSomedayEventsQuery(start: Dayjs) {
  const dispatch = useAppDispatch();
  const source = useEventRepositorySource();
  const { startDate, endDate } = computeSomedayEventsRequestFilter(
    start,
    start.endOf("month"),
  );

  const query = useQuery(
    somedayEventsQueryOptions({ source, startDate, endDate }),
  );
  const { data, error, dataUpdatedAt, errorUpdatedAt } = query;

  useEffect(() => {
    if (!data) return;
    // Entities first so selectors resolve before the success list renders.
    dispatch(eventsEntitiesSlice.actions.insert(data.entities));
    dispatch(
      getSomedayEventsSlice.actions.success({
        ...data.pagination,
        data: data.ids as Payload_NormalizedAsyncAction,
      } as Parameters<typeof getSomedayEventsSlice.actions.success>[0]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  useEffect(() => {
    if (!error) return;
    // Preserves pre-migration behavior: someday errors do not call handleError.
    dispatch(
      getSomedayEventsSlice.actions.error({
        __context: { reason: (error as Error).message },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorUpdatedAt]);

  return query;
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

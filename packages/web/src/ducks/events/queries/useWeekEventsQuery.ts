import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";
import { type Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { handleError } from "@web/common/utils/event/event.util";
import { weekEventsQueryOptions } from "@web/ducks/events/queries/event.query.options";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch } from "@web/store/store.hooks";

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
 * Primary week-events read hook. Fetches via TanStack Query and syncs results
 * into Redux (entities + week id-list) so selectors/grid render unchanged.
 * Mount exactly once per week view; use {@link useWeekEventsQueryStatus} elsewhere
 * to observe loading state without duplicating the Redux sync.
 */
export function useWeekEventsQuery(args: WeekEventsQueryArgs) {
  const dispatch = useAppDispatch();
  const query = useWeekEventsQueryInternal(args);
  const { data, error, dataUpdatedAt, errorUpdatedAt } = query;

  useEffect(() => {
    if (!data) return;
    // Entities first so selectors resolve before the success list renders.
    dispatch(eventsEntitiesSlice.actions.insert(data.entities));
    dispatch(
      getWeekEventsSlice.actions.success({
        data: data.ids as Payload_NormalizedAsyncAction,
      } as Parameters<typeof getWeekEventsSlice.actions.success>[0]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  useEffect(() => {
    if (!error) return;
    dispatch(getWeekEventsSlice.actions.error({}));
    handleError(error as Error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorUpdatedAt]);

  return query;
}

/**
 * Read-only week-events loading state. Subscribes to the same cache entry as
 * {@link useWeekEventsQuery} (shared key → no extra fetch, no Redux sync).
 */
export function useWeekEventsQueryStatus(args: WeekEventsQueryArgs) {
  return useWeekEventsQueryInternal(args);
}

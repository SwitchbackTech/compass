import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";
import { handleError } from "@web/common/utils/event/event.util";
import { dayEventsQueryOptions } from "@web/ducks/events/queries/event.query.options";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { useAppDispatch } from "@web/store/store.hooks";

type DayEventsQueryArgs = {
  startDate: string;
  endDate: string;
};

/**
 * Primary day-events read hook. Fetches via TanStack Query and syncs results
 * into Redux (entities + day id-list) so day-view selectors render unchanged.
 */
export function useDayEventsQuery({ startDate, endDate }: DayEventsQueryArgs) {
  const dispatch = useAppDispatch();
  const source = useEventRepositorySource();

  const query = useQuery(dayEventsQueryOptions({ source, startDate, endDate }));
  const { data, error, dataUpdatedAt, errorUpdatedAt } = query;

  useEffect(() => {
    if (!data) return;
    // Entities first so selectors resolve before the success list renders.
    dispatch(eventsEntitiesSlice.actions.insert(data.entities));
    dispatch(
      getDayEventsSlice.actions.success({
        data: data.ids,
        count: data.ids.length,
        pageSize: data.ids.length,
        page: 1,
        offset: 0,
        startDate,
        endDate,
        priorities: [],
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  useEffect(() => {
    if (!error) return;
    dispatch(getDayEventsSlice.actions.error({}));
    handleError(error as Error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorUpdatedAt]);

  return query;
}

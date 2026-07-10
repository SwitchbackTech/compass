import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { handleError } from "@web/common/utils/event/event.util";
import { dayEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { deriveCalendarEventViewModel } from "./event.view-model";

type DayEventsQueryArgs = {
  startDate: string;
  endDate: string;
};

/**
 * Primary day-events read hook. TanStack Query owns the normalized result.
 */
export function useDayEventsQuery({ startDate, endDate }: DayEventsQueryArgs) {
  const source = useEventRepositorySource();

  const query = useQuery(dayEventsQueryOptions({ source, startDate, endDate }));
  const { error } = query;

  useEffect(() => {
    if (!error) return;
    handleError(error as Error);
  }, [error]);

  return query;
}

export function useDayEventViewModel(args: DayEventsQueryArgs) {
  const query = useDayEventsQuery(args);
  const viewModel = useMemo(
    () => deriveCalendarEventViewModel(query.data),
    [query.data],
  );
  return { ...query, ...viewModel };
}

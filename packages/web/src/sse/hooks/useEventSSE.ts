import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { invalidateEventQueriesUnlessMutating } from "@web/events/queries/event.query.invalidation";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { onServerMessage } from "../client/sse.client";

/**
 * Refetches event reads when the backend pushes change events over SSE.
 * Invalidating the relevant scope refetches whichever query is active for the
 * current view/range - replacing the old view/date-range branching in useRefetch.
 */
export const useEventSSE = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribeEvents = onServerMessage("eventsChanged", () => {
      invalidateEventQueriesUnlessMutating(
        queryClient,
        eventQueryKeys.scope("day"),
      );
      invalidateEventQueriesUnlessMutating(
        queryClient,
        eventQueryKeys.scope("week"),
      );
    });

    const unsubscribeCalendars = onServerMessage("calendarsChanged", () => {
      void queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all });
    });

    return () => {
      unsubscribeEvents();
      unsubscribeCalendars();
    };
  }, [queryClient]);
};

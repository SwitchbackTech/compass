import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { getLocalCalendar } from "@web/calendars/calendar.util";
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
    const unsubscribeEvents = onServerMessage("eventsChanged", (message) => {
      invalidateEventQueriesUnlessMutating(
        queryClient,
        eventQueryKeys.scope("day"),
      );
      invalidateEventQueriesUnlessMutating(
        queryClient,
        eventQueryKeys.scope("week"),
      );

      // Someday events only ever live on the user's local calendar (B10);
      // only reconcile that scope when the changed calendar is the local one.
      const calendars = queryClient.getQueryData<Calendar[]>(
        calendarQueryKeys.all,
      );
      const localCalendar = calendars ? getLocalCalendar(calendars) : undefined;

      if (localCalendar && message.calendarId === localCalendar.id) {
        invalidateEventQueriesUnlessMutating(
          queryClient,
          eventQueryKeys.scope("someday"),
        );
      }
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

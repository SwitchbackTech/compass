import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { invalidateEventQueriesUnlessMutating } from "@web/events/queries/event.query.invalidation";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { sseEmitter } from "../client/sse.client";

/**
 * Refetches event reads when the backend pushes change events over SSE.
 * Invalidating the relevant scope refetches whichever query is active for the
 * current view/range — replacing the old view/date-range branching in useRefetch.
 */
export const useEventSSE = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventChangedHandler = () => {
      invalidateEventQueriesUnlessMutating(
        queryClient,
        eventQueryKeys.scope("day"),
      );
      invalidateEventQueriesUnlessMutating(
        queryClient,
        eventQueryKeys.scope("week"),
      );
    };

    const somedayChangedHandler = () => {
      invalidateEventQueriesUnlessMutating(
        queryClient,
        eventQueryKeys.scope("someday"),
      );
    };

    // TODO(packet-03-phase-3): the backend now publishes one "eventsChanged"
    // message carrying { calendarId, eventIds, reason } (B10) instead of the
    // separate EVENT_CHANGED/SOMEDAY_EVENT_CHANGED events this hook used to
    // split on; rewire to parse the message and invalidate by calendar
    // (local calendar invalidates both someday and grid scopes per B10).
    sseEmitter.on("eventsChanged", eventChangedHandler);
    sseEmitter.on("eventsChanged", somedayChangedHandler);

    return () => {
      sseEmitter.off("eventsChanged", eventChangedHandler);
      sseEmitter.off("eventsChanged", somedayChangedHandler);
    };
  }, [queryClient]);
};

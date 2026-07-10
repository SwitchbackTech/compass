import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/sse.constants";
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

    sseEmitter.on(EVENT_CHANGED, eventChangedHandler);
    sseEmitter.on(SOMEDAY_EVENT_CHANGED, somedayChangedHandler);

    return () => {
      sseEmitter.off(EVENT_CHANGED, eventChangedHandler);
      sseEmitter.off(SOMEDAY_EVENT_CHANGED, somedayChangedHandler);
    };
  }, [queryClient]);
};

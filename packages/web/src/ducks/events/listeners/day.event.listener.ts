import { TaskAbortError } from "@reduxjs/toolkit";
import { session } from "@web/common/classes/Session";
import {
  getEventRepository,
  getEventRepositorySource,
} from "@web/common/repositories/event/event.repository.util";
import { type CompassStartListening } from "@web/common/store/listener-middleware";
import { handleError } from "@web/common/utils/event/event.util";
import { fetchDayEvents } from "@web/ducks/events/queries/day.event.query";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";

/**
 * Registers listener on day-events request action.
 * Uses TanStack Query for keyed orchestration + in-flight dedup.
 * Delegates to pure fetchDayEvents; all Redux writes happen here after signal checks.
 */
export async function registerDayEventQueryListeners(
  startListening: CompassStartListening,
) {
  startListening({
    actionCreator: getDayEventsSlice.actions.request,
    effect: async (action, listenerApi) => {
      // takeLatest emulation: cancel prior listeners
      listenerApi.cancelActiveListeners();

      try {
        // Pause for session check
        const sessionExists = await listenerApi.pause(
          session.doesSessionExist(),
        );
        const source = getEventRepositorySource(sessionExists);
        const repository = getEventRepository(sessionExists);
        const { startDate, endDate } = action.payload;

        // Guard: abort if superseded before fetchQuery
        if (listenerApi.signal.aborted) return;

        // Fetch with TanStack Query: dedup via key, staleTime 0, gcTime 0
        const result = await listenerApi.pause(
          listenerApi.extra.queryClient.fetchQuery({
            queryKey: eventQueryKeys.day({
              source,
              startDate,
              endDate,
            }),
            queryFn: () => fetchDayEvents(action.payload, repository),
            staleTime: 0, // always refetch settled entries (SSE re-dispatch refetches)
            gcTime: 0, // drop cache entry when fetch settles (dedup only, no reuse)
          }),
        );

        // Guard: abort if superseded after fetchQuery
        if (listenerApi.signal.aborted) return;

        // Dispatch entities first so selectors resolve before success renders.
        listenerApi.dispatch(
          eventsEntitiesSlice.actions.insert(result.entities),
        );
        listenerApi.dispatch(
          getDayEventsSlice.actions.success({
            data: result.ids,
            count: result.ids.length,
            pageSize: result.ids.length,
            page: 1,
            offset: 0,
            startDate,
            endDate,
            priorities: [],
          }),
        );
      } catch (error) {
        // Supersession (not failure): takeLatest pattern
        if (error instanceof TaskAbortError || listenerApi.signal.aborted) {
          return;
        }

        // Actual failure: dispatch error, call handleError
        listenerApi.dispatch(getDayEventsSlice.actions.error({}));
        handleError(error as Error);
      }
    },
  });
}

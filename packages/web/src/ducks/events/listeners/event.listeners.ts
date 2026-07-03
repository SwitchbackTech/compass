import {
  type ActionCreatorWithPayload,
  type ListenerEffectAPI,
} from "@reduxjs/toolkit";
import { type CompassStartListening } from "@web/common/store/listener-middleware";
import {
  convertCalendarToSomedayEvent,
  convertSomedayToCalendarEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  deleteSomedayEvent,
  editCalendarEvent,
  reorderSomedayEvents,
} from "@web/ducks/events/operations/event.mutation.operations";
import { type EventOperationRuntime } from "@web/ducks/events/operations/event.operation.runtime";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { type AppDispatch, type RootState } from "@web/store";

type EventListenerApi = ListenerEffectAPI<
  RootState,
  AppDispatch,
  { queryClient: EventOperationRuntime["queryClient"] }
>;

const runtimeFor = (listenerApi: EventListenerApi): EventOperationRuntime => ({
  dispatch: listenerApi.dispatch,
  getState: listenerApi.getState,
  queryClient: listenerApi.extra.queryClient,
  signal: listenerApi.signal,
});

const registerLatest = <Payload>(
  startListening: CompassStartListening,
  actionCreator: ActionCreatorWithPayload<Payload, string>,
  operation: (
    runtime: EventOperationRuntime,
    payload: Payload,
  ) => Promise<void>,
) => {
  startListening({
    actionCreator,
    effect: async (action, listenerApi) => {
      listenerApi.cancelActiveListeners();
      await operation(runtimeFor(listenerApi), action.payload);
    },
  });
};

export function registerEventListeners(startListening: CompassStartListening) {
  registerLatest(
    startListening,
    createEventSlice.actions.request,
    createCalendarEvent,
  );
  registerLatest(
    startListening,
    editEventSlice.actions.request,
    editCalendarEvent,
  );
  registerLatest(
    startListening,
    deleteEventSlice.actions.request,
    deleteCalendarEvent,
  );
  registerLatest(
    startListening,
    getWeekEventsSlice.actions.convert,
    convertCalendarToSomedayEvent,
  );
  registerLatest(
    startListening,
    getSomedayEventsSlice.actions.convert,
    convertSomedayToCalendarEvent,
  );
  registerLatest(
    startListening,
    getSomedayEventsSlice.actions.delete,
    deleteSomedayEvent,
  );
  registerLatest(
    startListening,
    getSomedayEventsSlice.actions.reorder,
    reorderSomedayEvents,
  );
}

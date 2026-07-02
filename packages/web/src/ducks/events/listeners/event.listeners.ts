import {
  createListenerMiddleware,
  type TypedStartListening,
} from "@reduxjs/toolkit";
import { type QueryClient } from "@tanstack/react-query";
import { queryClient } from "@web/common/query/query-client";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  getCurrentMonthEventsSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { type AppDispatch, type RootState } from "@web/store";
import {
  convertCalendarToSomedayEvent,
  convertSomedayToCalendarEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  deleteSomedayEvent,
  editCalendarEvent,
  readCurrentMonthEvents,
  readDayEvents,
  readSomedayEvents,
  readWeekEvents,
  reorderSomedayEvents,
} from "./event.operations";

type ListenerApi = {
  dispatch: AppDispatch;
  getState: () => RootState;
  signal: AbortSignal;
};

export const createEventListenerMiddleware = (
  client: QueryClient = queryClient,
) => {
  const listenerMiddleware = createListenerMiddleware();
  const startListening =
    listenerMiddleware.startListening as TypedStartListening<
      RootState,
      AppDispatch
    >;

  const runtime = (api: ListenerApi) => ({
    dispatch: api.dispatch,
    getState: api.getState,
    queryClient: client,
    signal: api.signal,
  });

  startListening({
    actionCreator: getDayEventsSlice.actions.request,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await readDayEvents(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: getWeekEventsSlice.actions.request,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await readWeekEvents(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: getCurrentMonthEventsSlice.actions.request,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await readCurrentMonthEvents(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: getSomedayEventsSlice.actions.request,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await readSomedayEvents(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: createEventSlice.actions.request,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await createCalendarEvent(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: editEventSlice.actions.request,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await editCalendarEvent(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: deleteEventSlice.actions.request,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await deleteCalendarEvent(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: getWeekEventsSlice.actions.convert,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await convertCalendarToSomedayEvent(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: getSomedayEventsSlice.actions.convert,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await convertSomedayToCalendarEvent(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: getSomedayEventsSlice.actions.delete,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await deleteSomedayEvent(runtime(api), action.payload);
    },
  });

  startListening({
    actionCreator: getSomedayEventsSlice.actions.reorder,
    effect: async (action, api) => {
      api.cancelActiveListeners();
      await reorderSomedayEvents(runtime(api), action.payload);
    },
  });

  return listenerMiddleware;
};

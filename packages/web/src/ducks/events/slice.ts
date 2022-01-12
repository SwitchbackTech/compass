import { Action, combineReducers } from "redux";
import { createSlice } from "@reduxjs/toolkit";

import { Schema_Event } from "@core/types/event.types";

import { createAsyncSlice } from "@web/common/store/helpers";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entities";
import { Response_HttpPaginatedSuccess } from "@web/common/types/apiTypes";

import {
  Payload_EditEvent,
  Payload_GetPaginatedEvents,
  Payload_GetWeekEvents,
} from "./types";

export const getWeekEventsSlice = createAsyncSlice<
  Payload_GetWeekEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>
>({
  name: "getWeekEvents",
});

export const getCurrentMonthEventsSlice = createAsyncSlice<
  Payload_GetPaginatedEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>
>({
  name: "getCurrentMonthEvents",
});

export const getFutureEventsSlice = createAsyncSlice<
  Payload_GetPaginatedEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>
>({
  name: "getFutureEvents",
});

export const createEventSlice = createAsyncSlice<Schema_Event>({
  name: "createEvent",
});

export const deleteEventSlice = createAsyncSlice<{ _id: string }>({
  name: "deleteEvent",
});

export const editEventSlice = createAsyncSlice<Payload_EditEvent>({
  name: "editEvent",
});

export interface Entities_Event {
  [key: string]: Schema_Event;
}

export interface Action_InsertEvents extends Action {
  payload: Entities_Event | undefined;
}

export const eventsEntitiesSlice = createSlice({
  name: "eventEntities",
  initialState: {} as { value: Entities_Event },
  reducers: {
    insert: (state, action: Action_InsertEvents) => {
      state.value = { ...state.value, ...action.payload };
    },
  },
});

export const eventsReducer = combineReducers({
  getWeekEvents: getWeekEventsSlice.reducer,
  getCurrentMonthEvents: getCurrentMonthEventsSlice.reducer,
  getFutureEvents: getFutureEventsSlice.reducer,
  createEvent: createEventSlice.reducer,
  deleteEvent: deleteEventSlice.reducer,
  editEvent: editEventSlice.reducer,

  entities: eventsEntitiesSlice.reducer,
});

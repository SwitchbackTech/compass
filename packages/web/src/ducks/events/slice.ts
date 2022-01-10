import { Action, combineReducers } from "redux";
import { createSlice } from "@reduxjs/toolkit";

import { Schema_Event } from "@core/types/event.types";

import { createAsyncSlice } from "@web/common/store/helpers";
import { NormalizedAsyncActionPayload } from "@web/common/types/entities";
import { HttpPaginatedSuccessResponse } from "@web/common/types/apiTypes";

import {
  EditEventPayload,
  GetPaginatedEventsPayload,
  GetWeekEventsPayload,
} from "./types";

export const getWeekEventsSlice = createAsyncSlice<
  GetWeekEventsPayload,
  HttpPaginatedSuccessResponse<NormalizedAsyncActionPayload>
>({
  name: "getWeekEvents",
});

export const getCurrentMonthEventsSlice = createAsyncSlice<
  GetPaginatedEventsPayload,
  HttpPaginatedSuccessResponse<NormalizedAsyncActionPayload>
>({
  name: "getCurrentMonthEvents",
});

export const getFutureEventsSlice = createAsyncSlice<
  GetPaginatedEventsPayload,
  HttpPaginatedSuccessResponse<NormalizedAsyncActionPayload>
>({
  name: "getFutureEvents",
});

export const createEventSlice = createAsyncSlice<Schema_Event>({
  name: "createEvent",
});

export const editEventSlice = createAsyncSlice<EditEventPayload>({
  name: "editEvent",
});

export interface EventEntities {
  [key: string]: Schema_Event;
}

export interface InsertEventsAction extends Action {
  payload: EventEntities | undefined;
}

export const eventsEntitiesSlice = createSlice({
  name: "eventEntities",
  initialState: {} as { value: EventEntities },
  reducers: {
    insert: (state, action: InsertEventsAction) => {
      state.value = { ...state.value, ...action.payload };
    },
  },
});

export const eventsReducer = combineReducers({
  getWeekEvents: getWeekEventsSlice.reducer,
  getCurrentMonthEvents: getCurrentMonthEventsSlice.reducer,
  getFutureEvents: getFutureEventsSlice.reducer,
  createEvent: createEventSlice.reducer,
  editEvent: editEventSlice.reducer,

  entities: eventsEntitiesSlice.reducer,
});

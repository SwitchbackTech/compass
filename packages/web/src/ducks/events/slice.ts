import { combineReducers } from "redux";
import { createSlice } from "@reduxjs/toolkit";

import { Schema_Event } from "@core/types/event.types";

import { RootState } from "@web/store";
import { createAsyncSlice } from "@web/common/store/helpers";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entities";
import { Response_HttpPaginatedSuccess } from "@web/common/types/apiTypes";

import {
  Action_DeleteEvent,
  Action_EditEvent,
  Action_InsertEventId,
  Action_InsertEvents,
  Entities_Event,
  Payload_DeleteEvent,
  Payload_EditEvent,
  Payload_GetPaginatedEvents,
  Payload_GetWeekEvents,
} from "./types";
import produce from "immer";

export const createEventSlice = createAsyncSlice<Schema_Event>({
  name: "createEvent",
});

export const deleteEventSlice = createAsyncSlice<{ _id: string }>({
  name: "deleteEvent",
});

export const editEventSlice = createAsyncSlice<Payload_EditEvent>({
  name: "editEvent",
});

//$$
const changeTimezones = produce((draft, id) => {
  //start: 2022-01-31T14:15:00-06:00
  //end: 2022-01-31T16:15:00-06:00
  console.log("currying orfeild");
  draft.value["61fac593fb23b9ef6e520794"].origin = "foo";
  // const todo = draft.find((todo) => todo.id === id);
  // todo.done = !todo.done;
});

export const eventsEntitiesSlice = createSlice({
  name: "eventEntities",
  initialState: {} as { value: Entities_Event },
  reducers: {
    delete: (state, action: Action_DeleteEvent) => {
      delete state.value[action.payload._id];
    },
    edit: (state, action: Action_EditEvent) => {
      state.value[action.payload._id] = action.payload.event;
    },
    insert: (state, action: Action_InsertEvents) => {
      state.value = { ...state.value, ...action.payload };
    },
    wipTimezonechange: (state, action) => {
      // state.value = changeTimezones(state, "foo");
      state = changeTimezones(state, "foo");
      // state.value = {...state, changeTimezones(state, "foo")};
    },
  },
});

export const getWeekEventsSlice = createAsyncSlice<
  Payload_GetWeekEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>
>({
  name: "getWeekEvents",
  reducers: {
    delete: (state: RootState, action: Action_DeleteEvent) => {
      state.value.data = state.value.data.filter(
        (i: string) => i !== action.payload._id
      );
    },
    insert: (state, action: { payload: string }) => {
      // payload is the event id
      if (state.value === null || state.value === undefined) {
        console.log("error: state.value needs to be initialized");
      } else {
        state.value.data.push(action.payload);
      }
    },
  },
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

export const eventsReducer = combineReducers({
  getWeekEvents: getWeekEventsSlice.reducer,
  getCurrentMonthEvents: getCurrentMonthEventsSlice.reducer,
  getFutureEvents: getFutureEventsSlice.reducer,
  createEvent: createEventSlice.reducer,
  deleteEvent: deleteEventSlice.reducer,
  editEvent: editEventSlice.reducer,

  entities: eventsEntitiesSlice.reducer,
});

import { combineReducers } from "redux";
import dayjs from "dayjs";
import produce, { current } from "immer";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { createSlice } from "@reduxjs/toolkit";

import { Schema_Event } from "@core/types/event.types";

import { RootState } from "@web/store";
import { createAsyncSlice } from "@web/common/store/helpers";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entities";
import { Response_HttpPaginatedSuccess } from "@web/common/types/apiTypes";
import { LocalStorage } from "@web/common/constants/web.constants";

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

dayjs.extend(utc);
dayjs.extend(timezone);

export const createEventSlice = createAsyncSlice<Schema_Event>({
  name: "createEvent",
});

export const deleteEventSlice = createAsyncSlice<{ _id: string }>({
  name: "deleteEvent",
});

export const editEventSlice = createAsyncSlice<Payload_EditEvent>({
  name: "editEvent",
});

const changeTimezones = produce((draft, newTimeZone) => {
  Object.keys(draft.value).map((k) => {
    const newStart = dayjs(draft.value[k].startDate).tz(newTimeZone);
    const newEnd = dayjs(draft.value[k].endDate).tz(newTimeZone);
    draft.value[k].startDate = newStart;
    draft.value[k].endDate = newEnd;
  });
  // $$ works
  // draft.value["61fac593fb23b9ef6e520794"].startDate =
  // "2022-02-01T11:15:00-06:00";
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
    updateAfterTzChange: (state, action) => {
      // $$ put this in the action/payload
      const newTimeZone = localStorage.getItem(LocalStorage.TIMEZONE);

      const nextState = changeTimezones(state, newTimeZone);
      state.value = nextState.value;
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

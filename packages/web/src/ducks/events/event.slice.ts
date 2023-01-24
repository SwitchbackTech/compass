import { combineReducers } from "redux";
import dayjs from "dayjs";
import produce from "immer";
import { createSlice } from "@reduxjs/toolkit";
import { Schema_Event } from "@core/types/event.types";
import { createAsyncSlice } from "@web/common/store/helpers";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { Status_DraftEvent } from "@web/common/types/web.event.types";

import {
  Action_DeleteEvent,
  Action_DraftEvent,
  Action_Draft_Resize,
  Action_Draft_Swap,
  Action_EditEvent,
  Action_InsertEvents,
  Action_TimezoneChange,
  Entities_Event,
  Payload_EditEvent,
  Payload_GetPaginatedEvents,
  Payload_GetEvents,
} from "./event.types";

const changeTimezones = produce((draft, newTimeZone) => {
  Object.keys(draft.value).map((k) => {
    draft.value[k].startDate = dayjs(draft.value[k].startDate).tz(newTimeZone);
    draft.value[k].endDate = dayjs(draft.value[k].endDate).tz(newTimeZone);
  });
});

export const createEventSlice = createAsyncSlice<Schema_Event>({
  name: "createEvent",
});

export const deleteEventSlice = createAsyncSlice<{ _id: string }>({
  name: "deleteEvent",
});

interface State_DraftEvent {
  status: Status_DraftEvent | null;
  event: Schema_Event | null;
}

const initialDraft = {
  status: {
    activity: null,
    isDrafting: false,
    eventType: null,
    dateToResize: null,
  },
  event: null,
};

export const draftSlice = createSlice({
  name: "draft",
  initialState: initialDraft as State_DraftEvent,
  reducers: {
    discard: (state) => initialDraft,
    start: (state, action: Action_DraftEvent) => {
      const { activity, event, eventType } = action.payload;

      state.event = event;
      state.status = {
        ...state.status,
        activity,
        isDrafting: true,
        eventType,
      };
    },

    startResizing: (state, action: Action_Draft_Resize) => {
      const { event, dateToChange } = action.payload;
      return {
        event,
        status: {
          ...state.status,
          activity: "resizing",
          dateToResize: dateToChange,
          isDrafting: true,
        },
      };
    },

    startDragging: (state, action) => {
      const { event } = action.payload;
      state.event = event;
      state.status = {
        ...state.status,
        activity: "dragging",
        isDrafting: true,
      };
    },

    swap: (state, action: Action_Draft_Swap) => {
      const { category, event } = action.payload;
      state.event = event;
      state.status = {
        ...initialDraft.status,
        isDrafting: true,
        eventType: category,
      };
    },
  },
});

export const editEventSlice = createAsyncSlice<Payload_EditEvent>({
  name: "editEvent",
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
      // appends new events to existing entities
      state.value = { ...state.value, ...action.payload };
    },
    updateAfterTzChange: (state, action: Action_TimezoneChange) => {
      const nextState = changeTimezones(state, action.payload.timezone);
      state.value = nextState.value;
    },
  },
});

export const getCurrentMonthEventsSlice = createAsyncSlice<
  Payload_GetPaginatedEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>
>({
  name: "getCurrentMonthEvents",
});

export const getSomedayEventsSlice = createAsyncSlice<
  Payload_GetPaginatedEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>
>({
  name: "getSomedayEvents",
  reducers: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    convert: () => {},
    delete: (state, action: Action_DeleteEvent) => {
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

export const getWeekEventsSlice = createAsyncSlice<
  Payload_GetEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>
>({
  name: "getWeekEvents",
  reducers: {
    delete: (state, action: Action_DeleteEvent) => {
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

export const eventsReducer = combineReducers({
  createEvent: createEventSlice.reducer,
  draft: draftSlice.reducer,
  deleteEvent: deleteEventSlice.reducer,
  editEvent: editEventSlice.reducer,
  entities: eventsEntitiesSlice.reducer,
  getCurrentMonthEvents: getCurrentMonthEventsSlice.reducer,
  getSomedayEvents: getSomedayEventsSlice.reducer,
  getWeekEvents: getWeekEventsSlice.reducer,
});

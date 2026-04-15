import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import produce from "immer";
import { type Origin } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createAsyncSlice } from "@web/common/store/helpers";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { type Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import {
  type Action_DeleteEvent,
  type Action_EditEvent,
  type Action_InsertEvents,
  type Action_ReplaceEvent,
  type Action_TimezoneChange,
  type Entities_Event,
  type Payload_DeleteEvent,
  type Payload_EditEvent,
  type Payload_GetPaginatedEvents,
} from "@web/ducks/events/event.types";

const changeTimezones = produce((draft, newTimeZone) => {
  Object.keys(draft.value).map((k) => {
    draft.value[k].startDate = dayjs(draft.value[k].startDate).tz(newTimeZone);
    draft.value[k].endDate = dayjs(draft.value[k].endDate).tz(newTimeZone);
  });
});

export const createEventSlice = createAsyncSlice<Schema_Event>({
  name: "createEvent",
});

export const deleteEventSlice = createAsyncSlice<Payload_DeleteEvent>({
  name: "deleteEvent",
});

export const editEventSlice = createAsyncSlice<Payload_EditEvent>({
  name: "editEvent",
  initialState: {} as unknown as undefined,
  reducers: {
    migrate: () => {},
  },
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
    replace: (state, action: Action_ReplaceEvent) => {
      const { oldEventId, newEventId } = action.payload;

      state.value[newEventId] = state.value[oldEventId];
      state.value[newEventId]._id = newEventId;

      delete state.value[oldEventId];
    },
    updateAfterTzChange: (state, action: Action_TimezoneChange) => {
      const nextState = changeTimezones(state, action.payload.timezone);
      state.value = nextState.value;
    },
    removeEventsByOrigin: (
      state,
      action: PayloadAction<{ origins: readonly Origin[] }>,
    ) => {
      const origins = new Set(action.payload.origins);
      for (const id of Object.keys(state.value)) {
        const event = state.value[id] as Schema_Event | undefined;
        if (event?.origin && origins.has(event.origin)) {
          delete state.value[id];
        }
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

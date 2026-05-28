import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import {
  type Action_Draft_Resize,
  type Action_Draft_Swap,
  type Action_DraftEvent,
  type State_DraftEvent,
} from "./draft.slice.types";

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
    discard: () => initialDraft,
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
      const { category, event, dateToChange } = action.payload;
      return {
        event,
        status: {
          ...state.status,
          activity: "resizing",
          dateToResize: dateToChange,
          eventType: category,
          isDrafting: true,
        },
      };
    },

    startDnd: (state) => {
      state.status = {
        ...state.status,
        activity: "dnd",
        isDrafting: true,
      };
    },
    startGridClick: (state, action: PayloadAction<Schema_Event>) => {
      const event = action.payload;

      state.event = event;
      state.status = {
        ...initialDraft.status,
        activity: "gridClick",
        eventType: getEventType(event),
        isDrafting: true,
      };
    },
    setEvent: (state, action: PayloadAction<Schema_Event | null>) => {
      const event = action.payload;

      state.event = event;

      if (!event) {
        state.status = initialDraft.status;
        return;
      }

      state.status = {
        ...state.status,
        activity: state.status?.activity ?? "gridClick",
        eventType: getEventType(event),
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

const getEventType = (event: Schema_Event) =>
  event.isAllDay ? Categories_Event.ALLDAY : Categories_Event.TIMED;

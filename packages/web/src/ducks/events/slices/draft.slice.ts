import { createSlice } from "@reduxjs/toolkit";

import {
  Action_DraftEvent,
  Action_Draft_Resize,
  Action_Draft_Swap,
  State_DraftEvent,
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

    startDnd: (state) => {
      state.status = {
        ...state.status,
        activity: "dnd",
        isDrafting: true,
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

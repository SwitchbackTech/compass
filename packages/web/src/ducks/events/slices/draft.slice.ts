import { Schema_Event } from "@core/types/event.types";
import { createSlice } from "@reduxjs/toolkit";
import { Status_DraftEvent } from "@web/common/types/web.event.types";

import {
  Action_DraftEvent,
  Action_Draft_Resize,
  Action_Draft_Swap,
} from "../types/draft.slice.types";

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

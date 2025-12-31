import { PayloadAction, createSlice } from "@reduxjs/toolkit";

interface PendingEventsState {
  eventIds: string[];
}

const initialState: PendingEventsState = {
  eventIds: [],
};

export const pendingEventsSlice = createSlice({
  name: "pendingEvents",
  initialState,
  reducers: {
    add: (state, action: PayloadAction<string>) => {
      if (!state.eventIds.includes(action.payload)) {
        state.eventIds.push(action.payload);
      }
    },
    remove: (state, action: PayloadAction<string>) => {
      const index = state.eventIds.indexOf(action.payload);
      if (index > -1) {
        state.eventIds.splice(index, 1);
      }
    },
    clear: (state) => {
      state.eventIds = [];
    },
  },
});

import { PayloadAction, createSlice } from "@reduxjs/toolkit";

interface PendingEventsState {
  eventIds: Set<string>;
}

const initialState: PendingEventsState = {
  eventIds: new Set<string>(),
};

export const pendingEventsSlice = createSlice({
  name: "pendingEvents",
  initialState,
  reducers: {
    add: (state, action: PayloadAction<string>) => {
      state.eventIds.add(action.payload);
    },
    remove: (state, action: PayloadAction<string>) => {
      state.eventIds.delete(action.payload);
    },
    clear: (state) => {
      state.eventIds.clear();
    },
  },
});

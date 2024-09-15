import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface EventState {
  eventChanged: boolean;
  eventData: { startDate: string; endDate: string } | null;
}

const initialState: EventState = {
  eventChanged: false,
  eventData: null,
};

export const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    eventChanged(
      state,
      action: PayloadAction<{ startDate: string; endDate: string }>
    ) {
      state.eventChanged = true;
      state.eventData = action.payload;
    },
    resetEventChanged(state) {
      state.eventChanged = false;
      state.eventData = null;
    },
  },
});

export const { eventChanged, resetEventChanged } = syncSlice.actions;

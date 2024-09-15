import { Schema_Event } from "@core/types/event.types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface State_Sync {
  updatedEvent: Schema_Event | null;
}

const initialState: State_Sync = {
  updatedEvent: null,
};

export const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    processEventChange(state, action: PayloadAction<Schema_Event>) {
      state.updatedEvent = action.payload;
    },
    resetEventChanged(state) {
      state.updatedEvent = null;
    },
  },
});

export const { processEventChange, resetEventChanged } = syncSlice.actions;

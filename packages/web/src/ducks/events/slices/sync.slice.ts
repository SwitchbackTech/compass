import { createSlice } from "@reduxjs/toolkit";

interface State_Sync {
  isFetchNeeded: boolean;
}

const initialState: State_Sync = {
  isFetchNeeded: false,
};

export const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    resetIsFetchNeeded: (state) => {
      state.isFetchNeeded = false;
    },
    triggerFetch: (state) => {
      state.isFetchNeeded = true;
    },
  },
});

export const { triggerFetch, resetIsFetchNeeded } = syncSlice.actions;

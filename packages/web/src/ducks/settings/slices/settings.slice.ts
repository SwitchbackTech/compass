import { createSlice } from "@reduxjs/toolkit";

interface State_Settings {
  isRightSidebarOpen: boolean;
}

const initialState: State_Settings = {
  isRightSidebarOpen: false,
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    toggleRightSidebar: (state) => {
      state.isRightSidebarOpen = !state.isRightSidebarOpen;
    },
  },
});

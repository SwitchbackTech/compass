import { Action } from "redux";
import dayjs from "dayjs";
import { createSlice } from "@reduxjs/toolkit";

interface State_Settings {
  dates: {
    start: string;
    end: string;
  };
  isCmdPaletteOpen: boolean;
  isRightSidebarOpen: boolean;
}

const initialState: State_Settings = {
  dates: {
    start: dayjs().format(),
    end: dayjs().endOf("week").format(),
  },
  isCmdPaletteOpen: false,
  isRightSidebarOpen: false,
};

export interface Action_DatesChange extends Action {
  payload: {
    start: string;
    end: string;
  };
}

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    closeCmdPalette: (state) => {
      state.isCmdPaletteOpen = false;
    },
    openCmdPalette: (state) => {
      state.isCmdPaletteOpen = true;
    },
    toggleCmdPalette: (state) => {
      state.isCmdPaletteOpen = !state.isCmdPaletteOpen;
    },
    toggleRightSidebar: (state) => {
      state.isRightSidebarOpen = !state.isRightSidebarOpen;
    },
    updateDates: (state, action: Action_DatesChange) => {
      state.dates = action.payload;
    },
  },
});

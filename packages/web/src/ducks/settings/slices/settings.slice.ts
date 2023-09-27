import { Action } from "redux";
import dayjs from "dayjs";
import { createSlice } from "@reduxjs/toolkit";

interface State_Settings {
  dates: {
    start: string;
    end: string;
  };
  isRightSidebarOpen: boolean;
}

const initialState: State_Settings = {
  dates: {
    start: dayjs().format(),
    end: dayjs().endOf("week").format(),
  },
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
    toggleRightSidebar: (state) => {
      state.isRightSidebarOpen = !state.isRightSidebarOpen;
    },
    updateDates: (state, action: Action_DatesChange) => {
      state.dates = action.payload;
    },
  },
});

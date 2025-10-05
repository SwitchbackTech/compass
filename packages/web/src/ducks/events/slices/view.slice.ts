import { Action } from "redux";
import { createSlice } from "@reduxjs/toolkit";
import dayjs from "@core/util/date/dayjs";

interface State_View {
  dates: {
    start: string;
    end: string;
  };
  sidebar: {
    tab: "monthWidget" | "tasks";
    isOpen: boolean;
  };
  header: {
    reminder: string;
  };
}

interface Action_DatesChange extends Action {
  payload: State_View["dates"];
}

interface Action_SidebarViewChange extends Action {
  payload: State_View["sidebar"]["tab"];
}

interface Action_ReminderChange extends Action {
  payload: State_View["header"]["reminder"];
}

const initialState: State_View = {
  dates: {
    start: dayjs().format(),
    end: dayjs().endOf("week").format(),
  },
  sidebar: { tab: "tasks", isOpen: true },
  header: { reminder: "" },
};

export const viewSlice = createSlice({
  name: "view",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },
    updateDates: (state, action: Action_DatesChange) => {
      state.dates = action.payload;
    },
    updateSidebarTab: (state, action: Action_SidebarViewChange) => {
      state.sidebar.tab = action.payload;
    },
    updateReminder: (state, action: Action_ReminderChange) => {
      state.header.reminder = action?.payload ?? !state.header.reminder;
    },
  },
});

export const { updateDates } = viewSlice.actions;

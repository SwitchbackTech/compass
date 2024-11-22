import dayjs from "dayjs";
import { Action } from "redux";
import { createSlice } from "@reduxjs/toolkit";

interface State_View {
  dates: {
    start: string;
    end: string;
  };
  sidebar: {
    tab: "monthWidget" | "tasks";
    isOpen: boolean;
  };
}

interface Action_DatesChange extends Action {
  payload: State_View["dates"];
}

interface Action_SidebarViewChange extends Action {
  payload: State_View["sidebar"]["tab"];
}

const initialState: State_View = {
  dates: {
    start: dayjs().format(),
    end: dayjs().endOf("week").format(),
  },
  sidebar: { tab: "tasks", isOpen: true },
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
  },
});

export const { updateDates } = viewSlice.actions;

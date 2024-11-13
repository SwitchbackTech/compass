import dayjs from "dayjs";
import { Action } from "redux";
import { createSlice } from "@reduxjs/toolkit";

interface State_View {
  dates: {
    start: string;
    end: string;
  };
  leftSidebar: "monthWidget" | "tasks" | "collapsed";
}

interface Action_DatesChange extends Action {
  payload: State_View["dates"];
}

interface Action_SidebarViewChange extends Action {
  payload: State_View["leftSidebar"];
}

const initialState: State_View = {
  dates: {
    start: dayjs().format(),
    end: dayjs().endOf("week").format(),
  },
  leftSidebar: "tasks",
};

export const viewSlice = createSlice({
  name: "view",
  initialState,
  reducers: {
    updateDates: (state, action: Action_DatesChange) => {
      state.dates = action.payload;
    },
    updateLeftSidebarView: (state, action: Action_SidebarViewChange) => {
      state.leftSidebar = action.payload;
    },
  },
});

export const { updateDates } = viewSlice.actions;

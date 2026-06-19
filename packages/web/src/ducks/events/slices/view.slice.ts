import { createSlice } from "@reduxjs/toolkit";
import { type Action } from "redux";
import dayjs from "@core/util/date/dayjs";

interface State_View {
  dates: {
    start: string;
    end: string;
  };
  sidebar: {
    isOpen: boolean;
  };
}

interface Action_DatesChange extends Action {
  payload: State_View["dates"];
}

const initialState: State_View = {
  dates: {
    start: dayjs().startOf("week").format(),
    end: dayjs().endOf("week").format(),
  },
  sidebar: { isOpen: true },
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
  },
});

export const { updateDates } = viewSlice.actions;

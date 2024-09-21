import dayjs from "dayjs";
import { Action } from "redux";
import { createSlice } from "@reduxjs/toolkit";

interface State_View {
  dates: {
    start: string;
    end: string;
  };
}

const initialState: State_View = {
  dates: {
    start: dayjs().format(),
    end: dayjs().endOf("week").format(),
  },
};

export interface Action_DatesChange extends Action {
  payload: {
    start: string;
    end: string;
  };
}

export const viewSlice = createSlice({
  name: "view",
  initialState,
  reducers: {
    updateDates: (state, action: Action_DatesChange) => {
      state.dates = action.payload;
    },
  },
});

export const { updateDates } = viewSlice.actions;

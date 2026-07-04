import { combineReducers } from "redux";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";

const eventsReducer = combineReducers({
  draft: draftSlice.reducer,
});

export const reducers = {
  events: eventsReducer,
};

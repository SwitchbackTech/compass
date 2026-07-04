import { combineReducers } from "redux";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";

const eventsReducer = combineReducers({
  draft: draftSlice.reducer,
});

export const reducers = {
  auth: authSlice.reducer,
  events: eventsReducer,
  userMetadata: userMetadataSlice.reducer,
};

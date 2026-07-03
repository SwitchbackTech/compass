import { combineReducers } from "redux";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";

const eventsReducer = combineReducers({
  draft: draftSlice.reducer,
});

export const reducers = {
  auth: authSlice.reducer,
  events: eventsReducer,
  settings: settingsSlice.reducer,
  userMetadata: userMetadataSlice.reducer,
  view: viewSlice.reducer,
};

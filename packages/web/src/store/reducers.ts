import { combineReducers } from "redux";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  eventsEntitiesSlice,
  getCurrentMonthEventsSlice,
} from "@web/ducks/events/slices/event.slice";
import { pendingEventsSlice } from "@web/ducks/events/slices/pending.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import {
  importGCalSlice,
  importLatestSlice,
} from "@web/ducks/events/slices/sync.slice";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";

const eventsReducer = combineReducers({
  createEvent: createEventSlice.reducer,
  draft: draftSlice.reducer,
  deleteEvent: deleteEventSlice.reducer,
  editEvent: editEventSlice.reducer,
  entities: eventsEntitiesSlice.reducer,
  getCurrentMonthEvents: getCurrentMonthEventsSlice.reducer,
  getSomedayEvents: getSomedayEventsSlice.reducer,
  getWeekEvents: getWeekEventsSlice.reducer,
  getDayEvents: getDayEventsSlice.reducer,
  pendingEvents: pendingEventsSlice.reducer,
});

const syncReducer = combineReducers({
  importGCal: importGCalSlice.reducer,
  importLatest: importLatestSlice.reducer,
});

export const reducers = {
  auth: authSlice.reducer,
  events: eventsReducer,
  settings: settingsSlice.reducer,
  sync: syncReducer,
  view: viewSlice.reducer,
};

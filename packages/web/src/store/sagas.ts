import { all, takeLatest } from "redux-saga/effects";
import {
  convertCalendarToSomedayEvent,
  createEvent,
  deleteEvent,
  editEvent,
  getCurrentMonthEvents,
  getDayEvents,
  getWeekEvents,
} from "@web/ducks/events/sagas/event.sagas";
import {
  convertSomedayToCalendarEvent,
  deleteSomedayEvent,
  getSomedayEvents,
  reorderSomedayEvents,
} from "@web/ducks/events/sagas/someday.sagas";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  getCurrentMonthEventsSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";

export function* sagas() {
  yield all([eventSagas(), somedayEventSagas()]);
}

function* eventSagas() {
  yield takeLatest(getDayEventsSlice.actions.request.type, getDayEvents);
  yield takeLatest(getWeekEventsSlice.actions.request.type, getWeekEvents);
  yield takeLatest(
    getWeekEventsSlice.actions.convert.type,
    convertCalendarToSomedayEvent,
  );
  yield takeLatest(
    getCurrentMonthEventsSlice.actions.request.type,
    getCurrentMonthEvents,
  );
  yield takeLatest(createEventSlice.actions.request.type, createEvent);
  yield takeLatest(editEventSlice.actions.request.type, editEvent);
  yield takeLatest(deleteEventSlice.actions.request.type, deleteEvent);
}

function* somedayEventSagas() {
  yield takeLatest(
    getSomedayEventsSlice.actions.convert.type,
    convertSomedayToCalendarEvent,
  );
  yield takeLatest(
    getSomedayEventsSlice.actions.request.type,
    getSomedayEvents,
  );
  yield takeLatest(
    getSomedayEventsSlice.actions.delete.type,
    deleteSomedayEvent,
  );
  yield takeLatest(
    getSomedayEventsSlice.actions.reorder.type,
    reorderSomedayEvents,
  );
}

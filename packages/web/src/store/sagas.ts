import { all, takeLatest } from "redux-saga/effects";
import {
  convertCalendarToSomedayEvent,
  createEvent,
  deleteEvent,
  editEvent,
  getCurrentMonthEvents,
  getWeekEvents,
} from "@web/ducks/events/sagas/event.sagas";
import {
  convertSomedayToCalendarEvent,
  deleteSomedayEvent,
  getSomedayEvents,
  reorderSomedayEvents,
} from "@web/ducks/events/sagas/someday.sagas";
import { importGCal } from "@web/ducks/events/sagas/sync.sagas";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  getCurrentMonthEventsSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";

export function* sagas() {
  yield all([eventSagas(), somedayEventSagas(), syncSagas()]);
}

function* eventSagas() {
  yield takeLatest(getWeekEventsSlice.actions.request, getWeekEvents);
  yield takeLatest(
    getWeekEventsSlice.actions.convert,
    convertCalendarToSomedayEvent,
  );
  yield takeLatest(
    getCurrentMonthEventsSlice.actions.request,
    getCurrentMonthEvents,
  );
  yield takeLatest(createEventSlice.actions.request, createEvent);
  yield takeLatest(editEventSlice.actions.request, editEvent);
  yield takeLatest(deleteEventSlice.actions.request, deleteEvent);
}

function* somedayEventSagas() {
  yield takeLatest(
    getSomedayEventsSlice.actions.convert,
    convertSomedayToCalendarEvent,
  );
  yield takeLatest(getSomedayEventsSlice.actions.request, getSomedayEvents);
  yield takeLatest(getSomedayEventsSlice.actions.delete, deleteSomedayEvent);
  yield takeLatest(getSomedayEventsSlice.actions.reorder, reorderSomedayEvents);
}

function* syncSagas() {
  yield takeLatest(importGCalSlice.actions.request, importGCal);
}

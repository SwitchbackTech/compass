import { all, takeLatest } from "redux-saga/effects";
import {
  getWeekEvents,
  convertTimedEvent,
  getCurrentMonthEvents,
  editEvent,
  deleteEvent,
  createEvent,
} from "@web/ducks/events/sagas/event.sagas";
import {
  convertSomedayEvent,
  getSomedayEvents,
  deleteSomedayEvent,
  reorderSomedayEvents,
} from "@web/ducks/events/sagas/somday.sagas";
import {
  getCurrentMonthEventsSlice,
  createEventSlice,
  editEventSlice,
  deleteEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";

export function* sagas() {
  yield all([eventSagas(), somedayEventSagas()]);
}

function* eventSagas() {
  yield takeLatest(getWeekEventsSlice.actions.request, getWeekEvents);
  yield takeLatest(getWeekEventsSlice.actions.convert, convertTimedEvent);
  yield takeLatest(
    getCurrentMonthEventsSlice.actions.request,
    getCurrentMonthEvents,
  );
  yield takeLatest(createEventSlice.actions.request, createEvent);
  yield takeLatest(editEventSlice.actions.request, editEvent);
  yield takeLatest(deleteEventSlice.actions.request, deleteEvent);
}

function* somedayEventSagas() {
  yield takeLatest(getSomedayEventsSlice.actions.convert, convertSomedayEvent);
  yield takeLatest(getSomedayEventsSlice.actions.request, getSomedayEvents);
  yield takeLatest(getSomedayEventsSlice.actions.delete, deleteSomedayEvent);
  yield takeLatest(getSomedayEventsSlice.actions.reorder, reorderSomedayEvents);
}

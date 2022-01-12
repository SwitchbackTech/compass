import { call, put, takeLatest, select } from "@redux-saga/core/effects";
import { normalize, schema } from "normalizr";
import dayjs from "dayjs";

import { Params_Events_Wip, Schema_Event } from "@core/types/event.types";

import { Payload_NormalizedAsyncAction } from "@web/common/types/entities";
import { YEAR_MONTH_DAY_FORMAT } from "@web/common/constants/dates";

import { EventApi } from "@web/ducks/events/event.api";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  eventsEntitiesSlice,
  getCurrentMonthEventsSlice,
  getFutureEventsSlice,
  getWeekEventsSlice,
} from "./slice";
import {
  Action_CreateEvent,
  Payload_DeleteEvent,
  Action_EditEvent,
  Response_GetEventsSaga,
  Response_GetEventsSuccess,
  Action_GetPaginatedEvents,
  Action_GetWeekEvents,
} from "./types";
import { selectPaginatedEventsBySectionType } from "./selectors";

function* getEventsSaga(payload: Params_Events_Wip) {
  const res: Response_GetEventsSuccess = (yield call(
    EventApi.get,
    payload
  )) as Response_GetEventsSuccess;

  const eventsSchema = new schema.Entity("events", {}, { idAttribute: "_id" });
  const normalizedEvents = normalize<Schema_Event>(res.data, [eventsSchema]);

  yield put(
    eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events)
  );

  return {
    ...res,
    data: normalizedEvents.result as Payload_NormalizedAsyncAction,
  };
}

function* getWeekEventsSaga({ payload }: Action_GetWeekEvents) {
  try {
    const data: Response_GetEventsSaga = (yield call(
      getEventsSaga,
      payload
    )) as Response_GetEventsSaga;

    yield put(getWeekEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getWeekEventsSlice.actions.error());
  }
}

function* getCurrentMonthEventsSaga({ payload }: Action_GetPaginatedEvents) {
  try {
    const startDate = dayjs().startOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const endDate = dayjs().endOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const data: Response_GetEventsSaga = (yield call(getEventsSaga, {
      ...payload,
      startDate,
      endDate,
    })) as Response_GetEventsSaga;

    yield put(getCurrentMonthEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getCurrentMonthEventsSlice.actions.error());
  }
}

function* getFutureEventsSaga({ payload }: Action_GetPaginatedEvents) {
  try {
    const startDate = dayjs().endOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const data: Response_GetEventsSaga = (yield call(getEventsSaga, {
      ...payload,
      startDate,
    })) as Response_GetEventsSaga;

    yield put(getFutureEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getFutureEventsSlice.actions.error());
  }
}

function* getEverySectionEvents() {
  const currentMonthEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "currentMonth")
  )) as Response_GetEventsSaga;

  const futureEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "future")
  )) as Response_GetEventsSaga;

  const weekEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "week")
  )) as Response_GetEventsSaga;

  yield put(getCurrentMonthEventsSlice.actions.request(currentMonthEvents));
  yield put(getFutureEventsSlice.actions.request(futureEvents));
  yield put(getWeekEventsSlice.actions.request(weekEvents));
}

function* createEventSaga({ payload }: Action_CreateEvent) {
  try {
    yield call(EventApi.create, payload);
    yield put(createEventSlice.actions.success());

    yield call(getEverySectionEvents);
  } catch (error) {
    yield put(createEventSlice.actions.error());
  }
}

function* deleteEventSaga({ payload }: Payload_DeleteEvent) {
  try {
    yield call(EventApi.delete, payload._id);
    yield put(deleteEventSlice.actions.success());

    yield call(getEverySectionEvents);
  } catch (error) {
    yield put(deleteEventSlice.actions.error());
  }
}

function* editEventSaga({ payload }: Action_EditEvent) {
  try {
    yield call(EventApi.edit, payload._id, payload.event);
    yield put(editEventSlice.actions.success());
    yield call(getEverySectionEvents);
  } catch (error) {
    yield put(editEventSlice.actions.error());
  }
}

export function* eventsSagas() {
  yield takeLatest(getWeekEventsSlice.actions.request, getWeekEventsSaga);
  yield takeLatest(
    getCurrentMonthEventsSlice.actions.request,
    getCurrentMonthEventsSaga
  );
  yield takeLatest(getFutureEventsSlice.actions.request, getFutureEventsSaga);
  yield takeLatest(createEventSlice.actions.request, createEventSaga);
  yield takeLatest(editEventSlice.actions.request, editEventSaga);
  yield takeLatest(deleteEventSlice.actions.request, deleteEventSaga);
}

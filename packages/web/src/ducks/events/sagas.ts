import { call, put, takeLatest, select } from "@redux-saga/core/effects";
import { normalize } from "normalizr";
import dayjs from "dayjs";

import { Params_Events, Schema_Event } from "@core/types/event.types";

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
  Action_EditEvent,
  Response_GetEventsSaga,
  Response_GetEventsSuccess,
  Action_GetPaginatedEvents,
  Action_GetWeekEvents,
  Response_CreateEventSaga,
  Action_DeleteEvent,
  Entities_Event,
} from "./types";
import { selectPaginatedEventsBySectionType } from "./selectors";
import { handleErrorTemp, normalizedEventsSchema } from "./event.helpers";
import { Response_HttpPaginatedSuccess } from "@web/common/types/apiTypes";

function* createEventSaga({ payload }: Action_CreateEvent) {
  try {
    const res = (yield call(
      EventApi.create,
      payload
    )) as Response_CreateEventSaga;

    const normalizedEvent = normalize<Schema_Event>(
      res.data,
      normalizedEventsSchema()
    );

    yield put(getWeekEventsSlice.actions.insert(res.data._id));
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvent.entities.events)
    );
    yield put(createEventSlice.actions.success());
  } catch (error) {
    handleErrorTemp(error);
    yield put(createEventSlice.actions.error());
  }
}

export function* deleteEventSaga({ payload }: Action_DeleteEvent) {
  try {
    yield put(getWeekEventsSlice.actions.delete(payload));
    yield put(eventsEntitiesSlice.actions.delete(payload));
    yield call(EventApi.delete, payload._id);
    yield put(deleteEventSlice.actions.success());
  } catch (error) {
    handleErrorTemp(error);
    yield put(deleteEventSlice.actions.error());
  }
}

export function* editEventSaga({ payload }: Action_EditEvent) {
  try {
    yield put(eventsEntitiesSlice.actions.edit(payload));
    yield call(EventApi.edit, payload._id, payload.event);
    yield call(getEverySectionEvents);
    yield put(editEventSlice.actions.success());
  } catch (error) {
    handleErrorTemp(error);
    yield put(editEventSlice.actions.error());
  }
}

function* getEventsSaga(
  payload: Params_Events | Response_HttpPaginatedSuccess<Entities_Event>
) {
  try {
    if (!payload.startDate && !payload.endDate && "data" in payload) {
      yield put(eventsEntitiesSlice.actions.insert(payload.data));
      return { data: payload.data };
    }
    const res: Response_GetEventsSuccess = (yield call(
      EventApi.get,
      payload
    )) as Response_GetEventsSuccess;

    const normalizedEvents = normalize<Schema_Event>(res.data, [
      normalizedEventsSchema(),
    ]);

    console.log("inserting normalized events");
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events)
    );
    return {
      data: normalizedEvents.result as Payload_NormalizedAsyncAction,
    };
  } catch (error) {
    handleErrorTemp(error);
    return error;
  }
}

function* getWeekEventsSaga({ payload }: Action_GetWeekEvents) {
  try {
    const data: Response_GetEventsSaga = yield call(getEventsSaga, payload);
    yield put(getWeekEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getWeekEventsSlice.actions.error());
    handleErrorTemp(error);
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
    handleErrorTemp(error);
    yield put(getCurrentMonthEventsSlice.actions.error());
  }
}

function* getFutureEventsSaga({ payload }: Action_GetPaginatedEvents) {
  try {
    const startDate = dayjs().endOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const data: Response_GetEventsSaga = (yield call(getEventsSaga, {
      ...payload,
      startDate,
      endDate: "2022-12-31",
    })) as Response_GetEventsSaga;

    console.log("reminder: not getting events past dec 2022");
    yield put(getFutureEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getFutureEventsSlice.actions.error());
  }
}

function* getEverySectionEvents() {
  // gets data from state, categorized by time frame (week, month, future)
  /*
  const currentMonthEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "currentMonth")
  )) as Response_GetEventsSaga;

  const futureEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "future")
  )) as Response_GetEventsSaga;

  */
  const weekEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "week")
  )) as Response_GetEventsSaga;

  // yield put(getCurrentMonthEventsSlice.actions.request(currentMonthEvents));
  // yield put(getFutureEventsSlice.actions.request(futureEvents));
  // console.log("weekEvents [getEvSec]:", weekEvents);
  yield put(getWeekEventsSlice.actions.request(weekEvents));
}

/************
 * Assemble
 ***********/
export function* eventsSagas() {
  // TODO consider replacing some takeLatests with takeEverys so you can
  // run some sagas concurrently
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

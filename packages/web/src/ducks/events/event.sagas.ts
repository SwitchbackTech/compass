import { call, put, takeLatest, select } from "@redux-saga/core/effects";
import { normalize } from "normalizr";
import dayjs from "dayjs";
import { Params_Events, Schema_Event } from "@core/types/event.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entities";
import { YEAR_MONTH_DAY_FORMAT } from "@web/common/constants/dates";
import { EventApi } from "@web/ducks/events/event.api";
import { Response_HttpPaginatedSuccess } from "@web/common/types/apiTypes";
import { selectEventById } from "@web/ducks/events/selectors";

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
  Action_ConvertSomedayEvent,
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
import { handleErrorTemp, normalizedEventsSchema } from "./event.utils";

/*
 * Converts Someday event into a regular, timed event
 */
function* convertSomedayEventSaga({ payload }: Action_ConvertSomedayEvent) {
  try {
    const currEvent = (yield select((state) =>
      selectEventById(state, payload._id)
    )) as Response_GetEventsSaga;
    const { _id, updatedFields } = payload;
    const updatedEvent = { ...currEvent, ...updatedFields };

    const res = yield call(EventApi.edit, _id, updatedEvent);
    yield put(getWeekEventsSlice.actions.insert(res.data._id));

    const normalizedEvent = normalize<Schema_Event>(
      res.data,
      normalizedEventsSchema()
    );
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvent.entities.events)
    );

    const futureEvents: Response_GetEventsSaga = (yield select((state) =>
      selectPaginatedEventsBySectionType(state, "future")
    )) as Response_GetEventsSaga;

    yield put(getFutureEventsSlice.actions.request(futureEvents));
    yield put(getFutureEventsSlice.actions.success());
  } catch (error) {
    yield put(getFutureEventsSlice.actions.error());
    handleErrorTemp(error);
  }
}

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

    if (payload.isSomeday) {
      yield put(getFutureEventsSlice.actions.insert(res.data._id));
    } else {
      yield put(getWeekEventsSlice.actions.insert(res.data._id));
    }

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

export function* deleteSomedayEventSaga({ payload }: Action_DeleteEvent) {
  try {
    // doesn't call futureEventsSlice..delete, because that
    // is (somehow) automatically called in response to entity slice
    // delete
    yield put(eventsEntitiesSlice.actions.delete(payload));

    yield call(EventApi.delete, payload._id);
  } catch (error) {
    handleErrorTemp(error);
    yield put(getFutureEventsSlice.actions.error());
    yield put(getFutureEventsSlice.actions.request());
  }
}

export function* editEventSaga({ payload }: Action_EditEvent) {
  try {
    yield put(eventsEntitiesSlice.actions.edit(payload));
    yield call(EventApi.edit, payload._id, payload.event);
    yield put(editEventSlice.actions.success());
  } catch (error) {
    handleErrorTemp(error);
    yield put(editEventSlice.actions.error());
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

    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events)
    );
    return {
      data: normalizedEvents.result as Payload_NormalizedAsyncAction,
    };
  } catch (error) {
    handleErrorTemp(error);
  }
}

/*
 * gets data from state, categorized by time frame (week, month, future)
 */
function* getEverySectionEvents() {
  /*
  const currentMonthEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "currentMonth")
  )) as Response_GetEventsSaga;
  */

  const futureEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "future")
  )) as Response_GetEventsSaga;

  const weekEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "week")
  )) as Response_GetEventsSaga;

  // yield put(getCurrentMonthEventsSlice.actions.request(currentMonthEvents));
  yield put(getFutureEventsSlice.actions.request(futureEvents));
  yield put(getWeekEventsSlice.actions.request(weekEvents));
}

export function* getSomedayEventsSaga() {
  try {
    const res: Response_GetEventsSuccess = (yield call(EventApi.get, {
      someday: true,
    })) as Response_GetEventsSuccess;

    const normalizedEvents = normalize<Schema_Event>(res.data, [
      normalizedEventsSchema(),
    ]);
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events)
    );

    const data = {
      data: normalizedEvents.result as Payload_NormalizedAsyncAction,
    };
    yield put(getFutureEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getFutureEventsSlice.actions.error());
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

/************
 * Assemble
 ***********/
export function* eventsSagas() {
  yield takeLatest(getWeekEventsSlice.actions.request, getWeekEventsSaga);
  yield takeLatest(
    getCurrentMonthEventsSlice.actions.request,
    getCurrentMonthEventsSaga
  );
  yield takeLatest(
    getFutureEventsSlice.actions.convert,
    convertSomedayEventSaga
  );
  yield takeLatest(getFutureEventsSlice.actions.request, getSomedayEventsSaga);
  yield takeLatest(getFutureEventsSlice.actions.delete, deleteSomedayEventSaga);
  yield takeLatest(createEventSlice.actions.request, createEventSaga);
  yield takeLatest(editEventSlice.actions.request, editEventSaga);
  yield takeLatest(deleteEventSlice.actions.request, deleteEventSaga);
}

import { call, put, takeLatest, select } from "@redux-saga/core/effects";
import { normalize, schema } from "normalizr";
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
  Payload_DeleteEvent,
  Action_EditEvent,
  Response_GetEventsSaga,
  Response_GetEventsSuccess,
  Action_GetPaginatedEvents,
  Action_GetWeekEvents,
  Response_CreateEventSaga,
  Action_DeleteEvent,
} from "./types";
import {
  selectPaginatedEventsBySectionType,
  selectEventIdsBySectionType,
} from "./selectors";
import { useSelector } from "react-redux";
import { RootState } from "@web/store";

function* createEventSaga({ payload }: Action_CreateEvent) {
  try {
    const res = (yield call(
      EventApi.create,
      payload
    )) as Response_CreateEventSaga;

    const eventsSchema = new schema.Entity(
      "events",
      {},
      { idAttribute: "_id" }
    );
    const normalizedEvent = normalize<Schema_Event>(res.data, eventsSchema);
    console.log("!!normalizedEvent:", normalizedEvent);

    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvent.entities.events)
    );
    yield put(createEventSlice.actions.success());
    // const getSecEvts = yield call(getEverySectionEvents);
    // console.log("\tgetEverySectionRes:", getSecEvts);
  } catch (error) {
    yield put(createEventSlice.actions.error());
  }
}
function* deleteEventSaga({ payload }: Action_DeleteEvent) {
  try {
    // removing the ids from weekEvents, if applicable
    const weekEventIds = useSelector((state: RootState) =>
      selectEventIdsBySectionType(state, "week")
    );
    const newIds = weekEventIds.filter((i) => i !== "61df541f2df0ab4959240450");
    console.log("newIds:", newIds);
    // yield put(
    //   getWeekEventsSlice.actions.success({ type: "foo", payload: newIds })
    // );

    yield call(EventApi.delete, payload._id); // $$ move to end to speed up state
    const afterDelState = yield put(
      eventsEntitiesSlice.actions.delete(payload)
    );
    console.log("afterDelState:", afterDelState);

    // $$ create new saga/reducer that calls getWeekEvents.actions.request(new state)

    yield takeLatest(getWeekEventsSlice.actions.request, getWeekEventsSaga);
    // yield call(getEverySectionEvents);
  } catch (error) {
    console.log(error);
    yield put(deleteEventSlice.actions.error());
  }
}

function* editEventSaga({ payload }: Action_EditEvent) {
  try {
    yield put(eventsEntitiesSlice.actions.edit(payload));
    yield call(EventApi.edit, payload._id, payload.event); // $$ move lower?
    yield put(editEventSlice.actions.success());
    yield call(getEverySectionEvents);
  } catch (error) {
    yield put(editEventSlice.actions.error());
  }
}

function* getEventsSaga(payload: Params_Events) {
  if (!payload.startDate && !payload.endDate && "data" in payload) {
    console.log("[getEventsSaga] (normalized?) data passed:", payload);
    /* testing if you dont need to normalize
    const eventsSchema = new schema.Entity(
      "events",
      {},
      { idAttribute: "_id" }
    );
    const normalizedEvents = normalize<Schema_Event>(
      payload.data,
      eventsSchema
    );

    yield put(eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events));
    */
    yield put(eventsEntitiesSlice.actions.insert(payload.data));

    // $$ this below works
    return { data: payload.data };
  }
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
    const data: Response_GetEventsSaga = yield call(getEventsSaga, payload);
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

  // tells the store to do these things, given this state data
  // yield put(getCurrentMonthEventsSlice.actions.request(currentMonthEvents));
  // yield put(getFutureEventsSlice.actions.request(futureEvents));
  yield put(getWeekEventsSlice.actions.request(weekEvents));
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
  yield takeLatest(getFutureEventsSlice.actions.request, getFutureEventsSaga);
  yield takeLatest(createEventSlice.actions.request, createEventSaga);
  yield takeLatest(editEventSlice.actions.request, editEventSaga);
  yield takeLatest(deleteEventSlice.actions.request, deleteEventSaga);
}

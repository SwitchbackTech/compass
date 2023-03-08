import { call, put, takeLatest, select } from "@redux-saga/core/effects";
import { normalize } from "normalizr";
import dayjs from "dayjs";
import { Params_Events, Schema_Event } from "@core/types/event.types";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { EventApi } from "@web/ducks/events/event.api";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { selectEventById } from "@web/ducks/events/event.selectors";
import {
  handleError,
  normalizedEventsSchema,
} from "@web/common/utils/event.util";

import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  eventsEntitiesSlice,
  getCurrentMonthEventsSlice,
  getSomedayEventsSlice,
  getWeekEventsSlice,
} from "../event.slice";
import {
  Action_ConvertSomedayEvent,
  Action_ConvertTimedEvent,
  Action_CreateEvent,
  Action_EditEvent,
  Response_GetEventsSaga,
  Response_GetEventsSuccess,
  Action_GetPaginatedEvents,
  Action_GetEvents,
  Response_CreateEventSaga,
  Action_DeleteEvent,
  Entities_Event,
} from "../event.types";
import { selectPaginatedEventsBySectionType } from "../event.selectors";

function* convertSomedayEvent({ payload }: Action_ConvertSomedayEvent) {
  try {
    const { _id, updatedFields } = payload;

    const currEvent = (yield select((state) =>
      selectEventById(state, _id)
    )) as Response_GetEventsSaga;
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

    const somedayEvents: Response_GetEventsSaga = (yield select((state) =>
      selectPaginatedEventsBySectionType(state, "someday")
    )) as Response_GetEventsSaga;

    const remainingSomedayEvents = somedayEvents.data.filter(
      (id) => id !== _id
    );
    yield put(
      getSomedayEventsSlice.actions.success({
        data: remainingSomedayEvents,
      })
    );
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
    handleError(error as Error);
  }
}

function* convertTimedEvent({ payload }: Action_ConvertTimedEvent) {
  try {
    const { event } = payload;

    const res = yield call(EventApi.edit, event._id, event);
    const _event = res.data as Schema_Event;

    yield put(getSomedayEventsSlice.actions.insert(_event._id));

    const normalizedEvent = normalize<Schema_Event>(
      _event,
      normalizedEventsSchema()
    );
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvent.entities.events)
    );

    const timedEvents = (yield select((state) =>
      selectPaginatedEventsBySectionType(state, "week")
    )) as Response_GetEventsSaga;

    const remainingTimedEvents = timedEvents.data.filter(
      (id) => id !== event._id
    );
    yield put(
      getWeekEventsSlice.actions.success({ data: remainingTimedEvents })
    );
  } catch (error) {
    yield put(getWeekEventsSlice.actions.error());
    handleError(error as Error);
  }
}

function* createEvent({ payload }: Action_CreateEvent) {
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
      yield put(getSomedayEventsSlice.actions.insert(res.data._id));
    } else {
      yield put(getWeekEventsSlice.actions.insert(res.data._id));
    }

    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvent.entities.events)
    );
    yield put(createEventSlice.actions.success());
  } catch (error) {
    yield put(createEventSlice.actions.error());
    handleError(error as Error);
  }
}

export function* deleteEvent({ payload }: Action_DeleteEvent) {
  try {
    yield put(getWeekEventsSlice.actions.delete(payload));
    yield put(eventsEntitiesSlice.actions.delete(payload));
    yield call(EventApi.delete, payload._id);
    yield put(deleteEventSlice.actions.success());
  } catch (error) {
    yield put(deleteEventSlice.actions.error());
    handleError(error as Error);
  }
}

export function* deleteSomedayEvent({ payload }: Action_DeleteEvent) {
  try {
    yield put(eventsEntitiesSlice.actions.delete(payload));

    yield call(EventApi.delete, payload._id);
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
    handleError(error as Error);
    yield put(getSomedayEventsSlice.actions.request());
  }
}

export function* editEvent({ payload }: Action_EditEvent) {
  try {
    yield put(eventsEntitiesSlice.actions.edit(payload));
    yield call(EventApi.edit, payload._id, payload.event);
    yield put(editEventSlice.actions.success());
  } catch (error) {
    yield put(editEventSlice.actions.error());
    handleError(error as Error);
  }
}

function* getCurrentMonthEvents({ payload }: Action_GetPaginatedEvents) {
  try {
    const startDate = dayjs().startOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const endDate = dayjs().endOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const data: Response_GetEventsSaga = (yield call(getEvents, {
      ...payload,
      startDate,
      endDate,
    })) as Response_GetEventsSaga;

    yield put(getCurrentMonthEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getCurrentMonthEventsSlice.actions.error());
    handleError(error as Error);
  }
}

function* getEvents(
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
    handleError(error as Error);
  }
}

export function* getSomedayEvents({ payload }: Action_GetEvents) {
  try {
    const res: Response_GetEventsSuccess = (yield call(EventApi.get, {
      someday: true,
      startDate: payload.startDate,
      endDate: payload.endDate,
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
    yield put(getSomedayEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
  }
}

function* getWeekEvents({ payload }: Action_GetEvents) {
  try {
    const data: Response_GetEventsSaga = yield call(getEvents, payload);
    yield put(getWeekEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getWeekEventsSlice.actions.error());
    handleError(error as Error);
  }
}

function* migrateEvent({ payload }: Action_EditEvent) {
  try {
    yield put(eventsEntitiesSlice.actions.edit(payload));
    yield call(EventApi.edit, payload._id, payload.event);

    yield put(getSomedayEventsSlice.actions.remove(payload));
    yield put(editEventSlice.actions.success());
  } catch (error) {
    yield put(editEventSlice.actions.error());
    handleError(error as Error);
  }
}

/************
 * Assemble
 ***********/
export function* eventsSagas() {
  yield takeLatest(getWeekEventsSlice.actions.request, getWeekEvents);
  yield takeLatest(getWeekEventsSlice.actions.convert, convertTimedEvent);
  yield takeLatest(
    getCurrentMonthEventsSlice.actions.request,
    getCurrentMonthEvents
  );
  yield takeLatest(getSomedayEventsSlice.actions.convert, convertSomedayEvent);
  yield takeLatest(getSomedayEventsSlice.actions.request, getSomedayEvents);
  yield takeLatest(getSomedayEventsSlice.actions.delete, deleteSomedayEvent);
  yield takeLatest(createEventSlice.actions.request, createEvent);
  yield takeLatest(editEventSlice.actions.request, editEvent);
  yield takeLatest(editEventSlice.actions.migrate, migrateEvent);
  yield takeLatest(deleteEventSlice.actions.request, deleteEvent);
}

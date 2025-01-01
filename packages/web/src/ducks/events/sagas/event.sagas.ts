import { normalize } from "normalizr";
import dayjs from "dayjs";
import { call, put, takeLatest, select } from "@redux-saga/core/effects";
import { Params_Events, Schema_Event } from "@core/types/event.types";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { RootState } from "@web/store";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { EventApi } from "@web/ducks/events/event.api";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { selectPaginatedEventsBySectionType } from "@web/ducks/events/selectors/util.selectors";
import {
  replaceIdWithOptimisticId,
  handleError,
} from "@web/common/utils/event.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { ID_OPTIMISTIC_PREFIX } from "@web/common/constants/web.constants";
import { AxiosResponse } from "axios";

import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  eventsEntitiesSlice,
  getCurrentMonthEventsSlice,
} from "../slices/event.slice";
import { getWeekEventsSlice } from "../slices/week.slice";
import {
  Action_ConvertSomedayEvent,
  Action_ConvertTimedEvent,
  Action_CreateEvent,
  Action_DeleteEvent,
  Action_EditEvent,
  Response_GetEventsSaga,
  Response_GetEventsSuccess,
  Action_GetPaginatedEvents,
  Action_GetEvents,
  Response_CreateEventSaga,
  Entities_Event,
} from "../event.types";
import { getSomedayEventsSlice } from "../slices/someday.slice";
import { Action_Someday_Reorder } from "../slices/someday.slice.types";
import {
  insertOptimisticEvent,
  normalizedEventsSchema,
  replaceOptimisticId,
} from "./event.saga.util";

function* convertSomedayEvent({ payload }: Action_ConvertSomedayEvent) {
  const { _id, updatedFields } = payload;
  const optimisticId: string | null = null;

  try {
    //get grid event from store
    const currEvent = (yield select((state: RootState) =>
      selectEventById(state, _id)
    )) as Response_GetEventsSaga;
    const gridEvent = { ...currEvent, ...updatedFields };
    // remove extra props before sending to DB
    delete gridEvent.order;
    delete gridEvent.recurrence;

    //get optimisitcGridEvent
    const optimisticGridEvent = replaceIdWithOptimisticId(gridEvent);
    yield put(getSomedayEventsSlice.actions.remove({ _id }));
    yield* insertOptimisticEvent(optimisticGridEvent, false);

    // call API
    const response = (yield call(
      EventApi.edit,
      _id,
      gridEvent,
      {}
    )) as AxiosResponse<Schema_Event>;

    const convertedEvent = response.data;

    // replace ids
    yield* replaceOptimisticId(
      optimisticGridEvent._id,
      convertedEvent._id as string,
      false
    );
  } catch (error) {
    if (optimisticId) {
      yield put(eventsEntitiesSlice.actions.delete({ _id: optimisticId }));
    }
    yield put(getSomedayEventsSlice.actions.insert(_id));
    yield put(getSomedayEventsSlice.actions.error());
    handleError(error as Error);
  }
}

function* convertTimedEvent({ payload }: Action_ConvertTimedEvent) {
  try {
    const res = yield call(EventApi.edit, payload.event._id, payload.event);
    const event = res.data as Schema_Event;

    yield put(getSomedayEventsSlice.actions.insert(event._id));

    const normalizedEvent = normalize<Schema_Event>(
      event,
      normalizedEventsSchema()
    );
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvent.entities.events)
    );

    const timedEvents = (yield select((state: RootState) =>
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
  const event = replaceIdWithOptimisticId(payload);
  const optimisticId = event._id;

  try {
    yield* insertOptimisticEvent(event, payload.isSomeday);

    const res = (yield call(
      EventApi.create,
      payload
    )) as Response_CreateEventSaga;

    yield* replaceOptimisticId(optimisticId, res.data._id, payload.isSomeday);

    yield put(createEventSlice.actions.success());
  } catch (error) {
    yield put(createEventSlice.actions.error());
    yield call(deleteEvent, {
      payload: { _id: optimisticId },
    } as Action_DeleteEvent);
    handleError(error as Error);
  }
}

export function* deleteEvent({ payload }: Action_DeleteEvent) {
  const event = (yield select((state: RootState) =>
    selectEventById(state, payload._id)
  )) as Schema_GridEvent;

  try {
    yield put(getWeekEventsSlice.actions.delete(payload));
    yield put(eventsEntitiesSlice.actions.delete(payload));

    const isInDb = !event._id.startsWith(ID_OPTIMISTIC_PREFIX);
    if (isInDb) {
      yield call(EventApi.delete, payload._id);
    }

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
  const { _id, applyTo, event, shouldRemove } = payload;

  try {
    shouldRemove
      ? yield put(eventsEntitiesSlice.actions.delete({ _id }))
      : yield put(eventsEntitiesSlice.actions.edit(payload));

    yield call(EventApi.edit, _id, event, {
      applyTo: applyTo,
    });
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
    const res = (yield call(EventApi.get, {
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
    const data = (yield call(getEvents, payload)) as Response_GetEventsSaga;
    yield put(getWeekEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getWeekEventsSlice.actions.error());
    handleError(error as Error);
  }
}

function* reorderSomedayEvents({ payload }: Action_Someday_Reorder) {
  try {
    yield call(EventApi.reorder, payload);
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
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
  yield takeLatest(getSomedayEventsSlice.actions.reorder, reorderSomedayEvents);
  yield takeLatest(createEventSlice.actions.request, createEvent);
  yield takeLatest(editEventSlice.actions.request, editEvent);
  yield takeLatest(deleteEventSlice.actions.request, deleteEvent);
}

import dayjs from "dayjs";
import { normalize } from "normalizr";
import { call, put, select } from "@redux-saga/core/effects";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Params_Events, Schema_Event } from "@core/types/event.types";
import { ID_OPTIMISTIC_PREFIX } from "@web/common/constants/web.constants";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  handleError,
  replaceIdWithOptimisticId,
} from "@web/common/utils/event.util";
import { EventApi } from "@web/ducks/events/event.api";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { selectPaginatedEventsBySectionType } from "@web/ducks/events/selectors/util.selectors";
import { RootState } from "@web/store";
import {
  Action_ConvertTimedEvent,
  Action_CreateEvent,
  Action_DeleteEvent,
  Action_EditEvent,
  Action_GetEvents,
  Action_GetPaginatedEvents,
  Entities_Event,
  Response_CreateEventSaga,
  Response_GetEventsSaga,
  Response_GetEventsSuccess,
} from "../event.types";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  eventsEntitiesSlice,
  getCurrentMonthEventsSlice,
} from "../slices/event.slice";
import { getSomedayEventsSlice } from "../slices/someday.slice";
import { getWeekEventsSlice } from "../slices/week.slice";
import {
  EventDateUtils,
  insertOptimisticEvent,
  normalizedEventsSchema,
  replaceOptimisticId,
} from "./saga.util";

export function* convertTimedEvent({ payload }: Action_ConvertTimedEvent) {
  try {
    const res = yield call(EventApi.edit, payload.event._id, payload.event);
    const event = res.data as Schema_Event;

    yield put(getSomedayEventsSlice.actions.insert(event._id));

    const normalizedEvent = normalize<Schema_Event>(
      event,
      normalizedEventsSchema(),
    );
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvent.entities.events),
    );

    const timedEvents = (yield select((state: RootState) =>
      selectPaginatedEventsBySectionType(state, "week"),
    )) as Response_GetEventsSaga;

    const remainingTimedEvents = timedEvents.data.filter(
      (id) => id !== event._id,
    );
    yield put(
      getWeekEventsSlice.actions.success({ data: remainingTimedEvents }),
    );
  } catch (error) {
    yield put(getWeekEventsSlice.actions.error());
    handleError(error as Error);
  }
}

export function* createEvent({ payload }: Action_CreateEvent) {
  const event = replaceIdWithOptimisticId(payload);
  const optimisticId = event._id;

  try {
    yield* insertOptimisticEvent(event, payload.isSomeday);

    const res = (yield call(
      EventApi.create,
      payload,
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
    selectEventById(state, payload._id),
  )) as Schema_GridEvent;

  try {
    yield put(getWeekEventsSlice.actions.delete(payload));
    yield put(eventsEntitiesSlice.actions.delete(payload));

    const isInDb = !event._id.startsWith(ID_OPTIMISTIC_PREFIX);
    if (isInDb) {
      yield call(EventApi.delete, payload._id, payload.applyTo);
    }

    yield put(deleteEventSlice.actions.success());
  } catch (error) {
    yield put(deleteEventSlice.actions.error());
    handleError(error as Error);
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

export function* getCurrentMonthEvents({ payload }: Action_GetPaginatedEvents) {
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
  payload: Params_Events | Response_HttpPaginatedSuccess<Entities_Event>,
) {
  try {
    if (!payload.startDate && !payload.endDate && "data" in payload) {
      yield put(eventsEntitiesSlice.actions.insert(payload.data));
      return { data: payload.data };
    }

    const _payload = EventDateUtils.adjustStartEndDate(payload);

    const res: Response_GetEventsSuccess = (yield call(
      EventApi.get,
      _payload,
    )) as Response_GetEventsSuccess;

    const events = EventDateUtils.filterEventsByStartEndDate(
      res.data,
      payload.startDate as string,
      payload.endDate as string,
    );

    const normalizedEvents = normalize<Schema_Event>(events, [
      normalizedEventsSchema(),
    ]);

    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events),
    );
    return {
      data: normalizedEvents.result as Payload_NormalizedAsyncAction,
    };
  } catch (error) {
    handleError(error as Error);
  }
}

export function* getWeekEvents({ payload }: Action_GetEvents) {
  try {
    const data = (yield call(getEvents, payload)) as Response_GetEventsSaga;
    yield put(getWeekEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getWeekEventsSlice.actions.error());
    handleError(error as Error);
  }
}

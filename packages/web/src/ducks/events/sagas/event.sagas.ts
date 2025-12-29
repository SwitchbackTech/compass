import { normalize } from "normalizr";
import { call, put, select } from "@redux-saga/core/effects";
import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import {
  Params_Events,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import {
  Schema_GridEvent,
  Schema_OptimisticEvent,
} from "@web/common/types/web.event.types";
import { handleError } from "@web/common/utils/event/event.util";
import { EventApi } from "@web/ducks/events/event.api";
import {
  Action_ConvertEvent,
  Action_CreateEvent,
  Action_DeleteEvent,
  Action_EditEvent,
  Action_GetEvents,
  Action_GetPaginatedEvents,
  Entities_Event,
  Response_GetEventsSaga,
  Response_GetEventsSuccess,
} from "@web/ducks/events/event.types";
import {
  EventDateUtils,
  _assembleGridEvent,
  _createOptimisticGridEvent,
  _editEvent,
  normalizedEventsSchema,
  replaceOptimisticId,
} from "@web/ducks/events/sagas/saga.util";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  eventsEntitiesSlice,
  getCurrentMonthEventsSlice,
} from "@web/ducks/events/slices/event.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { RootState } from "@web/store";

export function* convertCalendarToSomedayEvent({
  payload,
}: Action_ConvertEvent) {
  let optimisticEvent: Schema_OptimisticEvent | null = null;

  try {
    const gridEvent = yield* _assembleGridEvent(payload.event);
    const isInstance = typeof gridEvent.recurrence?.eventId === "string";
    const { ALL_EVENTS, THIS_EVENT } = RecurringEventUpdateScope;
    const applyTo = isInstance ? ALL_EVENTS : THIS_EVENT;

    // optimistic event will have an entirely new ID that will not match that eventually saved
    optimisticEvent = yield* _createOptimisticGridEvent(gridEvent, true);

    yield* _editEvent(gridEvent, { applyTo });
    yield* replaceOptimisticId(optimisticEvent._id, false);
    yield put(editEventSlice.actions.success());
  } catch (error) {
    if (optimisticEvent) {
      yield put(
        eventsEntitiesSlice.actions.delete({ _id: optimisticEvent._id }),
      );
    }

    yield put(getWeekEventsSlice.actions.insert(payload.event._id!));
    yield put(getDayEventsSlice.actions.insert(payload.event._id!));
    yield put(editEventSlice.actions.error());

    handleError(error as Error);
  }
}

export function* createEvent({ payload }: Action_CreateEvent) {
  const event = yield* _createOptimisticGridEvent(payload, payload.isSomeday);
  const optimisticId = event._id;

  try {
    yield call(EventApi.create, payload);
    yield* replaceOptimisticId(optimisticId, payload.isSomeday!);

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
    yield put(getDayEventsSlice.actions.delete(payload));
    yield put(eventsEntitiesSlice.actions.delete(payload));

    const isInDb = !event?._id?.startsWith(ID_OPTIMISTIC_PREFIX);
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
  const _event = (yield select((state: RootState) =>
    selectEventById(state, payload._id),
  )) as Schema_GridEvent;

  const { _id, applyTo, event, shouldRemove } = payload;

  try {
    if (shouldRemove) yield put(eventsEntitiesSlice.actions.delete({ _id }));
    else yield put(eventsEntitiesSlice.actions.edit(payload));

    yield call(EventApi.edit, _id, event, { applyTo });
    yield put(editEventSlice.actions.success());
  } catch (error) {
    yield put(eventsEntitiesSlice.actions.edit({ ...payload, event: _event }));
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
  payload: Params_Events & Response_HttpPaginatedSuccess<Entities_Event>,
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
    yield put(getWeekEventsSlice.actions.error({}));
    handleError(error as Error);
  }
}

export function* getDayEvents({ payload }: Action_GetEvents) {
  try {
    const data = (yield call(getEvents, {
      ...payload,
      dontAdjustDates: true,
    })) as Response_GetEventsSaga;

    yield put(getDayEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getDayEventsSlice.actions.error({}));
    handleError(error as Error);
  }
}

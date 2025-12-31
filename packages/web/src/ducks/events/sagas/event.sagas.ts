import { normalize } from "normalizr";
import { call, put, select } from "@redux-saga/core/effects";
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
  Schema_WebEvent,
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
import { pendingEventsSlice } from "@web/ducks/events/slices/pending.slice";
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

    // optimistic event will have the same ID as that eventually saved
    optimisticEvent = yield* _createOptimisticGridEvent(gridEvent, true);

    // Mark event as pending when edit starts
    yield put(pendingEventsSlice.actions.add(optimisticEvent._id));

    yield* _editEvent(gridEvent, { applyTo });

    yield put(
      eventsEntitiesSlice.actions.edit({
        _id: optimisticEvent._id,
        event: { ...optimisticEvent, isOptimistic: false } as Schema_WebEvent,
      }),
    );

    // Remove from pending on success
    yield put(pendingEventsSlice.actions.remove(optimisticEvent._id));
    yield put(editEventSlice.actions.success());
  } catch (error) {
    // Remove from pending on error
    if (optimisticEvent) {
      yield put(pendingEventsSlice.actions.remove(optimisticEvent._id));
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

  yield put(pendingEventsSlice.actions.add(event._id));

  try {
    yield call(EventApi.create, event);

    yield put(
      eventsEntitiesSlice.actions.edit({
        _id: event._id,
        event: { ...event, isOptimistic: false } as Schema_WebEvent,
      }),
    );

    yield put(pendingEventsSlice.actions.remove(event._id));
    yield put(createEventSlice.actions.success());
  } catch (error) {
    yield put(pendingEventsSlice.actions.remove(event._id));
    yield put(createEventSlice.actions.error());
    yield call(deleteEvent, {
      payload: { _id: event._id },
    } as Action_DeleteEvent);
    handleError(error as Error);
  }
}

export function* deleteEvent({ payload }: Action_DeleteEvent) {
  try {
    yield put(getWeekEventsSlice.actions.delete(payload));
    yield put(getDayEventsSlice.actions.delete(payload));
    yield put(eventsEntitiesSlice.actions.delete(payload));

    const pendingEventIds = (yield select(
      (state: RootState) => state.events.pendingEvents.eventIds,
    )) as string[];
    const isPending = pendingEventIds.includes(payload._id);
    // Only call delete API if event is not pending (i.e., exists in DB)
    if (!isPending) {
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

  // Mark event as pending when edit starts
  yield put(pendingEventsSlice.actions.add(_id));

  try {
    if (shouldRemove) yield put(eventsEntitiesSlice.actions.delete({ _id }));
    else yield put(eventsEntitiesSlice.actions.edit(payload));

    yield call(EventApi.edit, _id, event, { applyTo });

    // Remove from pending on success
    yield put(pendingEventsSlice.actions.remove(_id));
    yield put(editEventSlice.actions.success());
  } catch (error) {
    // Remove from pending on error
    yield put(pendingEventsSlice.actions.remove(_id));
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

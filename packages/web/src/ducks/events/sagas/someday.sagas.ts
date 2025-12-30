import { normalize } from "normalizr";
import { call, put } from "redux-saga/effects";
import { Schema_Event } from "@core/types/event.types";
import { Schema_OptimisticEvent } from "@web/common/types/web.event.types";
import { handleError } from "@web/common/utils/event/event.util";
import { setSomedayEventsOrder } from "@web/common/utils/event/someday.event.util";
import { EventApi } from "@web/ducks/events/event.api";
import {
  Action_ConvertEvent,
  Action_DeleteEvent,
  Action_GetEvents,
  Response_GetEventsSuccess,
} from "@web/ducks/events/event.types";
import {
  _assembleGridEvent,
  _createOptimisticGridEvent,
  _editEvent,
  getEventById,
  normalizedEventsSchema,
} from "@web/ducks/events/sagas/saga.util";
import {
  editEventSlice,
  eventsEntitiesSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { Action_Someday_Reorder } from "@web/ducks/events/slices/someday.slice.types";

export function* convertSomedayToCalendarEvent({
  payload,
}: Action_ConvertEvent) {
  let optimisticEvent: Schema_OptimisticEvent | null = null;

  try {
    const gridEvent = yield* _assembleGridEvent(payload.event);

    delete gridEvent.recurrence;

    optimisticEvent = yield* _createOptimisticGridEvent(gridEvent);

    yield* _editEvent(gridEvent);

    yield put(
      eventsEntitiesSlice.actions.edit({
        _id: optimisticEvent._id,
        event: {
          ...optimisticEvent,
          isOptimistic: false,
        } as unknown as Schema_Event,
      }),
    );

    yield put(editEventSlice.actions.success());
  } catch (error) {
    if (optimisticEvent) {
      yield put(
        eventsEntitiesSlice.actions.delete({ _id: optimisticEvent._id }),
      );
    }

    yield put(getSomedayEventsSlice.actions.insert(payload.event._id));
    yield put(editEventSlice.actions.error());

    handleError(error as Error);
  }
}

export function* deleteSomedayEvent({ payload }: Action_DeleteEvent) {
  const event = yield* getEventById(payload._id);

  if (!event) {
    console.error(`Event with ID ${payload._id} not found for deletion.`);
    return;
  }

  try {
    yield put(eventsEntitiesSlice.actions.delete(payload));

    yield call(EventApi.delete, payload._id, payload.applyTo);
  } catch (error) {
    yield put(
      getSomedayEventsSlice.actions.error({
        __context: { reason: (error as Error).message },
      }),
    );
    handleError(error as Error);
    yield put(
      eventsEntitiesSlice.actions.insert({
        [payload._id]: event as Schema_Event,
      }),
    );
  }
}

export function* getSomedayEvents({ payload }: Action_GetEvents) {
  try {
    const res = (yield call(EventApi.get, {
      someday: true,
      startDate: payload.startDate,
      endDate: payload.endDate,
    })) as Response_GetEventsSuccess;

    const events = setSomedayEventsOrder(res.data);

    const normalizedEvents = normalize<Schema_Event>(events, [
      normalizedEventsSchema(),
    ]);
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events),
    );

    yield put(
      getSomedayEventsSlice.actions.success({
        data: normalizedEvents.result,
        count: res.count,
        page: res.page,
        pageSize: res.pageSize,
        offset: res.offset,
      }),
    );
  } catch (error) {
    yield put(
      getSomedayEventsSlice.actions.error({
        __context: { reason: (error as Error).message },
      }),
    );
  }
}

export function* reorderSomedayEvents({ payload }: Action_Someday_Reorder) {
  try {
    yield call(EventApi.reorder, payload);
  } catch (error) {
    yield put(
      getSomedayEventsSlice.actions.error({
        __context: { reason: (error as Error).message },
      }),
    );
    handleError(error as Error);
  }
}

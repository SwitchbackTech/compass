import { normalize } from "normalizr";
import { call, put } from "redux-saga/effects";
import { Schema_Event } from "@core/types/event.types";
import { Schema_OptimisticEvent } from "@web/common/schemas/events/draft.event.schemas";
import { handleError } from "@web/common/utils/event.util";
import { setSomedayEventsOrder } from "@web/common/utils/someday.util";
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
  normalizedEventsSchema,
  replaceOptimisticId,
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

    optimisticEvent = yield* _createOptimisticGridEvent(gridEvent);

    yield* _editEvent(gridEvent);
    yield* replaceOptimisticId(optimisticEvent._id, false);
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
  try {
    yield put(eventsEntitiesSlice.actions.delete(payload));

    yield call(EventApi.delete, payload._id, payload.applyTo);
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
    handleError(error as Error);
    yield put(getSomedayEventsSlice.actions.request());
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
  }
}

export function* reorderSomedayEvents({ payload }: Action_Someday_Reorder) {
  try {
    yield call(EventApi.reorder, payload);
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
    handleError(error as Error);
  }
}

import { normalize } from "normalizr";
import { call, put } from "redux-saga/effects";
import { Schema_Event } from "@core/types/event.types";
import { Schema_OptimisticEvent } from "@web/common/types/web.event.types";
import { isUserAuthenticated } from "@web/common/utils/auth/auth.util";
import { handleError } from "@web/common/utils/event/event.util";
import { setSomedayEventsOrder } from "@web/common/utils/event/someday.event.util";
import {
  deleteEventFromIndexedDB,
  getEventsFromIndexedDB,
  updateEventInIndexedDB,
} from "@web/common/utils/storage/indexeddb.util";
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
import { pendingEventsSlice } from "@web/ducks/events/slices/pending.slice";
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

    // Mark event as pending when edit starts
    yield put(pendingEventsSlice.actions.add(optimisticEvent._id));

    // Check if user is authenticated
    const authenticated = (yield call(isUserAuthenticated)) as boolean;

    if (authenticated) {
      yield* _editEvent(gridEvent);
    } else {
      // Update event in IndexedDB for unauthenticated users
      yield call(updateEventInIndexedDB, optimisticEvent._id, {
        ...gridEvent,
        isSomeday: false,
      });
    }

    yield put(
      eventsEntitiesSlice.actions.edit({
        _id: optimisticEvent._id,
        event: {
          ...optimisticEvent,
          isOptimistic: false,
        } as unknown as Schema_Event,
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

    // Check if user is authenticated
    const authenticated = (yield call(isUserAuthenticated)) as boolean;

    if (authenticated) {
      yield call(EventApi.delete, payload._id, payload.applyTo);
    } else {
      // Delete from IndexedDB for unauthenticated users
      yield call(deleteEventFromIndexedDB, payload._id);
    }
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
    // Check if user is authenticated
    const authenticated = (yield call(isUserAuthenticated)) as boolean;

    let events: Schema_Event[] = [];

    if (authenticated) {
      // Fetch from API for authenticated users
      const res = (yield call(EventApi.get, {
        someday: true,
        startDate: payload.startDate,
        endDate: payload.endDate,
      })) as Response_GetEventsSuccess;

      events = setSomedayEventsOrder(res.data);
    } else {
      // Fetch from IndexedDB for unauthenticated users
      const localEvents = (yield call(getEventsFromIndexedDB, {
        someday: true,
        startDate: payload.startDate,
        endDate: payload.endDate,
      })) as Schema_Event[];

      events = setSomedayEventsOrder(localEvents);
    }

    const normalizedEvents = normalize<Schema_Event>(events, [
      normalizedEventsSchema(),
    ]);
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events),
    );

    yield put(
      getSomedayEventsSlice.actions.success({
        data: normalizedEvents.result,
        count: events.length,
        page: 1,
        pageSize: events.length,
        offset: 0,
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
    // Check if user is authenticated
    const authenticated = (yield call(isUserAuthenticated)) as boolean;

    if (authenticated) {
      yield call(EventApi.reorder, payload);
    } else {
      // For unauthenticated users, update the order in IndexedDB
      for (const item of payload) {
        yield call(updateEventInIndexedDB, item._id, { order: item.order });
      }
    }
  } catch (error) {
    yield put(
      getSomedayEventsSlice.actions.error({
        __context: { reason: (error as Error).message },
      }),
    );
    handleError(error as Error);
  }
}

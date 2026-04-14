/**
 * Redux-saga middleware — bridge between Redux actions and the Elf event store.
 * Orchestrates: Redux action → repository call (API or IndexedDB) → Elf store update.
 * All async event operations (create, edit, delete, fetch) go through here.
 * Do not update the Elf store from reducers or components — only sagas do this.
 * Related: docs/development/web-state-guide.md
 */

import { call, put, select } from "@redux-saga/core/effects";
import { normalize } from "normalizr";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import {
  type Params_Events,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  hasUserEverAuthenticated,
  markAnonymousCalendarChangeForSignUpPrompt,
} from "@web/auth/compass/state/auth.state.util";
import { isGoogleRevoked } from "@web/auth/google/state/google.auth.state";
import { session } from "@web/common/classes/Session";
import { getEventRepository } from "@web/common/repositories/event/event.repository.util";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { type Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import {
  type Schema_GridEvent,
  type Schema_OptimisticEvent,
} from "@web/common/types/web.event.types";
import { handleError } from "@web/common/utils/event/event.util";
import {
  type Action_ConvertEvent,
  type Action_CreateEvent,
  type Action_DeleteEvent,
  type Action_EditEvent,
  type Action_GetEvents,
  type Action_GetPaginatedEvents,
  type Entities_Event,
  type Response_GetEventsSaga,
  type Response_GetEventsSuccess,
} from "@web/ducks/events/event.types";
import {
  _assembleGridEvent,
  _createOptimisticGridEvent,
  _editEvent,
  EventDateUtils,
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
import { type RootState } from "@web/store";

function shouldPromptAnonymousSignUp(sessionExists: boolean): boolean {
  return !sessionExists && !hasUserEverAuthenticated() && !isGoogleRevoked();
}

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
        event: optimisticEvent,
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

    yield put(getWeekEventsSlice.actions.insert(payload.event._id));
    yield put(getDayEventsSlice.actions.insert(payload.event._id));
    yield put(editEventSlice.actions.error());

    handleError(error as Error);
  }
}

export function* createEvent({ payload }: Action_CreateEvent): Generator {
  const event = yield* _createOptimisticGridEvent(payload, payload.isSomeday);

  yield put(pendingEventsSlice.actions.add(event._id));

  try {
    const sessionExists = (yield call([
      session,
      "doesSessionExist",
    ])) as boolean;
    const repository = getEventRepository(sessionExists);

    yield call([repository, "create"], event as Schema_Event);
    if (shouldPromptAnonymousSignUp(sessionExists)) {
      markAnonymousCalendarChangeForSignUpPrompt();
    }

    yield put(
      eventsEntitiesSlice.actions.edit({
        _id: event._id,
        event: event,
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
    // Only call delete if event is not pending (i.e., exists in DB)
    if (!isPending) {
      const sessionExists = (yield call([
        session,
        "doesSessionExist",
      ])) as boolean;
      const repository = getEventRepository(sessionExists);
      yield call([repository, "delete"], payload._id, payload.applyTo);
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

    const sessionExists = (yield call([
      session,
      "doesSessionExist",
    ])) as boolean;
    const repository = getEventRepository(sessionExists);
    yield call([repository, "edit"], _id, event as Schema_Event, {
      applyTo,
    });
    if (shouldPromptAnonymousSignUp(sessionExists)) {
      markAnonymousCalendarChangeForSignUpPrompt();
    }

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
    const data: Response_GetEventsSaga = (yield* getEvents({
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

    const sessionExists = (yield call([
      session,
      "doesSessionExist",
    ])) as boolean;
    const repository = getEventRepository(sessionExists);

    const _payload = EventDateUtils.adjustStartEndDate(payload);

    const res = (yield call(
      [repository, "get"],
      _payload,
    )) as Response_GetEventsSuccess;

    const events = EventDateUtils.filterEventsByStartEndDate(
      res.data,
      payload.startDate,
      payload.endDate,
    );

    // Validate response data exists before normalizing
    if (!res.data || !Array.isArray(res.data)) {
      throw new Error(
        "Invalid response from event repository: data field is missing or not an array",
      );
    }

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
    const data = (yield* getEvents({
      ...payload,
      someday: false,
    })) as Response_GetEventsSaga;
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
      someday: false,
    })) as Response_GetEventsSaga;

    yield put(getDayEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getDayEventsSlice.actions.error({}));
    handleError(error as Error);
  }
}

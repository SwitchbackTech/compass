import { call, put, type SelectEffect, select } from "@redux-saga/core/effects";
import { normalize, schema } from "normalizr";
import {
  type RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { session } from "@web/common/classes/Session";
import { getEventRepository } from "@web/common/repositories/event/event.repository.util";
import {
  type Schema_GridEvent,
  type WithId,
} from "@web/common/types/web.event.types";
import {
  addId,
  assembleGridEvent,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { validateGridEvent } from "@web/common/validators/grid.event.validator";
import { type Payload_ConvertEvent } from "@web/ducks/events/event.types";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { type RootState } from "@web/store";

export function* getEventById(
  _id: string,
): Generator<
  ReturnType<typeof select>,
  Schema_Event | null,
  Schema_Event | null
> {
  const currEvent = yield select((state: RootState) =>
    selectEventById(state, _id),
  );

  return currEvent;
}

export function* _editEvent(
  gridEvent: Schema_GridEvent,
  params: { applyTo?: RecurringEventUpdateScope } = {},
): Generator {
  const sessionExists = yield call(session.doesSessionExist);
  const repository = getEventRepository(sessionExists);
  yield call(
    // @ts-expect-error - redux-saga call with [context, method] tuple - works at runtime, type inference limitation
    [repository, repository.edit],
    gridEvent._id,
    gridEvent as Schema_Event,
    params,
  );
}

export function* insertOptimisticEvent(
  event: WithId<Schema_GridEvent>,
  isSomeday: boolean,
) {
  if (isSomeday) {
    yield put(getSomedayEventsSlice.actions.insert(event._id));
  } else {
    yield put(getWeekEventsSlice.actions.insert(event._id));
    yield put(getDayEventsSlice.actions.insert(event._id));
  }
  yield put(
    eventsEntitiesSlice.actions.insert(
      normalize<Schema_Event>(event, normalizedEventsSchema()).entities.events,
    ),
  );
}

export function* _assembleGridEvent({
  _id,
  ...updatedFields
}: Payload_ConvertEvent["event"]): Generator<
  SelectEffect,
  Schema_GridEvent,
  Schema_Event | null
> {
  const currEvent = yield* getEventById(_id);

  // First merge the current event with updated fields
  const eventWithUpdates = { ...currEvent, ...updatedFields, _id };

  if (!hasEventDates(eventWithUpdates)) {
    throw new Error("Event conversion requires startDate and endDate");
  }

  // Use assembleGridEvent to ensure position field is properly set
  const gridEventWithDefaults = assembleGridEvent(eventWithUpdates);

  // Validate the result
  const gridEvent = validateGridEvent(gridEventWithDefaults);

  return gridEvent;
}

export function* _createOptimisticGridEvent(
  gridEvent: Schema_GridEvent,
  isSomeday = false,
) {
  const optimisticGridEvent = gridEvent._id
    ? (gridEvent as WithId<Schema_GridEvent>)
    : addId(gridEvent);

  yield* insertOptimisticEvent(optimisticGridEvent, isSomeday);

  return optimisticGridEvent;
}

export const normalizedEventsSchema = () =>
  new schema.Entity("events", {}, { idAttribute: "_id" });

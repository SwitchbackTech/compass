import { normalize, schema } from "normalizr";
import { SelectEffect, call, put, select } from "redux-saga/effects";
import {
  Params_Events,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { session } from "@web/common/classes/Session";
import { getEventRepository } from "@web/common/repositories/event/event.repository.util";
import {
  Schema_GridEvent,
  Schema_WebEvent,
  WithId,
} from "@web/common/types/web.event.types";
import { addId, assembleGridEvent } from "@web/common/utils/event/event.util";
import { validateGridEvent } from "@web/common/validators/grid.event.validator";
import { Payload_ConvertEvent } from "@web/ducks/events/event.types";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { RootState } from "@web/store";

export function* getEventById(
  _id: string,
): Generator<
  ReturnType<typeof select>,
  Schema_GridEvent | Schema_WebEvent,
  Schema_GridEvent | Schema_WebEvent
> {
  const currEvent = yield select((state: RootState) =>
    selectEventById(state, _id),
  );

  return currEvent;
}

export function* _editEvent(
  gridEvent: Schema_GridEvent,
  params: { applyTo?: RecurringEventUpdateScope } = {},
) {
  const sessionExists = yield call(session.doesSessionExist);
  const repository = getEventRepository(sessionExists);
  yield call([repository, repository.edit], gridEvent._id, gridEvent, params);
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
  Schema_WebEvent
> {
  const currEvent = yield* getEventById(_id!);

  // First merge the current event with updated fields
  const eventWithUpdates = { ...currEvent, ...updatedFields, _id };

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
  const optimisticGridEvent = addId(gridEvent);

  yield* insertOptimisticEvent(optimisticGridEvent, isSomeday);

  return optimisticGridEvent;
}

export const normalizedEventsSchema = () =>
  new schema.Entity("events", {}, { idAttribute: "_id" });

// Meant to be a hotfix to address issue where backend returns date
// filtered events in an inconsistent way.
// See https://github.com/SwitchbackTech/compass/issues/428
// Should be removed after backend is fixed
export const EventDateUtils = {
  /**
   * Adjusts start and end dates for event queries
   */
  adjustStartEndDate: (payload: Params_Events) => {
    if (payload.someday || payload.dontAdjustDates) return payload;

    // Make start date 1 day before the start date
    const startDate = dayjs(payload.startDate).subtract(1, "day").format();
    const endDate = payload.endDate;

    return {
      ...payload,
      startDate,
      endDate,
    };
  },

  /**
   * Filters events by start and end date range
   * Handles comparison between different date formats (raw dates vs ISO 8601)
   */
  filterEventsByStartEndDate: (
    events: Schema_Event[],
    startDate: string,
    endDate: string,
  ) => {
    const safeEvents = Array.isArray(events) ? events : [];

    return safeEvents.filter((event) => {
      const eventStart = dayjs(event.startDate).utc(true); // use local time - until we use actual dates
      const eventEnd = dayjs(event.endDate).utc(true); // This is exclusive, so the event ends at the very start of the end date

      if (event.isAllDay) {
        // For all-day events with exclusive end dates (e.g., Mon event: start="2025-09-08", end="2025-09-09")
        // Check if the event overlaps with the requested date range
        const rangeStart = dayjs(startDate);
        const rangeEnd = dayjs(endDate);

        // Event overlaps if: event starts before range ends AND event ends after range starts
        const overlaps =
          eventStart.isBefore(rangeEnd) && eventEnd.isAfter(rangeStart);

        return overlaps;
      }

      return (
        eventStart.isSameOrAfter(startDate) && eventEnd.isSameOrBefore(endDate)
      );
    });
  },
} as const;

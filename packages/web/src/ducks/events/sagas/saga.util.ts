import dayjs from "dayjs";
import { schema } from "normalizr";
import { normalize } from "normalizr";
import { put, select } from "redux-saga/effects";
import { Params_Events, Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { RootState } from "@web/store";
import { selectEventById } from "../selectors/event.selectors";
import { eventsEntitiesSlice } from "../slices/event.slice";
import { getSomedayEventsSlice } from "../slices/someday.slice";
import { getWeekEventsSlice } from "../slices/week.slice";

export function* getEventById(_id: string) {
  const currEvent = (yield select((state: RootState) =>
    selectEventById(state, _id),
  )) as Schema_Event;
  return currEvent;
}

export function* insertOptimisticEvent(
  event: Schema_GridEvent,
  isSomeday: boolean,
) {
  if (isSomeday) {
    yield put(getSomedayEventsSlice.actions.insert(event._id));
  } else {
    yield put(getWeekEventsSlice.actions.insert(event._id));
  }
  yield put(
    eventsEntitiesSlice.actions.insert(
      normalize<Schema_Event>(event, normalizedEventsSchema()).entities.events,
    ),
  );
}

export function* replaceOptimisticId(
  optimisticId: string,
  newId: string,
  isSomeday: boolean,
) {
  if (isSomeday) {
    yield put(
      getSomedayEventsSlice.actions.replace({
        oldSomedayId: optimisticId,
        newSomedayId: newId,
      }),
    );
  } else {
    yield put(
      getWeekEventsSlice.actions.replace({
        oldWeekId: optimisticId,
        newWeekId: newId,
      }),
    );
  }

  yield put(
    eventsEntitiesSlice.actions.replace({
      oldEventId: optimisticId,
      newEventId: newId,
    }),
  );
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
    if (payload.someday) return payload;

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
    return events.filter((event) => {
      return (
        dayjs(event.startDate).isSameOrAfter(startDate) &&
        dayjs(event.endDate).isSameOrBefore(endDate)
      );
    });
  },
} as const;

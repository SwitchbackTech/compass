import { schema } from "normalizr";
import { put } from "redux-saga/effects";
import { normalize } from "normalizr";
import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

import { getSomedayEventsSlice } from "../slices/someday.slice";
import { getWeekEventsSlice } from "../slices/week.slice";
import { eventsEntitiesSlice } from "../slices/event.slice";

export function* insertOptimisticEvent(
  event: Schema_GridEvent,
  isSomeday: boolean
) {
  if (isSomeday) {
    yield put(getSomedayEventsSlice.actions.insert(event._id));
  } else {
    yield put(getWeekEventsSlice.actions.insert(event._id));
  }
  yield put(
    eventsEntitiesSlice.actions.insert(
      normalize<Schema_Event>(event, normalizedEventsSchema()).entities.events
    )
  );
}

export function* replaceOptimisticId(
  optimisticId: string,
  newId: string,
  isSomeday: boolean
) {
  if (isSomeday) {
    yield put(
      getSomedayEventsSlice.actions.replace({
        oldSomedayId: optimisticId,
        newSomedayId: newId,
      })
    );
  } else {
    yield put(
      getWeekEventsSlice.actions.replace({
        oldWeekId: optimisticId,
        newWeekId: newId,
      })
    );
  }

  yield put(
    eventsEntitiesSlice.actions.replace({
      oldEventId: optimisticId,
      newEventId: newId,
    })
  );
}

export const normalizedEventsSchema = () =>
  new schema.Entity("events", {}, { idAttribute: "_id" });

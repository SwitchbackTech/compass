import { AxiosResponse } from "axios";
import { normalize } from "normalizr";
import { call, put } from "redux-saga/effects";
import { Schema_Event } from "@core/types/event.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import {
  replaceIdWithOptimisticId,
  handleError,
} from "@web/common/utils/event.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { removeSomedayProperties } from "@web/common/utils/grid.util";

import { Action_Someday_Reorder } from "../slices/someday.slice.types";
import { EventApi } from "../event.api";
import {
  Action_ConvertSomedayEvent,
  Action_DeleteEvent,
  Action_GetEvents,
  Response_GetEventsSuccess,
} from "../event.types";
import { eventsEntitiesSlice } from "../slices/event.slice";
import { getSomedayEventsSlice } from "../slices/someday.slice";
import {
  insertOptimisticEvent,
  replaceOptimisticId,
  normalizedEventsSchema,
  getEventById,
} from "./saga.util";

export function* convertSomedayEvent({ payload }: Action_ConvertSomedayEvent) {
  const { _id, updatedFields } = payload;
  const optimisticId: string | null = null;

  try {
    const gridEvent = yield* _assembleGridEvent(_id, updatedFields);

    //create optimisitcGridEvent
    const optimisticGridEvent = replaceIdWithOptimisticId(gridEvent);
    yield put(getSomedayEventsSlice.actions.remove({ _id }));
    yield* insertOptimisticEvent(optimisticGridEvent, false);

    // create real event
    const response = (yield call(
      EventApi.edit,
      _id,
      gridEvent,
      {}
    )) as AxiosResponse<Schema_Event>;

    const convertedEvent = response.data;

    // cleanup replace ids
    yield* replaceOptimisticId(
      optimisticGridEvent._id,
      convertedEvent._id as string,
      false
    );
  } catch (error) {
    if (optimisticId) {
      yield put(eventsEntitiesSlice.actions.delete({ _id: optimisticId }));
    }
    yield put(getSomedayEventsSlice.actions.insert(_id));
    yield put(getSomedayEventsSlice.actions.error());
    handleError(error as Error);
  }
}

export function* deleteSomedayEvent({ payload }: Action_DeleteEvent) {
  try {
    yield put(eventsEntitiesSlice.actions.delete(payload));

    yield call(EventApi.delete, payload._id);
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

    const normalizedEvents = normalize<Schema_Event>(res.data, [
      normalizedEventsSchema(),
    ]);
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events)
    );

    const data = {
      data: normalizedEvents.result as Payload_NormalizedAsyncAction,
    };
    yield put(getSomedayEventsSlice.actions.success(data));
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

function* _assembleGridEvent(
  _id: string,
  updatedFields: Partial<Schema_Event>
) {
  const currEvent = yield* getEventById(_id);

  const _gridEvent = { ...currEvent, ...updatedFields };
  const gridEvent = removeSomedayProperties(_gridEvent);
  return gridEvent as Schema_GridEvent;
}

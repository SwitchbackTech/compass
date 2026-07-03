import { normalize } from "normalizr";
import {
  type Payload_Order,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import {
  type Schema_GridEvent,
  type Schema_OptimisticEvent,
  type WithId,
} from "@web/common/types/web.event.types";
import {
  addId,
  assembleGridEvent,
  assembleWebEvent,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { validateGridEvent } from "@web/common/validators/grid.event.validator";
import {
  type Payload_ConvertEvent,
  type Payload_DeleteEvent,
  type Payload_EditEvent,
} from "@web/ducks/events/event.types";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  eventsEntitiesSlice,
} from "@web/ducks/events/slices/event.slice";
import { pendingEventsSlice } from "@web/ducks/events/slices/pending.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import {
  doesSessionExist,
  type EventOperationRuntime,
  isOperationCancelled,
  markAnonymousChangeAfterWrite,
  reportOperationError,
  repositoryFor,
} from "./event.operation.runtime";
import { normalizedEventsSchema } from "./event.operation.utils";

const getEventById = (runtime: EventOperationRuntime, eventId: string) =>
  selectEventById(runtime.getState(), eventId) ?? null;

const insertOptimisticEvent = (
  runtime: EventOperationRuntime,
  event: WithId<Schema_GridEvent>,
  isSomeday: boolean,
) => {
  runtime.dispatch(
    eventsEntitiesSlice.actions.insert(
      normalize<Schema_Event>(event, normalizedEventsSchema()).entities.events,
    ),
  );

  if (isSomeday) {
    runtime.dispatch(getSomedayEventsSlice.actions.insert(event._id));
    return;
  }

  runtime.dispatch(getWeekEventsSlice.actions.insert(event._id));
  runtime.dispatch(getDayEventsSlice.actions.insert(event._id));
};

const createOptimisticGridEvent = (
  runtime: EventOperationRuntime,
  gridEvent: Schema_GridEvent,
  isSomeday = false,
) => {
  const event = gridEvent._id
    ? (gridEvent as WithId<Schema_GridEvent>)
    : addId(gridEvent);
  insertOptimisticEvent(runtime, event, isSomeday);
  return event;
};

const assembleGridEventFromState = (
  runtime: EventOperationRuntime,
  { _id, ...updatedFields }: Payload_ConvertEvent["event"],
) => {
  const eventWithUpdates = {
    ...getEventById(runtime, _id),
    ...updatedFields,
    _id,
  };
  if (!hasEventDates(eventWithUpdates)) {
    throw new Error("Event conversion requires startDate and endDate");
  }
  return validateGridEvent(assembleGridEvent(eventWithUpdates));
};

const editInRepository = async (
  runtime: EventOperationRuntime,
  event: Schema_GridEvent,
  params: { applyTo?: RecurringEventUpdateScope } = {},
) => {
  const sessionExists = await doesSessionExist(runtime);
  if (!event._id) throw new Error("Event edit requires an id");
  await repositoryFor(runtime, sessionExists).edit(
    event._id,
    event as Schema_Event,
    params,
  );
  markAnonymousChangeAfterWrite(runtime, sessionExists);
};

export async function createCalendarEvent(
  runtime: EventOperationRuntime,
  payload: Schema_Event,
) {
  const event = createOptimisticGridEvent(
    runtime,
    payload as Schema_GridEvent,
    payload.isSomeday,
  );
  runtime.dispatch(pendingEventsSlice.actions.add(event._id));
  try {
    const sessionExists = await doesSessionExist(runtime);
    await repositoryFor(runtime, sessionExists).create(event as Schema_Event);
    markAnonymousChangeAfterWrite(runtime, sessionExists);
    if (isOperationCancelled(runtime)) return;
    runtime.dispatch(
      eventsEntitiesSlice.actions.edit({ _id: event._id, event }),
    );
    runtime.dispatch(createEventSlice.actions.success());
  } catch (error) {
    if (isOperationCancelled(runtime)) return;
    runtime.dispatch(getWeekEventsSlice.actions.delete({ _id: event._id }));
    runtime.dispatch(getDayEventsSlice.actions.delete({ _id: event._id }));
    runtime.dispatch(eventsEntitiesSlice.actions.delete({ _id: event._id }));
    runtime.dispatch(createEventSlice.actions.error());
    reportOperationError(runtime, error);
  } finally {
    runtime.dispatch(pendingEventsSlice.actions.remove(event._id));
  }
}

export async function editCalendarEvent(
  runtime: EventOperationRuntime,
  payload: Payload_EditEvent,
) {
  const previousEvent = getEventById(runtime, payload._id) as Schema_GridEvent;
  const { _id, applyTo, event, shouldRemove } = payload;
  runtime.dispatch(pendingEventsSlice.actions.add(_id));
  try {
    runtime.dispatch(
      shouldRemove
        ? eventsEntitiesSlice.actions.delete({ _id })
        : eventsEntitiesSlice.actions.edit(payload),
    );
    const sessionExists = await doesSessionExist(runtime);
    await repositoryFor(runtime, sessionExists).edit(
      _id,
      event as Schema_Event,
      { applyTo },
    );
    markAnonymousChangeAfterWrite(runtime, sessionExists);
    if (!isOperationCancelled(runtime)) {
      runtime.dispatch(editEventSlice.actions.success());
    }
  } catch (error) {
    if (isOperationCancelled(runtime)) return;
    runtime.dispatch(
      eventsEntitiesSlice.actions.edit({ ...payload, event: previousEvent }),
    );
    runtime.dispatch(editEventSlice.actions.error());
    reportOperationError(runtime, error);
  } finally {
    runtime.dispatch(pendingEventsSlice.actions.remove(_id));
  }
}

export async function deleteCalendarEvent(
  runtime: EventOperationRuntime,
  payload: Payload_DeleteEvent,
) {
  try {
    runtime.dispatch(getWeekEventsSlice.actions.delete(payload));
    runtime.dispatch(getDayEventsSlice.actions.delete(payload));
    runtime.dispatch(eventsEntitiesSlice.actions.delete(payload));
    const isPending = runtime
      .getState()
      .events.pendingEvents.eventIds.includes(payload._id);
    if (!isPending) {
      const sessionExists = await doesSessionExist(runtime);
      await repositoryFor(runtime, sessionExists).delete(
        payload._id,
        payload.applyTo,
      );
    }
    if (!isOperationCancelled(runtime)) {
      runtime.dispatch(deleteEventSlice.actions.success());
    }
  } catch (error) {
    if (isOperationCancelled(runtime)) return;
    runtime.dispatch(deleteEventSlice.actions.error());
    reportOperationError(runtime, error);
  }
}

export async function convertCalendarToSomedayEvent(
  runtime: EventOperationRuntime,
  payload: Payload_ConvertEvent,
) {
  let optimisticEvent: Schema_OptimisticEvent | null = null;
  try {
    const gridEvent = assembleGridEventFromState(runtime, payload.event);
    const applyTo =
      typeof gridEvent.recurrence?.eventId === "string"
        ? RecurringEventUpdateScope.ALL_EVENTS
        : RecurringEventUpdateScope.THIS_EVENT;
    optimisticEvent = createOptimisticGridEvent(runtime, gridEvent, true);
    runtime.dispatch(pendingEventsSlice.actions.add(optimisticEvent._id));
    await editInRepository(runtime, gridEvent, { applyTo });
    if (isOperationCancelled(runtime)) return;
    runtime.dispatch(
      eventsEntitiesSlice.actions.edit({
        _id: optimisticEvent._id,
        event: optimisticEvent,
      }),
    );
    runtime.dispatch(editEventSlice.actions.success());
  } catch (error) {
    if (isOperationCancelled(runtime)) return;
    if (optimisticEvent) {
      runtime.dispatch(
        eventsEntitiesSlice.actions.delete({ _id: optimisticEvent._id }),
      );
    }
    runtime.dispatch(getWeekEventsSlice.actions.insert(payload.event._id));
    runtime.dispatch(getDayEventsSlice.actions.insert(payload.event._id));
    runtime.dispatch(editEventSlice.actions.error());
    reportOperationError(runtime, error);
  } finally {
    if (optimisticEvent) {
      runtime.dispatch(pendingEventsSlice.actions.remove(optimisticEvent._id));
    }
  }
}

export async function convertSomedayToCalendarEvent(
  runtime: EventOperationRuntime,
  payload: Payload_ConvertEvent,
) {
  let optimisticEvent: Schema_OptimisticEvent | null = null;
  try {
    const gridEvent = assembleGridEventFromState(runtime, payload.event);
    delete gridEvent.recurrence;
    optimisticEvent = createOptimisticGridEvent(runtime, gridEvent);
    runtime.dispatch(pendingEventsSlice.actions.add(optimisticEvent._id));
    await editInRepository(runtime, gridEvent);
    if (isOperationCancelled(runtime)) return;
    runtime.dispatch(
      eventsEntitiesSlice.actions.edit({
        _id: optimisticEvent._id,
        event: optimisticEvent,
      }),
    );
    runtime.dispatch(editEventSlice.actions.success());
  } catch (error) {
    if (isOperationCancelled(runtime)) return;
    if (optimisticEvent) {
      runtime.dispatch(
        eventsEntitiesSlice.actions.delete({ _id: optimisticEvent._id }),
      );
    }
    runtime.dispatch(getSomedayEventsSlice.actions.insert(payload.event._id));
    runtime.dispatch(editEventSlice.actions.error());
    reportOperationError(runtime, error);
  } finally {
    if (optimisticEvent) {
      runtime.dispatch(pendingEventsSlice.actions.remove(optimisticEvent._id));
    }
  }
}

export async function deleteSomedayEvent(
  runtime: EventOperationRuntime,
  payload: Payload_DeleteEvent,
) {
  const event = getEventById(runtime, payload._id);
  if (!event) {
    console.error(`Event with ID ${payload._id} not found for deletion.`);
    return;
  }
  try {
    runtime.dispatch(getSomedayEventsSlice.actions.removeFromList(payload));
    runtime.dispatch(eventsEntitiesSlice.actions.delete(payload));
    const sessionExists = await doesSessionExist(runtime);
    await repositoryFor(runtime, sessionExists).delete(
      payload._id,
      payload.applyTo,
    );
  } catch (error) {
    runtime.dispatch(
      getSomedayEventsSlice.actions.error({
        __context: { reason: (error as Error).message },
      }),
    );
    reportOperationError(runtime, error);
    runtime.dispatch(
      eventsEntitiesSlice.actions.insert({
        [payload._id]: event as Schema_Event,
      }),
    );
    runtime.dispatch(getSomedayEventsSlice.actions.insert(payload._id));
  }
}

export async function reorderSomedayEvents(
  runtime: EventOperationRuntime,
  payload: Payload_Order[],
) {
  try {
    for (const { _id, order } of payload) {
      const event = getEventById(runtime, _id);
      if (event && hasEventDates(event)) {
        runtime.dispatch(
          eventsEntitiesSlice.actions.edit({
            _id,
            event: assembleWebEvent({ ...event, order }),
          }),
        );
      }
    }
    const sessionExists = await doesSessionExist(runtime);
    await repositoryFor(runtime, sessionExists).reorder(payload);
  } catch (error) {
    runtime.dispatch(
      getSomedayEventsSlice.actions.error({
        __context: { reason: (error as Error).message },
      }),
    );
    reportOperationError(runtime, error);
  }
}

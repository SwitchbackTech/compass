import { normalize, schema } from "normalizr";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import {
  type Params_Events,
  type Payload_Order,
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
  type WithId,
} from "@web/common/types/web.event.types";
import {
  addId,
  assembleGridEvent,
  assembleWebEvent,
  handleError,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { setSomedayEventsOrder } from "@web/common/utils/event/someday.event.util";
import { validateGridEvent } from "@web/common/validators/grid.event.validator";
import { eventQueryKeys, type EventRepositorySource } from "@web/ducks/events/event.keys";
import {
  type Entities_Event,
  type Payload_ConvertEvent,
  type Payload_DeleteEvent,
  type Payload_EditEvent,
  type Payload_GetEvents,
  type Payload_GetPaginatedEvents,
  type Response_GetEventsOperation,
  type Response_GetEventsSuccess,
} from "@web/ducks/events/event.types";
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
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { type AppDispatch, type RootState } from "@web/store";
import { type QueryClient } from "@tanstack/react-query";

const normalizedEventsSchema = () =>
  new schema.Entity("events", {}, { idAttribute: "_id" });

const repositorySource = (sessionExists: boolean): EventRepositorySource =>
  sessionExists ? "api" : "indexeddb";

const shouldPromptAnonymousSignUp = (sessionExists: boolean) =>
  !sessionExists && !hasUserEverAuthenticated() && !isGoogleRevoked();

const adjustStartEndDate = (payload: Params_Events) => {
  if (payload.someday || payload.dontAdjustDates) return payload;
  return { ...payload, startDate: dayjs(payload.startDate).subtract(1, "day").format() };
};

const filterEventsByStartEndDate = (events: Schema_Event[], startDate: string, endDate: string) =>
  events.filter((event) => {
    const eventStart = dayjs(event.startDate).utc(true);
    const eventEnd = dayjs(event.endDate).utc(true);
    if (event.isAllDay) return eventStart.isBefore(dayjs(endDate)) && eventEnd.isAfter(dayjs(startDate));
    return eventStart.isSameOrAfter(startDate) && eventEnd.isSameOrBefore(endDate);
  });

type Runtime = { dispatch: AppDispatch; getState: () => RootState; queryClient: QueryClient; signal: AbortSignal };

const throwIfCancelled = (signal: AbortSignal) => {
  if (signal.aborted) throw new DOMException("Operation cancelled", "AbortError");
};

const getEventById = ({ getState }: Runtime, _id: string) => selectEventById(getState(), _id) ?? null;

const insertOptimisticEvent = ({ dispatch }: Runtime, event: WithId<Schema_GridEvent>, isSomeday: boolean) => {
  dispatch(eventsEntitiesSlice.actions.insert(normalize<Schema_Event>(event, normalizedEventsSchema()).entities.events));
  dispatch(isSomeday ? getSomedayEventsSlice.actions.insert(event._id) : getWeekEventsSlice.actions.insert(event._id));
  if (!isSomeday) dispatch(getDayEventsSlice.actions.insert(event._id));
};

const assembleGridEventFromState = (runtime: Runtime, { _id, ...updatedFields }: Payload_ConvertEvent["event"]) => {
  const currEvent = getEventById(runtime, _id);
  const eventWithUpdates = { ...currEvent, ...updatedFields, _id };
  if (!hasEventDates(eventWithUpdates)) throw new Error("Event conversion requires startDate and endDate");
  return validateGridEvent(assembleGridEvent(eventWithUpdates));
};

const createOptimisticGridEvent = (runtime: Runtime, gridEvent: Schema_GridEvent, isSomeday = false) => {
  const optimisticGridEvent = gridEvent._id ? (gridEvent as WithId<Schema_GridEvent>) : addId(gridEvent);
  insertOptimisticEvent(runtime, optimisticGridEvent, isSomeday);
  return optimisticGridEvent;
};

const editInRepository = async (gridEvent: Schema_GridEvent, params: { applyTo?: RecurringEventUpdateScope } = {}) => {
  const sessionExists = await session.doesSessionExist();
  await getEventRepository(sessionExists).edit(gridEvent._id, gridEvent as Schema_Event, params);
  if (shouldPromptAnonymousSignUp(sessionExists)) markAnonymousCalendarChangeForSignUpPrompt();
};

async function getEvents(runtime: Runtime, payload: Params_Events | (Partial<Params_Events> & Response_HttpPaginatedSuccess<Entities_Event>), scope: string): Promise<Response_GetEventsOperation> {
  if (!payload.startDate && !payload.endDate && "data" in payload) {
    runtime.dispatch(eventsEntitiesSlice.actions.insert(payload.data));
    return { data: payload.data } as Response_GetEventsOperation;
  }
  if (!payload.startDate || !payload.endDate) throw new Error("Event query requires startDate and endDate");
  const sessionExists = await session.doesSessionExist();
  const queryPayload = adjustStartEndDate(payload as Params_Events);
  const res = await runtime.queryClient.fetchQuery({
    queryKey: eventQueryKeys.list(repositorySource(sessionExists), scope, queryPayload),
    queryFn: () => getEventRepository(sessionExists).get(queryPayload),
    staleTime: 0,
  }) as Response_GetEventsSuccess;
  throwIfCancelled(runtime.signal);
  if (!res.data || !Array.isArray(res.data)) throw new Error("Invalid response from event repository: data field is missing or not an array");
  const events = filterEventsByStartEndDate(res.data, payload.startDate, payload.endDate);
  const normalizedEvents = normalize<Schema_Event>(events, [normalizedEventsSchema()]);
  runtime.dispatch(eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events));
  return { data: normalizedEvents.result as Payload_NormalizedAsyncAction } as Response_GetEventsOperation;
}

export async function readWeekEvents(runtime: Runtime, payload: Payload_GetEvents) {
  try { runtime.dispatch(getWeekEventsSlice.actions.success(await getEvents(runtime, { ...payload, someday: false }, "week"))); }
  catch (error) {
    if (!runtime.signal.aborted) {
      runtime.dispatch(getWeekEventsSlice.actions.error({}));
      handleError(error as Error);
    }
  }
}
export async function readDayEvents(runtime: Runtime, payload: Payload_GetEvents) {
  try { runtime.dispatch(getDayEventsSlice.actions.success(await getEvents(runtime, { ...payload, dontAdjustDates: true, someday: false }, "day"))); }
  catch (error) {
    if (!runtime.signal.aborted) {
      runtime.dispatch(getDayEventsSlice.actions.error({}));
      handleError(error as Error);
    }
  }
}
export async function readCurrentMonthEvents(runtime: Runtime, payload: Payload_GetPaginatedEvents) {
  try {
    const startDate = dayjs().startOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const endDate = dayjs().endOf("month").format(YEAR_MONTH_DAY_FORMAT);
    runtime.dispatch(getCurrentMonthEventsSlice.actions.success(await getEvents(runtime, { ...payload, startDate, endDate, someday: false }, "month")));
  } catch (error) {
    if (!runtime.signal.aborted) {
      runtime.dispatch(getCurrentMonthEventsSlice.actions.error());
      handleError(error as Error);
    }
  }
}

export async function createCalendarEvent(runtime: Runtime, payload: Schema_GridEvent) {
  const event = createOptimisticGridEvent(runtime, payload, payload.isSomeday);
  runtime.dispatch(pendingEventsSlice.actions.add(event._id));
  try {
    const sessionExists = await session.doesSessionExist();
    await getEventRepository(sessionExists).create(event as Schema_Event);
    if (shouldPromptAnonymousSignUp(sessionExists)) markAnonymousCalendarChangeForSignUpPrompt();
    throwIfCancelled(runtime.signal);
    runtime.dispatch(eventsEntitiesSlice.actions.edit({ _id: event._id, event }));
    runtime.dispatch(createEventSlice.actions.success());
  } catch (error) {
    if (!runtime.signal.aborted) {
      runtime.dispatch(getWeekEventsSlice.actions.delete({ _id: event._id }));
      runtime.dispatch(getDayEventsSlice.actions.delete({ _id: event._id }));
      runtime.dispatch(eventsEntitiesSlice.actions.delete({ _id: event._id }));
      runtime.dispatch(createEventSlice.actions.error());
      handleError(error as Error);
    }
  } finally { runtime.dispatch(pendingEventsSlice.actions.remove(event._id)); }
}

export async function editCalendarEvent(runtime: Runtime, payload: Payload_EditEvent) {
  const previousEvent = getEventById(runtime, payload._id) as Schema_GridEvent;
  const { _id, applyTo, event, shouldRemove } = payload;
  runtime.dispatch(pendingEventsSlice.actions.add(_id));
  try {
    runtime.dispatch(shouldRemove ? eventsEntitiesSlice.actions.delete({ _id }) : eventsEntitiesSlice.actions.edit(payload));
    const sessionExists = await session.doesSessionExist();
    await getEventRepository(sessionExists).edit(_id, event as Schema_Event, { applyTo });
    if (shouldPromptAnonymousSignUp(sessionExists)) markAnonymousCalendarChangeForSignUpPrompt();
    throwIfCancelled(runtime.signal);
    runtime.dispatch(editEventSlice.actions.success());
  } catch (error) {
    if (!runtime.signal.aborted) {
      runtime.dispatch(eventsEntitiesSlice.actions.edit({ ...payload, event: previousEvent }));
      runtime.dispatch(editEventSlice.actions.error());
      handleError(error as Error);
    }
  } finally { runtime.dispatch(pendingEventsSlice.actions.remove(_id)); }
}

export async function deleteCalendarEvent(runtime: Runtime, payload: Payload_DeleteEvent) {
  try {
    runtime.dispatch(getWeekEventsSlice.actions.delete(payload));
    runtime.dispatch(getDayEventsSlice.actions.delete(payload));
    runtime.dispatch(eventsEntitiesSlice.actions.delete(payload));
    const isPending = runtime.getState().events.pendingEvents.eventIds.includes(payload._id);
    if (!isPending) {
      const sessionExists = await session.doesSessionExist();
      await getEventRepository(sessionExists).delete(payload._id, payload.applyTo);
    }
    throwIfCancelled(runtime.signal);
    runtime.dispatch(deleteEventSlice.actions.success());
  } catch (error) {
    if (!runtime.signal.aborted) { runtime.dispatch(deleteEventSlice.actions.error()); handleError(error as Error); }
  } finally { runtime.dispatch(pendingEventsSlice.actions.remove(payload._id)); }
}

export async function convertCalendarToSomedayEvent(runtime: Runtime, payload: Payload_ConvertEvent) {
  let optimisticEvent: Schema_OptimisticEvent | null = null;
  try {
    const gridEvent = assembleGridEventFromState(runtime, payload.event);
    const applyTo = typeof gridEvent.recurrence?.eventId === "string" ? RecurringEventUpdateScope.ALL_EVENTS : RecurringEventUpdateScope.THIS_EVENT;
    optimisticEvent = createOptimisticGridEvent(runtime, gridEvent, true);
    runtime.dispatch(pendingEventsSlice.actions.add(optimisticEvent._id));
    await editInRepository(gridEvent, { applyTo });
    throwIfCancelled(runtime.signal);
    runtime.dispatch(eventsEntitiesSlice.actions.edit({ _id: optimisticEvent._id, event: optimisticEvent }));
    runtime.dispatch(editEventSlice.actions.success());
  } catch (error) {
    if (!runtime.signal.aborted) {
      if (optimisticEvent) runtime.dispatch(eventsEntitiesSlice.actions.delete({ _id: optimisticEvent._id }));
      runtime.dispatch(getWeekEventsSlice.actions.insert(payload.event._id));
      runtime.dispatch(getDayEventsSlice.actions.insert(payload.event._id));
      runtime.dispatch(editEventSlice.actions.error());
      handleError(error as Error);
    }
  } finally { if (optimisticEvent) runtime.dispatch(pendingEventsSlice.actions.remove(optimisticEvent._id)); }
}

export async function convertSomedayToCalendarEvent(runtime: Runtime, payload: Payload_ConvertEvent) {
  let optimisticEvent: Schema_OptimisticEvent | null = null;
  try {
    const gridEvent = assembleGridEventFromState(runtime, payload.event);
    delete gridEvent.recurrence;
    optimisticEvent = createOptimisticGridEvent(runtime, gridEvent);
    runtime.dispatch(pendingEventsSlice.actions.add(optimisticEvent._id));
    await editInRepository(gridEvent);
    throwIfCancelled(runtime.signal);
    runtime.dispatch(eventsEntitiesSlice.actions.edit({ _id: optimisticEvent._id, event: optimisticEvent }));
    runtime.dispatch(editEventSlice.actions.success());
  } catch (error) {
    if (!runtime.signal.aborted) {
      if (optimisticEvent) runtime.dispatch(eventsEntitiesSlice.actions.delete({ _id: optimisticEvent._id }));
      runtime.dispatch(getSomedayEventsSlice.actions.insert(payload.event._id));
      runtime.dispatch(editEventSlice.actions.error());
      handleError(error as Error);
    }
  } finally { if (optimisticEvent) runtime.dispatch(pendingEventsSlice.actions.remove(optimisticEvent._id)); }
}

export async function readSomedayEvents(runtime: Runtime, payload: Payload_GetEvents) {
  try {
    const sessionExists = await session.doesSessionExist();
    const params = { someday: true, startDate: payload.startDate, endDate: payload.endDate };
    const res = await runtime.queryClient.fetchQuery({
      queryKey: eventQueryKeys.list(repositorySource(sessionExists), "someday", params),
      queryFn: () => getEventRepository(sessionExists).get(params),
      staleTime: 0,
    }) as Response_GetEventsSuccess;
    throwIfCancelled(runtime.signal);
    const normalizedEvents = normalize<Schema_Event>(setSomedayEventsOrder(res.data), [normalizedEventsSchema()]);
    runtime.dispatch(eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events));
    runtime.dispatch(getSomedayEventsSlice.actions.success({ data: normalizedEvents.result as Payload_NormalizedAsyncAction, count: res.count, page: res.page, pageSize: res.pageSize, offset: res.offset, startDate: res.startDate, endDate: res.endDate }));
  } catch (error) { if (!runtime.signal.aborted) runtime.dispatch(getSomedayEventsSlice.actions.error({ __context: { reason: (error as Error).message } })); }
}

export async function deleteSomedayEvent(runtime: Runtime, payload: Payload_DeleteEvent) {
  const event = getEventById(runtime, payload._id);
  if (!event) { console.error(`Event with ID ${payload._id} not found for deletion.`); return; }
  try {
    runtime.dispatch({ type: getSomedayEventsSlice.actionNames.removeFromList, payload });
    runtime.dispatch(eventsEntitiesSlice.actions.delete(payload));
    const sessionExists = await session.doesSessionExist();
    await getEventRepository(sessionExists).delete(payload._id, payload.applyTo);
  } catch (error) {
    runtime.dispatch(getSomedayEventsSlice.actions.error({ __context: { reason: (error as Error).message } }));
    handleError(error as Error);
    runtime.dispatch(eventsEntitiesSlice.actions.insert({ [payload._id]: event as Schema_Event }));
    runtime.dispatch(getSomedayEventsSlice.actions.insert(payload._id));
  } finally { runtime.dispatch(pendingEventsSlice.actions.remove(payload._id)); }
}

export async function reorderSomedayEvents(runtime: Runtime, payload: Payload_Order[]) {
  try {
    for (const { _id, order } of payload) {
      const event = getEventById(runtime, _id);
      if (event && hasEventDates(event)) runtime.dispatch(eventsEntitiesSlice.actions.edit({ _id, event: assembleWebEvent({ ...event, order }) }));
    }
    const sessionExists = await session.doesSessionExist();
    await getEventRepository(sessionExists).reorder(payload);
  } catch (error) {
    runtime.dispatch(getSomedayEventsSlice.actions.error({ __context: { reason: (error as Error).message } }));
    handleError(error as Error);
  }
}

import { type QueryClient } from "@tanstack/react-query";
import { normalize } from "normalizr";
import { type AnyAction } from "redux";
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
import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import {
  getEventRepository,
  getEventRepositorySource,
} from "@web/common/repositories/event/event.repository.util";
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
import {
  type Entities_Event,
  type Payload_ConvertEvent,
  type Payload_DeleteEvent,
  type Payload_EditEvent,
  type Payload_GetEvents,
  type Payload_GetPaginatedEvents,
  type Response_GetEventsOperation,
} from "@web/ducks/events/event.types";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
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
import { type RootState } from "@web/store";
import {
  EventDateUtils,
  normalizedEventsSchema,
} from "./event.operation.utils";

type RepositorySource = ReturnType<typeof getEventRepositorySource>;

export interface EventOperationRuntime {
  dispatch: (action: AnyAction) => unknown;
  getState: () => RootState;
  queryClient: QueryClient;
  signal: AbortSignal;
  doesSessionExist?: () => Promise<boolean>;
  getRepository?: (sessionExists: boolean) => EventRepository;
  getRepositorySource?: (sessionExists: boolean) => RepositorySource;
  reportError?: (error: Error) => void;
  hasUserEverAuthenticated?: () => boolean;
  isGoogleRevoked?: () => boolean;
  markAnonymousChange?: () => void;
}

const doesSessionExist = (runtime: EventOperationRuntime) =>
  (runtime.doesSessionExist ?? session.doesSessionExist)();

const repositoryFor = (
  runtime: EventOperationRuntime,
  sessionExists: boolean,
) => (runtime.getRepository ?? getEventRepository)(sessionExists);

const repositorySourceFor = (
  runtime: EventOperationRuntime,
  sessionExists: boolean,
) => (runtime.getRepositorySource ?? getEventRepositorySource)(sessionExists);

const reportError = (runtime: EventOperationRuntime, error: unknown) =>
  (runtime.reportError ?? handleError)(error as Error);

const isCancelled = (runtime: EventOperationRuntime) => runtime.signal.aborted;

const shouldPromptAnonymousSignUp = (
  runtime: EventOperationRuntime,
  sessionExists: boolean,
) =>
  !sessionExists &&
  !(runtime.hasUserEverAuthenticated ?? hasUserEverAuthenticated)() &&
  !(runtime.isGoogleRevoked ?? isGoogleRevoked)();

const markAnonymousChange = (runtime: EventOperationRuntime) =>
  (runtime.markAnonymousChange ?? markAnonymousCalendarChangeForSignUpPrompt)();

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
  if (shouldPromptAnonymousSignUp(runtime, sessionExists)) {
    markAnonymousChange(runtime);
  }
};

type GetEventsPayload =
  | Params_Events
  | (Partial<Params_Events> & Response_HttpPaginatedSuccess<Entities_Event>);

const fetchEvents = async (
  runtime: EventOperationRuntime,
  payload: GetEventsPayload,
  scope: "week" | "month",
) => {
  if (!payload.startDate && !payload.endDate && "data" in payload) {
    runtime.dispatch(eventsEntitiesSlice.actions.insert(payload.data));
    return { data: payload.data } as unknown as Response_GetEventsOperation;
  }
  if (!payload.startDate || !payload.endDate) {
    throw new Error("Event query requires startDate and endDate");
  }

  const sessionExists = await doesSessionExist(runtime);
  const queryPayload = EventDateUtils.adjustStartEndDate(
    payload as Params_Events,
  );
  const response = await runtime.queryClient.fetchQuery({
    queryKey: eventQueryKeys.list({
      source: repositorySourceFor(runtime, sessionExists),
      scope,
      params: queryPayload,
    }),
    queryFn: () => repositoryFor(runtime, sessionExists).get(queryPayload),
    staleTime: 0,
    gcTime: 0,
  });
  if (isCancelled(runtime)) return null;
  if (!Array.isArray(response.data)) {
    throw new Error(
      "Invalid response from event repository: data field is missing or not an array",
    );
  }

  const events = EventDateUtils.filterEventsByStartEndDate(
    response.data,
    payload.startDate,
    payload.endDate,
  );
  const normalized = normalize<Schema_Event>(events, [
    normalizedEventsSchema(),
  ]);
  runtime.dispatch(
    eventsEntitiesSlice.actions.insert(normalized.entities.events),
  );
  return {
    data: normalized.result as Payload_NormalizedAsyncAction,
  } as Response_GetEventsOperation;
};

export async function readWeekEvents(
  runtime: EventOperationRuntime,
  payload: Payload_GetEvents,
) {
  try {
    const result = await fetchEvents(
      runtime,
      { ...payload, someday: false },
      "week",
    );
    if (result) runtime.dispatch(getWeekEventsSlice.actions.success(result));
  } catch (error) {
    if (isCancelled(runtime)) return;
    runtime.dispatch(getWeekEventsSlice.actions.error({}));
    reportError(runtime, error);
  }
}

export async function readCurrentMonthEvents(
  runtime: EventOperationRuntime,
  payload: Payload_GetPaginatedEvents,
) {
  try {
    const result = await fetchEvents(
      runtime,
      {
        ...payload,
        startDate: dayjs().startOf("month").format(YEAR_MONTH_DAY_FORMAT),
        endDate: dayjs().endOf("month").format(YEAR_MONTH_DAY_FORMAT),
        someday: false,
      },
      "month",
    );
    if (result) {
      runtime.dispatch(getCurrentMonthEventsSlice.actions.success(result));
    }
  } catch (error) {
    if (isCancelled(runtime)) return;
    runtime.dispatch(getCurrentMonthEventsSlice.actions.error());
    reportError(runtime, error);
  }
}

export async function readSomedayEvents(
  runtime: EventOperationRuntime,
  payload: Payload_GetEvents,
) {
  try {
    const sessionExists = await doesSessionExist(runtime);
    const params = { ...payload, someday: true };
    const response = await runtime.queryClient.fetchQuery({
      queryKey: eventQueryKeys.list({
        source: repositorySourceFor(runtime, sessionExists),
        scope: "someday",
        params,
      }),
      queryFn: () => repositoryFor(runtime, sessionExists).get(params),
      staleTime: 0,
      gcTime: 0,
    });
    if (isCancelled(runtime)) return;
    if (!Array.isArray(response.data)) {
      throw new Error(
        "Invalid response from event repository: data field is missing or not an array",
      );
    }
    const normalized = normalize<Schema_Event>(
      setSomedayEventsOrder(response.data),
      [normalizedEventsSchema()],
    );
    runtime.dispatch(
      eventsEntitiesSlice.actions.insert(normalized.entities.events),
    );
    runtime.dispatch(
      getSomedayEventsSlice.actions.success({
        ...response,
        data: normalized.result as Payload_NormalizedAsyncAction,
      }),
    );
  } catch (error) {
    if (isCancelled(runtime)) return;
    runtime.dispatch(
      getSomedayEventsSlice.actions.error({
        __context: { reason: (error as Error).message },
      }),
    );
  }
}

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
    if (shouldPromptAnonymousSignUp(runtime, sessionExists)) {
      markAnonymousChange(runtime);
    }
    if (isCancelled(runtime)) return;
    runtime.dispatch(
      eventsEntitiesSlice.actions.edit({ _id: event._id, event }),
    );
    runtime.dispatch(createEventSlice.actions.success());
  } catch (error) {
    if (isCancelled(runtime)) return;
    runtime.dispatch(getWeekEventsSlice.actions.delete({ _id: event._id }));
    runtime.dispatch(getDayEventsSlice.actions.delete({ _id: event._id }));
    runtime.dispatch(eventsEntitiesSlice.actions.delete({ _id: event._id }));
    runtime.dispatch(createEventSlice.actions.error());
    reportError(runtime, error);
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
    if (shouldPromptAnonymousSignUp(runtime, sessionExists)) {
      markAnonymousChange(runtime);
    }
    if (!isCancelled(runtime)) {
      runtime.dispatch(editEventSlice.actions.success());
    }
  } catch (error) {
    if (isCancelled(runtime)) return;
    runtime.dispatch(
      eventsEntitiesSlice.actions.edit({ ...payload, event: previousEvent }),
    );
    runtime.dispatch(editEventSlice.actions.error());
    reportError(runtime, error);
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
    if (!isCancelled(runtime)) {
      runtime.dispatch(deleteEventSlice.actions.success());
    }
  } catch (error) {
    if (isCancelled(runtime)) return;
    runtime.dispatch(deleteEventSlice.actions.error());
    reportError(runtime, error);
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
    if (isCancelled(runtime)) return;
    runtime.dispatch(
      eventsEntitiesSlice.actions.edit({
        _id: optimisticEvent._id,
        event: optimisticEvent,
      }),
    );
    runtime.dispatch(editEventSlice.actions.success());
  } catch (error) {
    if (isCancelled(runtime)) return;
    if (optimisticEvent) {
      runtime.dispatch(
        eventsEntitiesSlice.actions.delete({ _id: optimisticEvent._id }),
      );
    }
    runtime.dispatch(getWeekEventsSlice.actions.insert(payload.event._id));
    runtime.dispatch(getDayEventsSlice.actions.insert(payload.event._id));
    runtime.dispatch(editEventSlice.actions.error());
    reportError(runtime, error);
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
    if (isCancelled(runtime)) return;
    runtime.dispatch(
      eventsEntitiesSlice.actions.edit({
        _id: optimisticEvent._id,
        event: optimisticEvent,
      }),
    );
    runtime.dispatch(editEventSlice.actions.success());
  } catch (error) {
    if (isCancelled(runtime)) return;
    if (optimisticEvent) {
      runtime.dispatch(
        eventsEntitiesSlice.actions.delete({ _id: optimisticEvent._id }),
      );
    }
    runtime.dispatch(getSomedayEventsSlice.actions.insert(payload.event._id));
    runtime.dispatch(editEventSlice.actions.error());
    reportError(runtime, error);
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
    reportError(runtime, error);
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
    reportError(runtime, error);
  }
}

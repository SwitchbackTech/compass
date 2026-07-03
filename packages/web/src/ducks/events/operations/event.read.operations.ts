import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Params_Events } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { type Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { setSomedayEventsOrder } from "@web/common/utils/event/someday.event.util";
import {
  type Entities_Event,
  type Payload_GetEvents,
  type Payload_GetPaginatedEvents,
  type Response_GetEventsOperation,
} from "@web/ducks/events/event.types";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import {
  eventsEntitiesSlice,
  getCurrentMonthEventsSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import {
  doesSessionExist,
  type EventOperationRuntime,
  isOperationCancelled,
  reportOperationError,
  repositoryFor,
  repositorySourceFor,
} from "./event.operation.runtime";
import { EventDateUtils, normalizeEventList } from "./event.operation.utils";

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
  if (isOperationCancelled(runtime)) return null;
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
  const normalized = normalizeEventList(events);
  runtime.dispatch(eventsEntitiesSlice.actions.insert(normalized.entities));
  return {
    data: normalized.ids as Payload_NormalizedAsyncAction,
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
    if (isOperationCancelled(runtime)) return;
    runtime.dispatch(getWeekEventsSlice.actions.error({}));
    reportOperationError(runtime, error);
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
    if (isOperationCancelled(runtime)) return;
    runtime.dispatch(getCurrentMonthEventsSlice.actions.error());
    reportOperationError(runtime, error);
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
    if (isOperationCancelled(runtime)) return;
    if (!Array.isArray(response.data)) {
      throw new Error(
        "Invalid response from event repository: data field is missing or not an array",
      );
    }
    const normalized = normalizeEventList(setSomedayEventsOrder(response.data));
    runtime.dispatch(eventsEntitiesSlice.actions.insert(normalized.entities));
    runtime.dispatch(
      getSomedayEventsSlice.actions.success({
        ...response,
        data: normalized.ids as Payload_NormalizedAsyncAction,
      }),
    );
  } catch (error) {
    if (isOperationCancelled(runtime)) return;
    runtime.dispatch(
      getSomedayEventsSlice.actions.error({
        __context: { reason: (error as Error).message },
      }),
    );
  }
}

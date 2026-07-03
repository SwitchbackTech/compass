import { normalize } from "normalizr";
import { type Schema_Event } from "@core/types/event.types";
import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import { type Action_GetEvents } from "@web/ducks/events/event.types";
import {
  EventDateUtils,
  normalizedEventsSchema,
} from "@web/ducks/events/sagas/saga.util";

type FetchDayEventsPayload = Omit<
  Action_GetEvents["payload"],
  "dontAdjustDates" | "someday"
>;

type FetchDayEventsResult = {
  ids: string[];
  entities: Record<string, Schema_Event>;
};

/**
 * Pure async day-events read. No dispatching.
 * Validates startDate/endDate, calls repository, filters by date range, normalizes.
 * @param payload Request payload (startDate, endDate, __context)
 * @param repository Injected event repository (local or remote)
 * @returns Normalized event ids and entities
 */
export async function fetchDayEvents(
  payload: FetchDayEventsPayload,
  repository: EventRepository,
): Promise<FetchDayEventsResult> {
  if (!payload.startDate || !payload.endDate) {
    throw new Error("Event query requires startDate and endDate");
  }

  const res = await repository.get({
    ...payload,
    someday: false,
    dontAdjustDates: true,
  });

  // Validate response data exists and is an array (before filtering)
  if (!res.data || !Array.isArray(res.data)) {
    throw new Error(
      "Invalid response from event repository: data field is missing or not an array",
    );
  }

  const events = EventDateUtils.filterEventsByStartEndDate(
    res.data,
    payload.startDate,
    payload.endDate,
  );

  const normalizedEvents = normalize<Schema_Event>(events, [
    normalizedEventsSchema(),
  ]);

  return {
    ids: normalizedEvents.result,
    entities: normalizedEvents.entities.events || {},
  };
}

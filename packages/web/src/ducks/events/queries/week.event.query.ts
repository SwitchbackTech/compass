import { type Schema_Event } from "@core/types/event.types";
import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import { type Payload_GetEvents } from "@web/ducks/events/event.types";
import {
  EventDateUtils,
  normalizeEventList,
} from "@web/ducks/events/operations/event.operation.utils";

type FetchWeekEventsPayload = Omit<
  Payload_GetEvents,
  "dontAdjustDates" | "someday"
>;

type FetchWeekEventsResult = {
  ids: string[];
  entities: Record<string, Schema_Event>;
};

/**
 * Pure async week-events read. No dispatching.
 * Adjusts the query start date (backend date-filtering workaround), calls the
 * repository, validates, filters by the requested range, and normalizes.
 * @param payload Request payload (startDate, endDate, __context)
 * @param repository Injected event repository (local or remote)
 * @returns Normalized event ids and entities
 */
export async function fetchWeekEvents(
  payload: FetchWeekEventsPayload,
  repository: EventRepository,
): Promise<FetchWeekEventsResult> {
  if (!payload.startDate || !payload.endDate) {
    throw new Error("Event query requires startDate and endDate");
  }

  const queryPayload = EventDateUtils.adjustStartEndDate({
    ...payload,
    someday: false,
  });

  const res = await repository.get(queryPayload);

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

  return normalizeEventList(events);
}

import { type EventRepository } from "@web/common/repositories/event/event.repository.types";
import { type Payload_GetEvents } from "@web/events/event.types";
import { EventDateUtils, normalizeEventList } from "./event.query.normalize";
import { type NormalizedEventQueryData } from "./event.query.types";

type FetchWeekEventsPayload = Omit<
  Payload_GetEvents,
  "dontAdjustDates" | "someday"
>;

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
): Promise<NormalizedEventQueryData> {
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

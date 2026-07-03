import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import { type Payload_GetEvents } from "@web/ducks/events/event.types";
import { EventDateUtils, normalizeEventList } from "./event.query.normalize";
import { type NormalizedEventQueryData } from "./event.query.types";

type FetchDayEventsPayload = Omit<
  Payload_GetEvents,
  "dontAdjustDates" | "someday"
>;

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
): Promise<NormalizedEventQueryData> {
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

  return normalizeEventList(events);
}

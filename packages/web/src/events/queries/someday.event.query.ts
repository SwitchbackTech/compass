import { type EventRepository } from "@web/common/repositories/event/event.repository.types";
import { setSomedayEventsOrder } from "@web/common/utils/event/someday.event.util";
import { type Payload_GetEvents } from "@web/events/event.types";
import { normalizeEventList } from "./event.query.normalize";
import { type SomedayEventQueryData } from "./event.query.types";

type FetchSomedayEventsPayload = Omit<
  Payload_GetEvents,
  "dontAdjustDates" | "someday"
>;

/**
 * Pure async someday-events read. No dispatching.
 * Calls the repository with `someday: true`, backfills event order, and normalizes.
 * @param payload Request payload (startDate, endDate, __context)
 * @param repository Injected event repository (local or remote)
 * @returns Normalized ids/entities plus the raw pagination envelope
 */
export async function fetchSomedayEvents(
  payload: FetchSomedayEventsPayload,
  repository: EventRepository,
): Promise<SomedayEventQueryData> {
  const response = await repository.get({ ...payload, someday: true });

  if (!response.data || !Array.isArray(response.data)) {
    throw new Error(
      "Invalid response from event repository: data field is missing or not an array",
    );
  }

  const { ids, entities } = normalizeEventList(
    setSomedayEventsOrder(response.data),
  );

  return { ids, entities, pagination: response };
}

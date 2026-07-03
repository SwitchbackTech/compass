import { type Schema_Event } from "@core/types/event.types";
import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { setSomedayEventsOrder } from "@web/common/utils/event/someday.event.util";
import { type Payload_GetEvents } from "@web/ducks/events/event.types";
import { normalizeEventList } from "@web/ducks/events/operations/event.operation.utils";

type FetchSomedayEventsPayload = Omit<
  Payload_GetEvents,
  "dontAdjustDates" | "someday"
>;

type FetchSomedayEventsResult = {
  ids: string[];
  entities: Record<string, Schema_Event>;
  /** Raw paginated response; spread (with `data` overridden) into the slice success. */
  pagination: Response_HttpPaginatedSuccess<Schema_Event[]>;
};

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
): Promise<FetchSomedayEventsResult> {
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

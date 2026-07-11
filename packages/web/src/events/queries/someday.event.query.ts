import { EventListQuerySchema } from "@core/types/event-command.contracts";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { normalizeEventList } from "./event.query.normalize";
import { type NormalizedEventQueryData } from "./event.query.types";

type FetchSomedayEventsPayload = {
  period: "week" | "month";
  anchorDate: string;
};

/**
 * Pure async someday-events read for one (period, anchorDate) bucket. No
 * dispatching. `sortOrder` is a required field on the contract now (no
 * backend backfill needed on the client — the legacy setSomedayEventsOrder
 * shim is gone).
 */
export async function fetchSomedayEvents(
  payload: FetchSomedayEventsPayload,
  repository: EventRepository,
): Promise<NormalizedEventQueryData> {
  const query = EventListQuerySchema.parse({
    kind: "someday",
    period: payload.period,
    anchorDate: payload.anchorDate,
  });

  const events = await repository.list(query);
  return normalizeEventList(events);
}

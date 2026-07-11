import { EventListQuerySchema } from "@core/types/event-command.contracts";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { normalizeEventList } from "./event.query.normalize";
import { type NormalizedEventQueryData } from "./event.query.types";

type FetchDayEventsPayload = { startDate: string; endDate: string };

/**
 * Pure async day-events read. No dispatching. Calls the repository with a
 * "range" EventListQuery and normalizes the result. The backend range read
 * does its own exact [start, end) overlap filtering (event.repository.ts
 * listRange) — no client-side date-window adjustment or re-filter needed.
 */
export async function fetchDayEvents(
  payload: FetchDayEventsPayload,
  repository: EventRepository,
): Promise<NormalizedEventQueryData> {
  if (!payload.startDate || !payload.endDate) {
    throw new Error("Event query requires startDate and endDate");
  }

  const query = EventListQuerySchema.parse({
    kind: "range",
    start: payload.startDate,
    end: payload.endDate,
    priorities: [],
  });

  const events = await repository.list(query);
  return normalizeEventList(events);
}

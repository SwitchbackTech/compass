import { EventListQuerySchema } from "@core/types/event-command.contracts";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { normalizeEventList } from "./event.query.normalize";
import { type NormalizedEventQueryData } from "./event.query.types";

type FetchWeekEventsPayload = { startDate: string; endDate: string };

/**
 * Pure async week-events read. No dispatching. Calls the repository with a
 * "range" EventListQuery and normalizes the result.
 *
 * The legacy "subtract 1 day from start" adjustment (pre-cutover backend date
 * filtering workaround) is gone: the new range read queries Mongo with the
 * caller's exact start/end as a half-open `[start, end)` overlap
 * (packages/backend/src/event/event.repository.ts `listRange`), and derives
 * its own all-day date window from those same instants — so it already
 * returns exactly the events that overlap the requested range, with no
 * client-side adjustment or re-filter required.
 */
export async function fetchWeekEvents(
  payload: FetchWeekEventsPayload,
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

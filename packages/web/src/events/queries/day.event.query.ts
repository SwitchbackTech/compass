import { type CalendarId } from "@core/types/domain-primitives";
import { EventListQuerySchema } from "@core/types/event-command.contracts";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { fetchLocalEventsRange } from "./event.query.local";
import { normalizeEventList } from "./event.query.normalize";
import { type NormalizedEventQueryData } from "./event.query.types";

type FetchEventsRangePayload = {
  startDate: string;
  endDate: string;
  calendarIds?: CalendarId[];
};

/**
 * Pure async range-events read for day and week queries. No dispatching.
 * Calls the repository with a "range" EventListQuery and normalizes the
 * result. The backend range read does its own exact [start, end) overlap
 * filtering (event.repository.ts listRange) — no client-side date-window
 * adjustment or re-filter needed.
 *
 * An empty `calendarIds` array means every calendar is hidden: skip the
 * network and return []. `undefined` keeps the legacy "all calendars" read
 * until visibility is known.
 */
export async function fetchDayEvents(
  payload: FetchEventsRangePayload,
  repository: EventRepository,
  source: EventRepositorySource = "remote",
): Promise<NormalizedEventQueryData> {
  if (!payload.startDate || !payload.endDate) {
    throw new Error("Event query requires startDate and endDate");
  }

  if (source === "local") {
    return fetchLocalEventsRange(payload);
  }

  if (payload.calendarIds !== undefined && payload.calendarIds.length === 0) {
    return normalizeEventList([]);
  }

  const query = EventListQuerySchema.parse({
    kind: "range",
    start: payload.startDate,
    end: payload.endDate,
    ...(payload.calendarIds !== undefined && payload.calendarIds.length > 0
      ? { calendarIds: payload.calendarIds }
      : {}),
  });

  const events = await repository.list(query);
  return normalizeEventList(events);
}

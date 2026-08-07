import { type CalendarId } from "@core/types/domain-primitives";
import { EventListQuerySchema } from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { fetchLocalEventsRange } from "./event.query.local";
import { eventMatchesRange, normalizeEventList } from "./event.query.normalize";
import { type NormalizedEventQueryData } from "./event.query.types";

type FetchEventsRangePayload = {
  startDate: string;
  endDate: string;
  calendarIds?: CalendarId[];
};

/**
 * Sync indexes all-day occurrences at UTC midnight of their date-only start.
 * A local-midnight day/week window west of UTC therefore misses today's
 * all-day startAt and can include tomorrow's. Pad the remote request by one
 * calendar day on each side so those rows are candidates, then keep only
 * events that pass {@link eventMatchesRange} against the original bounds
 * (date-slice overlap for all-day — same rule as IndexedDB / optimistic
 * cache membership). Cache keys stay on the unpadded window.
 */
const paddedRemoteRange = (startDate: string, endDate: string) => ({
  start: toUTCOffset(dayjs(startDate).subtract(1, "day")),
  end: toUTCOffset(dayjs(endDate).add(1, "day")),
});

/**
 * Pure async range-events read for day and week queries. No dispatching.
 * Remote (Sync) reads pad the request window and re-filter with
 * {@link eventMatchesRange}; local IndexedDB already applies that rule.
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

  const { start, end } = paddedRemoteRange(payload.startDate, payload.endDate);
  const query = EventListQuerySchema.parse({
    kind: "range",
    start,
    end,
    ...(payload.calendarIds !== undefined && payload.calendarIds.length > 0
      ? { calendarIds: payload.calendarIds }
      : {}),
  });

  const events = await repository.list(query);
  return normalizeEventList(
    events.filter((event) =>
      eventMatchesRange(event, payload.startDate, payload.endDate),
    ),
  );
}

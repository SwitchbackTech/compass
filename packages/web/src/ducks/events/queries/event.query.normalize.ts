import { type Params_Events, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";

/**
 * Normalize a list of events into the `{ ids, entities }` shape the query caches
 * store, keyed by `_id`. Duplicate ids resolve last-write-wins in `entities`,
 * matching the prior `normalizr` behavior this replaced.
 */
export const normalizeEventList = (events: Schema_Event[]) => ({
  ids: events.map((event) => event._id as string),
  entities: events.reduce<Record<string, Schema_Event>>((entities, event) => {
    entities[event._id as string] = event;
    return entities;
  }, {}),
});

/**
 * Single source of truth for "does this event belong in a [startDate, endDate]
 * range". Shared by the read/normalize filter ({@link EventDateUtils.filterEventsByStartEndDate})
 * and the mutation optimistic-insert logic so reads and optimistic writes agree
 * on membership. Timed events use containment; all-day events use overlap —
 * preserving the pre-migration read semantics exactly.
 */
export const eventMatchesRange = (
  event: Schema_Event,
  startDate?: string,
  endDate?: string,
): boolean => {
  if (!startDate || !endDate || !event.startDate || !event.endDate) {
    return false;
  }
  const eventStart = dayjs(event.startDate).utc(true);
  const eventEnd = dayjs(event.endDate).utc(true);
  if (event.isAllDay) {
    return (
      eventStart.isBefore(dayjs(endDate)) && eventEnd.isAfter(dayjs(startDate))
    );
  }
  return (
    eventStart.isSameOrAfter(startDate) && eventEnd.isSameOrBefore(endDate)
  );
};

export const EventDateUtils = {
  adjustStartEndDate: (payload: Params_Events) => {
    if (payload.someday || payload.dontAdjustDates) return payload;
    return {
      ...payload,
      startDate: dayjs(payload.startDate).subtract(1, "day").format(),
    };
  },
  filterEventsByStartEndDate: (
    events: Schema_Event[],
    startDate: string,
    endDate: string,
  ) => events.filter((event) => eventMatchesRange(event, startDate, endDate)),
} as const;

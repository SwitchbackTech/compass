import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

/**
 * Deck overlap layout for Week timed events.
 *
 * Returns a new array (events are deep-copied, never mutated) where each event's
 * `position.deck` is set when it belongs to a same-day overlap group of >1:
 *   - events are bucketed by their start day — events on different days never
 *     visually overlap, so they never share a deck;
 *   - within a day, transitive overlap groups are built (a.start < b.end &&
 *     a.end > b.start);
 *   - groups of size 1 keep `deck: null`;
 *   - groups of size >1 are ordered background-first (start asc, then end desc)
 *     and each event gets `deck: { order, groupSize }`.
 *
 * Pure + decoupled from Day's equal-split. See deck-overlap-plan.md.
 */
export const applyWeekTimedOverlapLayout = (
  events: Schema_GridEvent[],
): Schema_GridEvent[] => {
  const copied = deepCopyEvents(events);

  for (const dayBucket of bucketByStartDay(copied)) {
    for (const group of groupByOverlap(dayBucket)) {
      if (group.length < 2) continue;

      orderBackgroundFirst(group).forEach((event, index) => {
        event.position.deck = { order: index, groupSize: group.length };
      });
    }
  }

  return copied;
};

const bucketByStartDay = (events: Schema_GridEvent[]): Schema_GridEvent[][] => {
  const buckets = new Map<string, Schema_GridEvent[]>();

  for (const event of events) {
    const key = dayjs(event.startDate).format("YYYY-MM-DD");
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(event);
    } else {
      buckets.set(key, [event]);
    }
  }

  return Array.from(buckets.values());
};

/** Connected components by transitive overlap. */
const groupByOverlap = (events: Schema_GridEvent[]): Schema_GridEvent[][] => {
  const remaining = [...events];
  const groups: Schema_GridEvent[][] = [];

  while (remaining.length) {
    const group = [remaining.shift() as Schema_GridEvent];
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (group.some((g) => overlaps(g, remaining[i]))) {
          group.push(remaining.splice(i, 1)[0]);
          grew = true;
        }
      }
    }
    groups.push(group);
  }

  return groups;
};

const overlaps = (a: Schema_GridEvent, b: Schema_GridEvent): boolean =>
  dayjs(a.startDate).isBefore(dayjs(b.endDate)) &&
  dayjs(a.endDate).isAfter(dayjs(b.startDate));

/** Background-first ordering: earliest start, then longest duration, sits behind. */
const orderBackgroundFirst = (group: Schema_GridEvent[]): Schema_GridEvent[] =>
  [...group].sort((a, b) => {
    const startDiff = dayjs(a.startDate).diff(dayjs(b.startDate));
    if (startDiff !== 0) return startDiff;
    // same start: longer event (later end) sits behind
    return dayjs(b.endDate).diff(dayjs(a.endDate));
  });

const deepCopyEvents = (events: Schema_GridEvent[]): Schema_GridEvent[] =>
  events.map((event) => ({
    ...event,
    position: { ...event.position },
  }));

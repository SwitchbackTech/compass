import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

interface DeckCandidate {
  dayKey: string;
  end: Dayjs;
  event: Schema_GridEvent;
  start: Dayjs;
}

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
  const candidates = copied.map(toDeckCandidate);

  for (const dayBucket of bucketByStartDay(candidates)) {
    for (const group of groupByOverlap(dayBucket)) {
      if (group.length < 2) continue;

      orderBackgroundFirst(group).forEach(({ event }, index) => {
        event.position.deck = { order: index, groupSize: group.length };
      });
    }
  }

  return copied;
};

const toDeckCandidate = (event: Schema_GridEvent): DeckCandidate => {
  const start = dayjs(event.startDate);

  return {
    dayKey: start.format(YEAR_MONTH_DAY_FORMAT),
    end: dayjs(event.endDate),
    event,
    start,
  };
};

const bucketByStartDay = (events: DeckCandidate[]): DeckCandidate[][] => {
  const buckets = new Map<string, DeckCandidate[]>();

  for (const event of events) {
    const bucket = buckets.get(event.dayKey);
    if (bucket) {
      bucket.push(event);
    } else {
      buckets.set(event.dayKey, [event]);
    }
  }

  return Array.from(buckets.values());
};

/** Connected components by transitive overlap. */
const groupByOverlap = (events: DeckCandidate[]): DeckCandidate[][] => {
  const remaining = [...events];
  const groups: DeckCandidate[][] = [];

  while (remaining.length) {
    const group = [remaining.shift() as DeckCandidate];
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

const overlaps = (a: DeckCandidate, b: DeckCandidate): boolean =>
  a.start.isBefore(b.end) && a.end.isAfter(b.start);

/** Background-first ordering: earliest start, then longest duration, sits behind. */
const orderBackgroundFirst = (group: DeckCandidate[]): DeckCandidate[] =>
  [...group].sort((a, b) => {
    const startDiff = a.start.diff(b.start);
    if (startDiff !== 0) return startDiff;
    // same start: longer event (later end) sits behind
    return b.end.diff(a.end);
  });

const deepCopyEvents = (events: Schema_GridEvent[]): Schema_GridEvent[] =>
  events.map((event) => ({
    ...event,
    position: { ...event.position, deck: null },
  }));

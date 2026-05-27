import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type EventPosition } from "@web/common/utils/position/position.util";
import {
  DECK_INDENT,
  DECK_MIN_WIDTH,
  DECK_RIGHT_RESERVE,
} from "@web/views/Week/layout.constants";

export interface WeekTimedDeckLayout {
  groupSize: number;
  order: number;
}

export interface WeekTimedEventLayoutItem {
  deckLayout: WeekTimedDeckLayout | null;
  event: Schema_GridEvent;
}

interface DeckCandidate {
  dayKey: string;
  end: Dayjs;
  item: WeekTimedEventLayoutItem;
  start: Dayjs;
}

export const createWeekTimedEventLayout = (
  events: Schema_GridEvent[],
): WeekTimedEventLayoutItem[] => {
  const items: WeekTimedEventLayoutItem[] = events.map((event) => ({
    deckLayout: null,
    event,
  }));
  const candidates = items.map(toDeckCandidate);

  for (const dayBucket of bucketByStartDay(candidates)) {
    for (const group of groupByOverlap(dayBucket)) {
      if (group.length < 2) continue;

      orderBackgroundFirst(group).forEach(({ item }, index) => {
        item.deckLayout = { order: index, groupSize: group.length };
      });
    }
  }

  return items;
};

export const applyWeekTimedDeckPosition = (
  position: EventPosition,
  deckLayout: WeekTimedDeckLayout,
): EventPosition => {
  const indent = getDeckIndent(position.width, deckLayout.groupSize);
  const maxIndent = (deckLayout.groupSize - 1) * indent;
  const fanned = position.width - DECK_RIGHT_RESERVE - maxIndent;
  const maxWidthWithinColumn = Math.max(0, position.width - maxIndent);
  const width = Math.min(
    Math.max(DECK_MIN_WIDTH, fanned),
    maxWidthWithinColumn,
  );

  return {
    ...position,
    left: position.left + deckLayout.order * indent,
    width,
    zIndex: deckLayout.order + 1,
  };
};

const getDeckIndent = (width: number, groupSize: number) => {
  if (groupSize < 2) return 0;

  const minimumVisibleWidth =
    width >= DECK_MIN_WIDTH ? DECK_MIN_WIDTH : width / groupSize;
  const maxIndentForMinWidth = Math.max(0, width - minimumVisibleWidth);

  return Math.min(DECK_INDENT, maxIndentForMinWidth / (groupSize - 1));
};

const toDeckCandidate = (item: WeekTimedEventLayoutItem): DeckCandidate => {
  const start = dayjs(item.event.startDate);

  return {
    dayKey: start.format(YEAR_MONTH_DAY_FORMAT),
    end: dayjs(item.event.endDate),
    item,
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

const orderBackgroundFirst = (group: DeckCandidate[]): DeckCandidate[] =>
  [...group].sort((a, b) => {
    const startDiff = a.start.diff(b.start);
    if (startDiff !== 0) return startDiff;
    return b.end.diff(a.end);
  });

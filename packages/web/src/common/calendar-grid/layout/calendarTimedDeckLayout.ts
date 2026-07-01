import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  CALENDAR_DECK_INDENT,
  CALENDAR_DECK_MIN_WIDTH,
  CALENDAR_DECK_RIGHT_RESERVE,
  CALENDAR_TIMED_EVENT_FAN_GUTTER,
  CALENDAR_TIMED_EVENT_FAN_INDENT,
  CALENDAR_TIMED_EVENT_MIN_WIDTH,
  CALENDAR_TIMED_EVENT_WIDTH_RATIO,
} from "@web/common/calendar-grid/calendarGrid.constants";
import { type CalendarEventPosition } from "@web/common/calendar-grid/types/calendarGrid.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export interface CalendarTimedDeckLayout {
  groupSize: number;
  order: number;
}

export interface CalendarTimedEventLayoutItem {
  deckLayout: CalendarTimedDeckLayout | null;
  event: Schema_GridEvent;
}

interface DeckCandidate {
  dayKey: string;
  end: Dayjs;
  item: CalendarTimedEventLayoutItem;
  start: Dayjs;
}

export const createCalendarTimedEventLayout = (
  events: Schema_GridEvent[],
): CalendarTimedEventLayoutItem[] => {
  const items: CalendarTimedEventLayoutItem[] = events.map((event) => ({
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

export const applyCalendarTimedEventDisplayPosition = (
  position: CalendarEventPosition,
  deckLayout: CalendarTimedDeckLayout | null,
): CalendarEventPosition => {
  const cardWidth = getCalendarTimedEventCardWidth(position.width);

  if (!deckLayout) {
    return { ...position, width: cardWidth };
  }

  const deckWidth = getCalendarTimedEventDeckWidth({
    availableWidth: position.width,
    cardWidth,
    groupSize: deckLayout.groupSize,
  });

  return applyCalendarTimedDeckPositionWithIndent(
    { ...position, width: deckWidth },
    deckLayout,
    CALENDAR_TIMED_EVENT_FAN_INDENT,
  );
};

export const applyCalendarTimedDeckPosition = (
  position: CalendarEventPosition,
  deckLayout: CalendarTimedDeckLayout,
): CalendarEventPosition =>
  applyCalendarTimedDeckPositionWithIndent(
    position,
    deckLayout,
    CALENDAR_DECK_INDENT,
  );

const applyCalendarTimedDeckPositionWithIndent = (
  position: CalendarEventPosition,
  deckLayout: CalendarTimedDeckLayout,
  indentMax: number,
): CalendarEventPosition => {
  const indent = getDeckIndent(position.width, deckLayout.groupSize, indentMax);
  const maxIndent = (deckLayout.groupSize - 1) * indent;
  const fanned = position.width - CALENDAR_DECK_RIGHT_RESERVE - maxIndent;
  const maxWidthWithinColumn = Math.max(0, position.width - maxIndent);
  const width = Math.min(
    Math.max(CALENDAR_DECK_MIN_WIDTH, fanned),
    maxWidthWithinColumn,
  );

  return {
    ...position,
    left: position.left + deckLayout.order * indent,
    width,
    zIndex: deckLayout.order + 1,
  };
};

const getCalendarTimedEventCardWidth = (availableWidth: number) => {
  const fluidWidth = availableWidth * CALENDAR_TIMED_EVENT_WIDTH_RATIO;
  // Scale proportionally with the column (no upper cap) so cards track the
  // grid width when the day-view column is resized. The floor keeps cards
  // readable; the final min prevents overflowing a narrow week column.
  const boundedWidth = Math.max(CALENDAR_TIMED_EVENT_MIN_WIDTH, fluidWidth);

  return Math.min(availableWidth, boundedWidth);
};

const getCalendarTimedEventDeckWidth = ({
  availableWidth,
  cardWidth,
  groupSize,
}: {
  availableWidth: number;
  cardWidth: number;
  groupSize: number;
}) => {
  const extraIndent = Math.max(
    0,
    CALENDAR_TIMED_EVENT_FAN_INDENT - CALENDAR_DECK_INDENT,
  );
  const spreadWidth = cardWidth + (groupSize - 1) * extraIndent;
  const gutteredWidth = Math.max(
    cardWidth,
    availableWidth - CALENDAR_TIMED_EVENT_FAN_GUTTER,
  );

  return Math.min(availableWidth, spreadWidth, gutteredWidth);
};

const getDeckIndent = (
  width: number,
  groupSize: number,
  indentMax: number = CALENDAR_DECK_INDENT,
) => {
  if (groupSize < 2) return 0;

  const minimumVisibleWidth =
    width >= CALENDAR_DECK_MIN_WIDTH
      ? CALENDAR_DECK_MIN_WIDTH
      : width / groupSize;
  const maxIndentForMinWidth = Math.max(0, width - minimumVisibleWidth);

  return Math.min(indentMax, maxIndentForMinWidth / (groupSize - 1));
};

const toDeckCandidate = (item: CalendarTimedEventLayoutItem): DeckCandidate => {
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

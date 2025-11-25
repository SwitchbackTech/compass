import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

export const adjustOverlappingEvents = (
  events: Schema_GridEvent[],
): Schema_GridEvent[] => {
  const adjustedEvents = deepCopyEvents(events);
  adjustedEvents.sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));

  const processedEvents = new Set<string>();

  for (const event of adjustedEvents) {
    if (processedEvents.has(event._id!)) continue;

    const overlappingEventsSet = findOverlaps(event, adjustedEvents);
    const eventGroup = Array.from(overlappingEventsSet);

    if (eventGroup.length > 1) {
      adjustEventGroup(eventGroup);
      eventGroup.forEach((e) => processedEvents.add(e._id!));
    }
  }
  return adjustedEvents;
};

const findOverlaps = (
  event: Schema_GridEvent,
  adjustedEvents: Schema_GridEvent[],
  accumulatedEvents = new Set<Schema_GridEvent>(),
): Set<Schema_GridEvent> => {
  const directOverlaps = adjustedEvents.filter(
    (otherEvent) =>
      otherEvent !== event &&
      !accumulatedEvents.has(otherEvent) &&
      dayjs(event.startDate).isBefore(dayjs(otherEvent.endDate)) &&
      dayjs(event.endDate).isAfter(dayjs(otherEvent.startDate)),
  );

  directOverlaps.forEach((overlappingEvent) => {
    accumulatedEvents.add(overlappingEvent);
    findOverlaps(overlappingEvent, adjustedEvents, accumulatedEvents);
  });

  return accumulatedEvents;
};

const adjustEventGroup = (eventGroup: Schema_GridEvent[]) => {
  eventGroup.sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));

  if (eventsHaveExactSameTimes(eventGroup)) {
    sortEventsByTitle(eventGroup);
  }

  // horizontal order based on title length,
  // used to determine z-index and width multiplier
  const titleLength = eventGroup.reduce(
    (sum, e) => sum + (e.title?.length ?? 0),
    0,
  );

  [...eventGroup]
    .sort((a, b) => (b.title?.length ?? 0) - (a.title?.length ?? 0))
    .forEach((event, index) => {
      event.position.isOverlapping = true;
      event.position.totalEventsInGroup = eventGroup.length;
      event.position.horizontalOrder = index + 1;
      event.position.widthMultiplier = roundToTwoDecimals(
        Math.max(0.25, (event.title?.length ?? 1) / titleLength),
      );
    });
};

export const getOverlappingStyles = (
  event: Schema_GridEvent,
  gridWidth: number,
  textWidth: number,
) => {
  const isOverlapping = event.position.isOverlapping;
  const totalEventsInGroup = event.position.totalEventsInGroup ?? 1;
  const order = event.position.horizontalOrder ?? 0;
  const index = (totalEventsInGroup ?? 1) - order;
  const themeSpacing = parseInt(theme.spacing.s);
  const spacing = themeSpacing * 3; // Reduce spacing for higher index
  const maxWidthDivisor = isOverlapping ? 2 : 1;
  const maxContainerWidth = gridWidth - themeSpacing;
  const maxWidth = maxContainerWidth / maxWidthDivisor;
  const borderRingSpace = 2;
  const spread = maxContainerWidth / totalEventsInGroup;
  const _textWidth = textWidth + borderRingSpace;
  const width = Math.min(maxWidth, Math.max(spread, _textWidth + spacing));
  const offset = spread * (index + 1);

  return {
    left: `${maxContainerWidth - Math.max(width, offset) - borderRingSpace}px`,
    width: `${width}px`,
    zIndex: order,
  };
};

const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const eventsHaveExactSameTimes = (eventGroup: Schema_GridEvent[]): boolean => {
  return eventGroup.every(
    (event) =>
      dayjs(event.startDate).isSame(eventGroup[0].startDate) &&
      dayjs(event.endDate).isSame(eventGroup[0].endDate),
  );
};

const sortEventsByTitle = (eventGroup: Schema_GridEvent[]) => {
  eventGroup.sort((a, b) =>
    a.title && b.title ? a.title.localeCompare(b.title) : 0,
  );
};

const deepCopyEvents = (events: Schema_GridEvent[]): Schema_GridEvent[] => {
  return events.map((event) => ({
    ...event,
    position: { ...event.position },
  }));
};

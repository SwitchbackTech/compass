import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { type GridEvent } from "@web/common/types/web.event.types";

export const adjustOverlappingEvents = (events: GridEvent[]): GridEvent[] => {
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
  event: GridEvent,
  adjustedEvents: GridEvent[],
  accumulatedEvents = new Set<GridEvent>(),
): Set<GridEvent> => {
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

const adjustEventGroup = (eventGroup: GridEvent[]) => {
  eventGroup.sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));

  if (eventsHaveExactSameTimes(eventGroup)) {
    sortEventsByTitle(eventGroup);
  }

  const multiplier = roundToTwoDecimals(1 / eventGroup.length);

  [...eventGroup]
    .sort((a, b) => (b.title?.length ?? 0) - (a.title?.length ?? 0))
    .forEach((event, index) => {
      event.position.isOverlapping = true;
      event.position.totalEventsInGroup = eventGroup.length;
      event.position.widthMultiplier *= multiplier; // @deprecated
      event.position.horizontalOrder = index + 1;
    });
};

export const getOverlappingStyles = (
  event: GridEvent,
  gridWidth: number,
  textWidth: number,
) => {
  const isOverlapping = event.position.isOverlapping;
  const totalEventsInGroup = event.position.totalEventsInGroup ?? 1;
  const order = event.position.horizontalOrder ?? 0;
  const index = (totalEventsInGroup ?? 1) - order;
  const themeSpacing = parseInt(theme.spacing.s, 10);
  const spacing = themeSpacing * 3;
  const maxWidthDivisor = isOverlapping ? 2 : 1;
  const maxContainerWidth = gridWidth - themeSpacing;
  const maxWidth = maxContainerWidth / maxWidthDivisor;
  const borderRingSpace = 2;
  const spread = maxContainerWidth / totalEventsInGroup;
  const _textWidth = textWidth + borderRingSpace;
  const width = Math.min(maxWidth, Math.max(spread, _textWidth + spacing));
  const offset = spread * (index + 1);

  return {
    left: `${maxContainerWidth - Math.max(width, offset) + borderRingSpace}px`,
    width: `${width - borderRingSpace}px`,
    zIndex: order,
  };
};

const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const eventsHaveExactSameTimes = (eventGroup: GridEvent[]): boolean => {
  return eventGroup.every(
    (event) =>
      dayjs(event.startDate).isSame(eventGroup[0].startDate) &&
      dayjs(event.endDate).isSame(eventGroup[0].endDate),
  );
};

const sortEventsByTitle = (eventGroup: GridEvent[]) => {
  eventGroup.sort((a, b) =>
    a.title && b.title ? a.title.localeCompare(b.title) : 0,
  );
};

const deepCopyEvents = (events: GridEvent[]): GridEvent[] => {
  return events.map((event) => ({
    ...event,
    position: { ...event.position },
  }));
};

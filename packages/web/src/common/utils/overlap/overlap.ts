import dayjs from "dayjs";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

export const adjustOverlappingEvents = (
  events: Schema_GridEvent[],
): Schema_GridEvent[] => {
  const adjustedEvents = deepCopyEvents(events);
  adjustedEvents.sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));

  const processedEvents = new Set<string>();

  for (const event of adjustedEvents) {
    if (processedEvents.has(event._id)) continue;

    const overlappingEventsSet = findOverlaps(event, adjustedEvents);
    const eventGroup = Array.from(overlappingEventsSet);

    if (eventGroup.length > 1) {
      adjustEventGroup(eventGroup);
      eventGroup.forEach((e) => processedEvents.add(e._id));
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

  const multiplier = roundToTwoDecimals(1 / eventGroup.length);

  eventGroup.forEach((event, index) => {
    event.position.isOverlapping = true;
    event.position.widthMultiplier *= multiplier;
    event.position.horizontalOrder = index + 1;
  });
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

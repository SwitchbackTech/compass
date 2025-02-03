import dayjs from "dayjs";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

export const adjustOverlappingEvents = (
  events: Schema_GridEvent[]
): Schema_GridEvent[] => {
  // Deep copy events
  let adjustedEvents: Schema_GridEvent[] = events.map((event) => ({
    ...event,
    position: { ...event.position },
  }));

  // Sort by start time first
  adjustedEvents.sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));

  const processedEvents = new Set<string>();

  for (let i = 0; i < adjustedEvents.length; i++) {
    const targetEvent = adjustedEvents[i];

    // Skip if already processed
    if (processedEvents.has(targetEvent._id)) {
      continue;
    }

    const overlappingEventsSet = findOverlaps(
      targetEvent,
      adjustedEvents,
      new Set([targetEvent])
    );
    const eventGroup = Array.from(overlappingEventsSet);

    if (eventGroup.length > 1) {
      // If there are any overlaps, calculate width multiplier
      let multiplier = 1 / eventGroup.length;
      // Round to 2 decimal places (in case we have way too many decimal places from the division)
      multiplier = Math.round(multiplier * 100) / 100;

      // Set adjustments for all events in the group
      eventGroup.forEach((event, i) => {
        event.position.isOverlapping = true;
        event.position.widthMultiplier *= multiplier;
        event.position.horizontalOrder = i + 1;
        processedEvents.add(event._id);
      });

      // If exact start and end times match, sort alphabetically by title
      if (
        eventGroup.every(
          (event) =>
            dayjs(event.startDate).isSame(targetEvent.startDate) &&
            dayjs(event.endDate).isSame(targetEvent.endDate)
        )
      ) {
        eventGroup.sort((a, b) => {
          if (!a.title || !b.title) {
            return 0;
          }

          return a.title.localeCompare(b.title);
        });
      }
    }
  }

  return adjustedEvents;
};

export const findOverlaps = (
  event: Schema_GridEvent,
  adjustedEvents: Schema_GridEvent[],
  accumulatedEvents = new Set<Schema_GridEvent>()
): Set<Schema_GridEvent> => {
  const directOverlaps = adjustedEvents.filter(
    (otherEvent) =>
      otherEvent !== event && // Skip itself
      !accumulatedEvents.has(otherEvent) && // Skip if already processed
      dayjs(event.startDate).isBefore(dayjs(otherEvent.endDate)) &&
      dayjs(event.endDate).isAfter(dayjs(otherEvent.startDate))
  );

  directOverlaps.forEach((event) => {
    accumulatedEvents.add(event);
    // Recursively find overlaps for each overlapping event
    findOverlaps(event, adjustedEvents, accumulatedEvents);
  });

  return accumulatedEvents;
};

export const findOverlappingEvents = (events: Schema_GridEvent[]) => {
  const overlappingEventsMap: { [key: string]: Schema_GridEvent[] } = {};

  events.forEach((event, i) => {
    const overlappingEvents = findOverlaps(event, events);
    if (overlappingEvents.size > 1) {
      const key = event._id || `no-id-${i}`;
      overlappingEventsMap[key] = Array.from(overlappingEvents);
    }
  });

  return overlappingEventsMap;
};

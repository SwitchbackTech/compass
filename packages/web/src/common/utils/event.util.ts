import dayjs, { Dayjs } from "dayjs";
import { v4 as uuidv4 } from "uuid";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { DropResult } from "@hello-pangea/dnd";
import { YEAR_MONTH_DAY_COMPACT_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Origin, Priorities } from "@core/constants/core.constants";
import { validateEvent } from "@core/validators/event.validator";
import { Status } from "@core/errors/status.codes";

import {
  Schema_GridEvent,
  Schema_OptimisticEvent,
  Schema_SomedayEventsColumn,
} from "../types/web.event.types";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_OPTIMISTIC_PREFIX,
  SCHEMA_GRID_EVENT_DEFAULT_POSITION,
} from "../constants/web.constants";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export const categorizeSomedayEvents = (
  somedayEvents: Schema_SomedayEventsColumn["events"],
  dates: { startDate: Dayjs; endDate: Dayjs }
): Schema_SomedayEventsColumn => {
  const sortedEvents = Object.values(somedayEvents).sort(
    (a, b) => a.order - b.order
  );
  const weekIds: string[] = [];
  const monthIds: string[] = [];

  sortedEvents.forEach((e) => {
    const eventStart = dayjs(e.startDate);
    const isWeek = eventStart.isBetween(
      dates.startDate,
      dates.endDate,
      null,
      "[]"
    );
    if (isWeek) {
      weekIds.push(e._id);
      return;
    }

    const monthStartDate = dates.startDate.startOf("month");
    const monthEndDate = dates.startDate.endOf("month");
    const isMonthButNotWeek =
      !isWeek && eventStart.isBetween(monthStartDate, monthEndDate, null, "[]");

    if (isMonthButNotWeek) {
      monthIds.push(e._id);
    }
  });

  const sortedData: Schema_SomedayEventsColumn = {
    columns: {
      [`${COLUMN_WEEK}`]: {
        id: `${COLUMN_WEEK}`,
        eventIds: weekIds,
      },
      [`${COLUMN_MONTH}`]: {
        id: `${COLUMN_MONTH}`,
        eventIds: monthIds,
      },
    },
    columnOrder: [COLUMN_WEEK, COLUMN_MONTH],
    events: somedayEvents,
  };
  return sortedData;
};

export const getCategory = (event: Schema_Event) => {
  if (event?.isAllDay) {
    return Categories_Event.ALLDAY;
  }
  if (event?.isSomeday) {
    return Categories_Event.SOMEDAY_WEEK;
  }
  return Categories_Event.TIMED;
};

export const assembleGridEvent = (
  event: Partial<Schema_GridEvent>
): Schema_GridEvent => {
  return {
    _id: event._id || "",
    title: event.title || "",
    description: event.description || "",
    startDate: event.startDate || "",
    endDate: event.endDate || "",
    user: event.user || "",
    isAllDay: event.isAllDay || false,
    isSomeday: event.isSomeday || false,
    origin: event.origin || Origin.COMPASS,
    priority: event.priority || Priorities.UNASSIGNED,
    position: event.position || SCHEMA_GRID_EVENT_DEFAULT_POSITION,
  };
};

export const getDefaultEvent = (
  draftType: Categories_Event,
  startDate?: string,
  endDate?: string
): Schema_GridEvent | null => {
  const defaultEvent = assembleGridEvent({
    priority: Priorities.UNASSIGNED,
    position: {
      isOverlapping: false,
      widthMultiplier: 1,
      horizontalOrder: 1,
    },
  });

  const defaultSomeday = {
    ...defaultEvent,
    isAllDay: false,
    isSomeday: true,
    origin: Origin.COMPASS,
  };

  switch (draftType) {
    case Categories_Event.ALLDAY:
      return {
        ...defaultEvent,
        isAllDay: true,
        isSomeday: false,
        startDate,
        endDate: startDate,
      };
    case Categories_Event.SOMEDAY_WEEK || Categories_Event.SOMEDAY_MONTH:
      return defaultSomeday;
    case Categories_Event.TIMED: {
      return {
        ...defaultEvent,
        isAllDay: false,
        isSomeday: false,
        startDate,
        endDate,
      };
    }
    default:
      return null;
  }
};

export const getMonthListLabel = (start: Dayjs) => {
  return start.format("MMMM");
};

export const getWeekDayLabel = (day: Dayjs | Date) => {
  if (day instanceof Date) {
    return dayjs(day).format(YEAR_MONTH_DAY_COMPACT_FORMAT);
  }
  return day.format(YEAR_MONTH_DAY_COMPACT_FORMAT);
};

export const handleError = (error: Error) => {
  const codesToIgnore = [Status.NOT_FOUND, Status.GONE, Status.UNAUTHORIZED];
  const code = parseInt(error.message.slice(-3));
  if (codesToIgnore.includes(code)) {
    // api interceptor will handle these
    return;
  }

  if (code === Status.INTERNAL_SERVER) {
    alert("Something went wrong behind the scenes. Please try again later.");
    window.location.reload();
  }

  alert(error);
};

export const isEventInRange = (
  eventDate: { start: string; end: string },
  rangeDate: { start: string; end: string }
) => {
  const isStartDateInRange = dayjs(eventDate.start).isBetween(
    rangeDate.start,
    rangeDate.end,
    "day",
    "[]"
  );
  const isEndDateInRange = dayjs(eventDate.end).isBetween(
    rangeDate.start,
    rangeDate.end,
    "day",
    "[]"
  );

  return isStartDateInRange || isEndDateInRange;
};

export const isOptimisticEvent = (event: Schema_GridEvent) => {
  const isOptimistic = event._id?.startsWith(ID_OPTIMISTIC_PREFIX) || false;
  return isOptimistic;
};

export const prepEvtAfterDraftDrop = (
  category: Categories_Event,
  dropItem: DropResult,
  dates: { startDate: string; endDate: string }
) => {
  const baseEvent = getDefaultEvent(category);

  const event: Schema_Event = {
    ...baseEvent,
    description: dropItem.description,
    endDate: dates.endDate,
    origin: Origin.COMPASS,
    priority: dropItem.priority,
    title: dropItem.title,
    startDate: dates.startDate,
  };

  return event;
};

export const prepEvtBeforeSubmit = (
  draft: Schema_GridEvent,
  userId: string
) => {
  const _event = {
    ...draft,
    origin: Origin.COMPASS,
    user: userId,
  };

  const event = validateEvent(_event);
  return event;
};

export const replaceIdWithOptimisticId = (
  event: Schema_Event
): Schema_OptimisticEvent => {
  const _event: Schema_OptimisticEvent = {
    ...event,
    _id: `${ID_OPTIMISTIC_PREFIX}-${uuidv4()}`,
  };

  return _event;
};

export const adjustOverlappingEvents = (
  events: Schema_GridEvent[]
): Schema_GridEvent[] => {
  // Deep copy events
  let adjustedEvents = events.map((event) => ({
    ...event,
    position: { ...event.position },
  }));

  // Sort by start time first
  adjustedEvents.sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));

  const processedEvents = new Set<string>();

  // Helper function to find all overlapping events recursively
  const findAllOverlappingEvents = (
    baseEvent: Schema_GridEvent,
    accumulatedEvents = new Set<Schema_GridEvent>()
  ): Set<Schema_GridEvent> => {
    const directOverlaps = adjustedEvents.filter(
      (otherEvent) =>
        otherEvent !== baseEvent && // Skip itself
        !accumulatedEvents.has(otherEvent) && // Skip if already processed
        dayjs(baseEvent.startDate).isBefore(dayjs(otherEvent.endDate)) &&
        dayjs(baseEvent.endDate).isAfter(dayjs(otherEvent.startDate))
    );

    directOverlaps.forEach((event) => {
      accumulatedEvents.add(event);
      // Recursively find overlaps for each overlapping event
      findAllOverlappingEvents(event, accumulatedEvents);
    });

    return accumulatedEvents;
  };

  for (let i = 0; i < adjustedEvents.length; i++) {
    const targetEvent = adjustedEvents[i];

    // Skip if already processed
    if (processedEvents.has(targetEvent._id)) {
      continue;
    }

    // Find all overlapping events recursively
    const overlappingEventsSet = findAllOverlappingEvents(
      targetEvent,
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

export const adjustEvents = (
  events: Schema_GridEvent[]
): Schema_GridEvent[] => {
  const adjustedEvents = adjustOverlappingEvents(events);

  return adjustedEvents;
};

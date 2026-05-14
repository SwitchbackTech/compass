import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { isBase, isInstance } from "@core/util/event/event.util";
import {
  type EventReadShapeInput,
  type EventReadShapeResult,
} from "./event-read.types";

export const shapeEventRead = ({
  window,
  events,
  baseEventsById,
  repairSomedayOrder = true,
}: EventReadShapeInput): EventReadShapeResult => {
  const data = events
    .filter((event) => matchesMode(event, window.mode))
    .filter((event) => isVisibleInWindow(event, window))
    .map((event) => shapeRecurringEvent(event, baseEventsById))
    .filter((event): event is Schema_Event => Boolean(event));

  const shapedData =
    window.mode === "someday" && repairSomedayOrder
      ? repairSomedayOrders(data)
      : data;

  return {
    data: shapedData,
    count: shapedData.length,
    startDate: window.startDate,
    endDate: window.endDate,
  };
};

const matchesMode = (
  event: Schema_Event,
  mode: EventReadShapeInput["window"]["mode"],
) => {
  if (mode === "someday") {
    return event.isSomeday === true;
  }

  return event.isSomeday !== true;
};

const isVisibleInWindow = (
  event: Schema_Event,
  window: EventReadShapeInput["window"],
) => {
  if (!event.startDate || !event.endDate) {
    return false;
  }

  if (isBase(event)) {
    return false;
  }

  const eventWithDates = {
    startDate: event.startDate,
    endDate: event.endDate,
  };

  if (event.isAllDay) {
    return allDayEventOverlapsWindow(eventWithDates, window);
  }

  return timedEventIsInsideWindow(eventWithDates, window);
};

const allDayEventOverlapsWindow = (
  event: Required<Pick<Schema_Event, "startDate" | "endDate">>,
  window: EventReadShapeInput["window"],
) => {
  const eventStart = dayjs(event.startDate).utc(true);
  const eventEnd = dayjs(event.endDate).utc(true);
  const rangeStart = dayjs(window.startDate);
  const rangeEnd = dayjs(window.endDate);

  return eventStart.isBefore(rangeEnd) && eventEnd.isAfter(rangeStart);
};

const timedEventIsInsideWindow = (
  event: Required<Pick<Schema_Event, "startDate" | "endDate">>,
  window: EventReadShapeInput["window"],
) => {
  const eventStart = dayjs(event.startDate).utc(true);
  const eventEnd = dayjs(event.endDate).utc(true);

  return (
    eventStart.isSameOrAfter(window.startDate) &&
    eventEnd.isSameOrBefore(window.endDate)
  );
};

const shapeRecurringEvent = (
  event: Schema_Event,
  baseEventsById: EventReadShapeInput["baseEventsById"],
) => {
  if (!isInstance(event)) {
    return event;
  }

  if (!baseEventsById) {
    return event;
  }

  const baseEventId = event.recurrence?.eventId;
  const baseEvent =
    typeof baseEventId === "string" ? baseEventsById[baseEventId] : undefined;

  if (!baseEvent) {
    return undefined;
  }

  return {
    ...event,
    recurrence: {
      eventId: baseEvent._id,
      rule: baseEvent.recurrence?.rule,
    },
  };
};

const repairSomedayOrders = (events: Schema_Event[]) => {
  if (events.length === 0) return events;

  const existingOrders = events
    .map((event) => event.order)
    .filter(
      (order): order is number =>
        typeof order === "number" && !Number.isNaN(order),
    )
    .sort((a, b) => a - b);

  if (existingOrders.length === 0) {
    return events.map((event, index) => ({ ...event, order: index }));
  }

  const highestOrder = existingOrders[existingOrders.length - 1] ?? 0;
  let nextNewOrder = highestOrder + 1;

  return events.map((event) => {
    if (typeof event.order === "number" && !Number.isNaN(event.order)) {
      return event;
    }

    const order = nextNewOrder;
    nextNewOrder += 1;

    return { ...event, order };
  });
};

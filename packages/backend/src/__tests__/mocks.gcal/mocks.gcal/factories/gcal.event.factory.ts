import dayjs from "dayjs";
import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import { formatAs } from "@core/util/date/date.util";
import { mockRecurringGcalInstances } from "../../factories/gcal.event.factory";

/**
 * Creates a cancelled instance of a recurring event,
 * matching the payload from gcal when a recurring event is cancelled
 * @param baseEvent - The base event to create the cancelled instance for
 * @returns A cancelled instance of the base event
 */
export const mockCancelledInstance = (
  baseEvent: gSchema$EventBase,
  instanceStart: string,
): gSchema$EventInstance => {
  const instanceStartRfc5545 = formatAs("RFC5545", instanceStart);
  if (!instanceStartRfc5545) {
    throw new Error("Invalid instance start date");
  }
  return {
    id: `${baseEvent.id}_${instanceStartRfc5545}`,
    kind: "calendar#event",
    status: "cancelled",
    summary: `Cancelled Instance - ${baseEvent.summary}`,
    recurringEventId: baseEvent.id,
    originalStartTime: {
      dateTime: baseEvent.start?.dateTime,
      timeZone: baseEvent.start?.timeZone,
    },
  };
};

export const mockTimedEvent = (): gSchema$Event => {
  const timeZone = faker.location.timeZone();
  const start = dayjs.tz(faker.date.future(), timeZone);
  const end = start.add(1, "hour");

  return {
    id: faker.string.nanoid(),
    summary: faker.lorem.sentence(),
    start: { dateTime: start.toRFC3339OffsetString(), timeZone },
    end: { dateTime: end.toRFC3339OffsetString(), timeZone },
    status: "confirmed",
  };
};

export const mockTimedRecurrence = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$EventBase => {
  const timed = mockTimedEvent();
  const base = {
    ...timed,
    recurrence: ["RRULE:FREQ=WEEKLY"],
    ...overrides,
  };
  return base as gSchema$EventBase;
};

export const mockAlldayGcalEvent = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$Event => {
  const core = _mockGcalCoreEvent();
  const timeZone = faker.location.timeZone();
  const start = dayjs.tz(faker.date.future(), timeZone);
  const end = start.add(1, "hour");

  return {
    ...core,
    start: {
      date: start.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
      timeZone,
    },
    end: {
      date: end.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
      timeZone,
    },
    ...overrides,
  };
};

export const mockTimedGcalEvent = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$Event => {
  const core = _mockGcalCoreEvent();
  // Dynamically generate timezone-aware times
  const tz = faker.location.timeZone();
  const start = dayjs.tz(faker.date.future(), tz);
  const end = start.add(1, "hour");

  const timedEvent = {
    ...core,
    start: {
      dateTime: start.toRFC3339OffsetString(),
      timeZone: tz,
    },
    end: {
      dateTime: end.toRFC3339OffsetString(),
      timeZone: tz,
    },
  };
  return {
    ...timedEvent,
    ...overrides,
  };
};

export const mockGcalEvents = (repeatIntervalInDays = 7) => {
  const timedStandalone = mockTimedGcalEvent({
    summary: "STANDALONE: Regular Event",
  });
  const allDayStandalone = mockAlldayGcalEvent({
    summary: "STANDALONE:All Day Event",
  });
  const baseTimedRecurrence = mockTimedRecurrence({
    summary: "Recurring Event",
    recurrence: ["RRULE:FREQ=DAILY;INTERVAL=7"],
  });

  const timedInstances = mockRecurringGcalInstances(
    baseTimedRecurrence,
    3,
    repeatIntervalInDays,
  );

  const cancelledTimedEvent = mockCancelledInstance(
    baseTimedRecurrence,
    "2025-04-10T12:30:00Z",
  );

  const allGcalEvents = [
    timedStandalone,
    allDayStandalone,
    cancelledTimedEvent,
    baseTimedRecurrence,
    ...timedInstances,
  ];

  return {
    gcalEvents: {
      all: allGcalEvents,
      regular: timedStandalone,
      cancelled: cancelledTimedEvent,
      recurring: baseTimedRecurrence,
      instances: timedInstances,
    },
    totals: {
      total: allGcalEvents.length,
      cancelled: 1,
      recurring: 1 + timedInstances.length,
    },
  };
};

/**
 * Creates a minimal gcal event payload with properties that
 * are the same regardless of whether its an all-day or timed
 * event
 * @returns gcal event with core propertie
 */
const _mockGcalCoreEvent = (): gSchema$Event => {
  const id = faker.string.uuid();
  return {
    id,
    summary: faker.lorem.sentence(),
    status: "confirmed",
    htmlLink: `https://www.google.com/calendar/event?eid=${id}`,
    created: faker.date.past().toISOString(),
    updated: faker.date.recent().toISOString(),
    iCalUID: faker.string.uuid() + "@google.com",
    sequence: 0,
    extendedProperties: {
      private: {
        origin: Origin.GOOGLE_IMPORT,
        priority: Priorities.UNASSIGNED,
      },
    },
    reminders: {
      useDefault: true,
    },
    eventType: "default",
  };
};

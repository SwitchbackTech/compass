import dayjs from "dayjs";
import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import { formatAs } from "@core/util/date/date.util";

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

export const mockTimedEvent = (): gSchema$Event => ({
  id: faker.string.nanoid(),
  summary: faker.lorem.sentence(),
  start: { dateTime: faker.date.future().toISOString() },
  end: { dateTime: faker.date.future().toISOString() },
  status: "confirmed",
});

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

export const mockRecurringInstances = (
  event: gSchema$Event,
  count: number,
  repeatIntervalInDays: number,
): gSchema$EventInstance[] => {
  if (!event.start?.dateTime || !event.end?.dateTime) {
    throw new Error("Event must have start and end dates");
  }

  const startDateTime = event.start.dateTime;
  const startTimeZone = event.start.timeZone;
  const endTimeZone = event.end.timeZone;

  const baseDate = new Date(startDateTime);

  return Array.from({ length: count }, (_, index) => {
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() + index * repeatIntervalInDays);
    const startDateIso = startDate.toISOString();
    const startDateTime = formatAs("RFC3339_OFFSET", startDateIso);

    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hr after start
    endDate.setDate(endDate.getDate() + index * repeatIntervalInDays);
    const endDateIso = endDate.toISOString();
    const endDateTime = formatAs("RFC3339_OFFSET", endDateIso);

    const startRfc5545 = formatAs("RFC5545", startDateIso);
    const id = `${event.id}_${startRfc5545}`; // matches gcal id format

    const instance = {
      ...event,
      id,
      summary: `${event.summary}: Instance ${index}`,
      recurringEventId: event.id as string,
      start: {
        dateTime: startDateTime,
        timeZone: startTimeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: endTimeZone,
      },
    };
    delete instance.recurrence;

    return instance;
  });
};

export const mockAlldayGcalEvent = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$Event => {
  const core = _mockGcalCoreEvent();
  const _start = faker.date.future();
  const start = dayjs(_start).format("YYYY-MM-DD"); // matches gcal format for all day events
  const end = dayjs(_start).add(1, "day").format("YYYY-MM-DD");
  return {
    ...core,
    start: {
      date: start,
      timeZone: "America/Chicago",
    },
    end: {
      date: end,
      timeZone: "America/Chicago",
    },
    ...overrides,
  };
};

export const mockTimedGcalEvent = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$Event => {
  const core = _mockGcalCoreEvent();
  const start = faker.date.future();
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  const timedEvent = {
    ...core,
    start: {
      dateTime: start.toISOString(),
      timeZone: "America/Chicago",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "America/Chicago",
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

  const timedInstances = mockRecurringInstances(
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

import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import { convertToRfc5545 } from "@core/util/date.utils";

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
  const instanceStartRfc5545 = convertToRfc5545(instanceStart);
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

export const mockRegularEvent = (): gSchema$Event => ({
  id: faker.string.nanoid(),
  summary: faker.lorem.sentence(),
  start: { dateTime: faker.date.future().toISOString() },
  end: { dateTime: faker.date.future().toISOString() },
  status: "confirmed",
});

export const mockRecurringEvent = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$EventBase => {
  const regular = mockRegularEvent();
  const base = {
    ...regular,
    recurrence: ["RRULE:FREQ=WEEKLY"],
    ...overrides,
  };
  return base as gSchema$EventBase;
};

const mockRecurringInstances = (
  event: gSchema$Event,
  count: number,
  repeatIntervalInDays: number,
): gSchema$EventInstance[] => {
  if (!event.start?.dateTime || !event.end?.dateTime) {
    throw new Error("Event must have start and end dates");
  }

  const startDateTime = event.start.dateTime;
  const endDateTime = event.end.dateTime;
  const startTimeZone = event.start.timeZone;
  const endTimeZone = event.end.timeZone;

  const baseDate = new Date(startDateTime);

  return Array.from({ length: count }, (_, index) => {
    const instanceDate = new Date(baseDate);
    instanceDate.setDate(instanceDate.getDate() + index * repeatIntervalInDays);

    const endDate = new Date(endDateTime);
    endDate.setDate(endDate.getDate() + index * repeatIntervalInDays);

    const instanceStart = convertToRfc5545(instanceDate.toISOString());

    const instance = {
      ...event,
      id: `${event.id}_${instanceStart}`, // matches gcal id format
      summary: `${event.summary}: Instance ${index}`,
      recurringEventId: event.id as string,
      start: {
        dateTime: instanceDate.toISOString(),
        timeZone: startTimeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: endTimeZone,
      },
    };
    delete instance.recurrence;

    return instance;
  });
};

export const mockGcalEvent = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$Event => {
  const id = faker.string.uuid();
  const start = faker.date.future();
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  return {
    id,
    summary: faker.lorem.sentence(),
    status: "confirmed",
    htmlLink: `https://www.google.com/calendar/event?eid=${id}`,
    created: faker.date.past().toISOString(),
    updated: faker.date.recent().toISOString(),
    start: {
      dateTime: start.toISOString(),
      timeZone: "America/Chicago",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "America/Chicago",
    },
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
    ...overrides,
  };
};

export const mockGcalEvents = (repeatIntervalInDays = 7) => {
  const regularEvent = mockGcalEvent({ summary: "Regular Event" });
  const baseRecurrence = mockRecurringEvent({
    summary: "Recurring Event",
    recurrence: ["RRULE:FREQ=DAILY;INTERVAL=7"],
  });

  const recurringInstances = mockRecurringInstances(
    baseRecurrence,
    3,
    repeatIntervalInDays,
  );

  const cancelledEvent = mockCancelledInstance(
    baseRecurrence,
    "2025-04-10T12:30:00Z",
  );

  const allGcalEvents = [
    regularEvent,
    cancelledEvent,
    baseRecurrence,
    ...recurringInstances,
  ];

  return {
    gcalEvents: {
      all: allGcalEvents,
      regular: regularEvent,
      cancelled: cancelledEvent,
      recurring: baseRecurrence,
      instances: recurringInstances,
    },
    totals: {
      total: allGcalEvents.length,
      cancelled: 1,
      recurring: 1 + recurringInstances.length,
    },
  };
};

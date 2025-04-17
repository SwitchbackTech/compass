import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  WithGcalId,
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";

export const mockRegularEvent = (): WithGcalId<gSchema$Event> => ({
  id: faker.string.nanoid(),
  summary: faker.lorem.sentence(),
  start: { dateTime: faker.date.future().toISOString() },
  end: { dateTime: faker.date.future().toISOString() },
  status: "confirmed",
});

export const mockRecurringEvent = (
  overrides: Partial<gSchema$EventBase> = {},
): gSchema$EventBase => ({
  ...mockRegularEvent(),
  recurrence: ["RRULE:FREQ=WEEKLY"],
  ...overrides,
});

const mockRecurringInstances = (
  event: gSchema$EventBase,
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

    return {
      ...event,
      id: `${event.id}-${index}`,
      recurringEventId: event.id,
      start: {
        dateTime: instanceDate.toISOString(),
        timeZone: startTimeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: endTimeZone,
      },
    };
  });
};

export const mockRegularGcalEvent = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$Event => {
  const id = faker.string.uuid();
  return {
    id,
    summary: faker.lorem.sentence(),
    status: "confirmed",
    htmlLink: `https://www.google.com/calendar/event?eid=${id}`,
    created: faker.date.past().toISOString(),
    updated: faker.date.recent().toISOString(),
    start: {
      dateTime: faker.date.future().toISOString(),
      timeZone: "America/Chicago",
    },
    end: {
      dateTime: faker.date.future().toISOString(),
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
  const regularEvent = mockRegularGcalEvent();
  const cancelledEvent = mockRegularGcalEvent({ status: "cancelled" });
  const recurringEvent = mockRecurringEvent({
    recurrence: ["RRULE:FREQ=DAILY;INTERVAL=7"],
  });

  const recurringInstances = mockRecurringInstances(
    recurringEvent,
    3,
    repeatIntervalInDays,
  );

  const gcalEvents = [
    regularEvent,
    cancelledEvent,
    recurringEvent,
    ...recurringInstances,
  ];

  return {
    gcalEvents,
    totals: {
      total: gcalEvents.length,
      cancelled: 1,
      recurring: 1 + recurringInstances.length,
    },
  };
};

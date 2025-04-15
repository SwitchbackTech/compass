import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import { gSchema$Event } from "@core/types/gcal";

export const mockRegularEvent = (): gSchema$Event => ({
  id: faker.string.uuid(),
  summary: faker.lorem.sentence(),
  start: { dateTime: faker.date.future().toISOString() },
  end: { dateTime: faker.date.future().toISOString() },
  status: "confirmed",
});

export const mockRecurringEvent = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$Event => ({
  ...mockRegularEvent(),
  recurrence: ["RRULE:FREQ=WEEKLY"],
  ...overrides,
});

const mockRecurringInstances = (
  event: gSchema$Event,
  count: number,
  repeatIntervalInDays: number,
): gSchema$Event[] => {
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

    const instance = {
      ...event,
      id: `${event.id}-${index}`,
      summary: `${event.summary}: Instance ${index}`,
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
    delete instance.recurrence;

    return instance;
  });
};

export const mockGcalEvent = (
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
  const regularEvent = mockGcalEvent({ summary: "Regular Event" });
  const cancelledEvent = mockGcalEvent({ status: "cancelled" });
  const recurringEvent = mockGcalEvent({
    summary: "Recurring Event",
    recurrence: ["RRULE:FREQ=DAILY;INTERVAL=7"],
  });

  const recurringInstances = mockRecurringInstances(
    recurringEvent,
    3,
    repeatIntervalInDays,
  );

  const allGcalEvents = [
    regularEvent,
    cancelledEvent,
    recurringEvent,
    ...recurringInstances,
  ];

  return {
    gcalEvents: {
      all: allGcalEvents,
      regular: regularEvent,
      cancelled: cancelledEvent,
      recurring: recurringEvent,
      instances: recurringInstances,
    },
    totals: {
      total: allGcalEvents.length,
      cancelled: 1,
      recurring: 1 + recurringInstances.length,
    },
  };
};

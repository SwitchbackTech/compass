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

export const mockRecurringBaseEvent = (
  overrides: Partial<gSchema$EventBase> = {},
): gSchema$EventBase => ({
  ...mockRegularEvent(),
  recurrence: ["RRULE:FREQ=WEEKLY"],
  ...overrides,
});

export const mockRecurringInstances = (
  base: gSchema$EventBase,
  count: number,
  repeatIntervalInDays: number,
): gSchema$EventInstance[] => {
  if (!base.start?.dateTime || !base.end?.dateTime) {
    throw new Error("Event must have start and end dates");
  }

  const startDateTime = base.start.dateTime;
  const endDateTime = base.end.dateTime;
  const startTimeZone = base.start.timeZone;
  const endTimeZone = base.end.timeZone;

  const baseDate = new Date(startDateTime);

  return Array.from({ length: count }, (_, index) => {
    const instanceDate = new Date(baseDate);
    // For index 0, keep the same date as base
    // For subsequent instances, add the interval
    if (index > 0) {
      instanceDate.setDate(
        instanceDate.getDate() + index * repeatIntervalInDays,
      );
    }

    const endDate = new Date(endDateTime);
    if (index > 0) {
      endDate.setDate(endDate.getDate() + index * repeatIntervalInDays);
    }

    const instance = {
      ...base,
      id: `${base.id}-instance-${index + 1}`,
      summary: `${base.summary}-instance-${index + 1}`,
      recurringEventId: base.id,
      start: {
        dateTime: instanceDate.toISOString(),
        timeZone: startTimeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: endTimeZone,
      },
    };
    // remove properties that are reserved for the base event
    const { recurrence, ...instanceWithoutRecurrence } = instance;
    return instanceWithoutRecurrence;
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

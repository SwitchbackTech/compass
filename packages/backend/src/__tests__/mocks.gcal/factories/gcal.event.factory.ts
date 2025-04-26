import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  WithGcalId,
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import { formatAs } from "@core/util/date/date.util";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Generates a random base32 hex string according to gcal id's requirement:
 * https://developers.google.com/workspace/calendar/api/v3/reference/events
 * @param length - The length of the string to generate
 * @returns A random base32 hex string
 */
export const generateGcalId = (length: number = 16) => {
  const allowed = "abcdefghijklmnopqrstuvwxyz".slice(0, 22) + "0123456789"; // a-v and 0-9
  let id = "";
  for (let i = 0; i < length; i++) {
    id += allowed.charAt(Math.floor(Math.random() * allowed.length));
  }
  return id;
};

/**
 * Returns a base event and its instances
 * @param count - The number of instances to create
 * @param repeatIntervalInDays - The interval between instances
 * @returns An array containing the base event and its instances
 */
export const mockRecurringGcalEvents = (
  baseOverrides: Partial<gSchema$EventBase> = {},
  count: number,
  repeatIntervalInDays: number,
): { base: gSchema$EventBase; instances: gSchema$EventInstance[] } => {
  const base = mockRecurringGcalBaseEvent(baseOverrides);
  const instances = mockRecurringGcalInstances(
    base,
    count,
    repeatIntervalInDays,
  );
  return { base, instances };
};

export const mockRecurringGcalBaseEvent = (
  overrides: Partial<gSchema$EventBase> = {},
): gSchema$EventBase => ({
  ...mockRegularGcalEvent(),
  recurrence: ["RRULE:FREQ=WEEKLY"],
  ...overrides,
});

export const mockRecurringGcalInstances = (
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

    const startAsRfc5545 = formatAs("RFC5545", instanceDate.toISOString());
    const instance = {
      ...base,
      id: `${base.id}_${startAsRfc5545}`,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { recurrence, ...instanceWithoutRecurrence } = instance;
    return instanceWithoutRecurrence;
  });
};

export const mockRegularGcalEvent = (
  overrides: Partial<WithGcalId<gSchema$Event>> = {},
): WithGcalId<gSchema$Event> => {
  const id = generateGcalId();
  const tz = faker.location.timeZone();
  // Generate times dynamically but in the right tz
  const start = dayjs.tz(faker.date.future(), tz);
  const end = start.add(1, "hour");
  const created = dayjs.tz(faker.date.past(), tz);
  const updated = dayjs.tz(faker.date.recent(), tz);
  return {
    id,
    summary: faker.lorem.sentence(),
    status: "confirmed",
    htmlLink: `https://www.google.com/calendar/event?eid=${id}`,
    created: created.toISOString(),
    updated: updated.toISOString(),
    start: {
      dateTime: start.toISOString(),
      timeZone: tz,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: tz,
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

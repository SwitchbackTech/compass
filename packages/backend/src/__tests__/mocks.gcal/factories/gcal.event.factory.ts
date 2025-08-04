import omit from "lodash.omit";
import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  WithGcalId,
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
import {
  getGcalEventDateFormat,
  parseGCalEventDate,
} from "@core/util/event/gcal.event.util";

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

  const baseStartDate = parseGCalEventDate(base.start);
  const baseEndDate = parseGCalEventDate(base.end);
  const isAllDay = "date" in base.start;
  const dateKey = isAllDay ? "date" : "dateTime";
  const dateFormat = getGcalEventDateFormat(base.start);

  return Array.from({ length: count }, (_, index) => {
    const offSetDays = index * repeatIntervalInDays;
    // For index 0, keep the same date as base
    // For subsequent instances, add the interval
    const startDate = baseStartDate.add(offSetDays, "days");
    const endDate = baseEndDate.add(offSetDays, "days");

    const instance = {
      ...base,
      id: `${base.id}_${startDate.toRFC5545String()}`,
      summary: `${base.summary} instance ${index + 1}`,
      recurringEventId: base.id,
      start: {
        [dateKey]: startDate?.format(dateFormat),
        timeZone: base.start?.timeZone ?? dayjs.tz.guess(),
      },
      end: {
        [dateKey]: endDate.format(dateFormat),
        timeZone: base.end?.timeZone ?? dayjs.tz.guess(),
      },
    };

    // remove properties that are reserved for the base event
    return omit(instance, ["recurrence"]);
  });
};

export const mockRegularGcalEvent = (
  overrides: Partial<WithGcalId<gSchema$Event>> = {},
): WithGcalId<gSchema$Event> => {
  const id = generateGcalId();
  const tz = faker.location.timeZone();
  // Dynamically generate timezone-aware times
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
      dateTime: start.toRFC3339OffsetString(),
      timeZone: tz,
    },
    end: {
      dateTime: end.toRFC3339OffsetString(),
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

import { Options, RRule } from "rrule";
import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  WithGcalId,
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import { formatAs } from "@core/util/date/date.util";
import dayjs from "@core/util/date/dayjs";
import { GcalEventRRule } from "@backend/event/classes/gcal.event.rrule";

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

const mockGcalCoreEvent = (): WithGcalId<
  Pick<
    gSchema$Event,
    | "id"
    | "summary"
    | "status"
    | "htmlLink"
    | "created"
    | "updated"
    | "iCalUID"
    | "sequence"
    | "extendedProperties"
    | "reminders"
    | "eventType"
  >
> => {
  const id = generateGcalId();

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

/**
 * Returns a base event and its instances
 * @param count - The number of instances to create
 * @param repeatIntervalInDays - The interval between instances
 * @returns An array containing the base event and its instances
 */
export const mockRecurringGcalEvents = (
  baseOverrides: Partial<Omit<gSchema$EventBase, "recurrence">> = {},
  isAllDay = false,
  options: Partial<Options> = {},
): { base: gSchema$EventBase; instances: gSchema$EventInstance[] } => {
  const base = mockRecurringGcalBaseEvent(baseOverrides, isAllDay, options);
  const instances = mockRecurringGcalInstances(base);

  return { base, instances };
};

export const mockRecurringGcalBaseEvent = (
  overrides: Partial<Omit<gSchema$EventBase, "recurrence">> = {},
  isAllDay = false,
  rruleOptions: Partial<Options> = {},
): gSchema$EventBase => {
  const event = mockRegularGcalEvent(overrides, isAllDay);
  const ruleOptions = { count: 3, ...rruleOptions };
  const rrule = new GcalEventRRule(event as gSchema$EventBase, ruleOptions);

  return { ...event, recurrence: rrule.toRecurrence() };
};

export const mockRecurringGcalInstances = (
  base: gSchema$EventBase,
): gSchema$EventInstance[] => {
  const rrule = new GcalEventRRule(base);

  return rrule.instances();
};

export const mockRegularGcalEvent = (
  overrides: Partial<WithGcalId<Omit<gSchema$Event, "recurrence">>> = {},
  isAllDay = false,
): WithGcalId<gSchema$Event> => {
  const tz = faker.location.timeZone();
  // Dynamically generate timezone-aware times
  const start = dayjs.tz(faker.date.future(), tz);
  const end = start.add(1, "hour");
  const core = mockGcalCoreEvent();
  const dateKey = isAllDay ? "date" : "dateTime";
  const { YEAR_MONTH_DAY_FORMAT, RFC3339_OFFSET } = dayjs.DateFormat;
  const dateFormat = isAllDay ? YEAR_MONTH_DAY_FORMAT : RFC3339_OFFSET;

  return {
    ...core,
    start: {
      [dateKey]: start.format(dateFormat),
      timeZone: tz,
    },
    end: {
      [dateKey]: end.format(dateFormat),
      timeZone: tz,
    },
    extendedProperties: {
      private: {
        origin: Origin.GOOGLE_IMPORT,
        priority: Priorities.UNASSIGNED,
      },
    },
    ...overrides,
  };
};

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

export const mockGcalEvents = (
  isAllDayBase = false,
  recurrenceOptions: Partial<Options> = {},
) => {
  const timedStandalone = mockRegularGcalEvent({
    summary: "STANDALONE: Regular Event",
  });

  const allDayStandalone = mockRegularGcalEvent(
    { summary: "STANDALONE:All Day Event" },
    true,
  );

  const baseTimedRecurrence = mockRecurringGcalBaseEvent(
    { summary: "Recurring Event" },
    isAllDayBase,
    { freq: RRule.DAILY, interval: 7, ...recurrenceOptions },
  );

  const timedInstances = mockRecurringGcalInstances(baseTimedRecurrence);

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

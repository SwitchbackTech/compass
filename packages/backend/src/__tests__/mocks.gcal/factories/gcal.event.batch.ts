import dayjs from "dayjs";
import { faker } from "@faker-js/faker/.";
import { gSchema$EventBase } from "@core/types/gcal";
import {
  generateGcalId,
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
  mockRegularGcalEvent,
} from "./gcal.event.factory";

/* Batch of events, pre-organized as a convenience for testing */

export const mockAndCategorizeGcalEvents = (
  baseId?: string,
  fixedStart?: string,
  fixedEnd?: string,
) => {
  // Use fixed times if provided, otherwise fallback to defaults
  const tz = faker.location.timeZone();
  const tzStart = fixedStart ? dayjs.tz.guess() : tz;

  const startDateTime = dayjs.tz(fixedStart ?? faker.date.future(), tzStart);

  const endDateTime =
    dayjs.tz(fixedEnd, tzStart) || startDateTime.add(1, "hour");

  // Create a base recurring event
  const baseRecurringEvent = mockRecurringGcalBaseEvent({
    id: baseId || generateGcalId(),
    summary: "Recurrence",
    recurrence: ["RRULE:FREQ=WEEKLY"],
    start: { dateTime: startDateTime.toRFC3339OffsetString(), timeZone: tz },
    end: { dateTime: endDateTime.toRFC3339OffsetString(), timeZone: tz },
  }) as gSchema$EventBase;

  // Create instances of the recurring event
  const instances = mockRecurringGcalInstances(baseRecurringEvent, 2, 7);

  // Create a regular event
  const regularEvent = mockRegularGcalEvent({
    id: "regular-1",
    summary: "Regular Event",
  });

  // Create a cancelled event
  const cancelledEvent = mockRegularGcalEvent({
    id: "cancelled-1",
    status: "cancelled",
    summary: "Cancelled Event",
  });

  const all = [baseRecurringEvent, ...instances, regularEvent, cancelledEvent];

  return {
    gcalEvents: {
      baseRecurringEvent,
      instances,
      regularEvent,
      cancelledEvent,
      all,
    },
    meta: {
      total: all.length,
      instances: instances.length,
      base: 1,
      cancelled: 1,
    },
  };
};

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
  const startDateTime = fixedStart || faker.date.future().toISOString();
  const endDateTime =
    fixedEnd || dayjs(startDateTime).add(1, "hour").toISOString();

  // Create a base recurring event
  const tz = faker.location.timeZone();
  const baseRecurringEvent = mockRecurringGcalBaseEvent({
    id: baseId || generateGcalId(),
    summary: "Recurrence",
    recurrence: ["RRULE:FREQ=WEEKLY"],
    start: { dateTime: startDateTime, timeZone: tz },
    end: { dateTime: endDateTime, timeZone: tz },
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

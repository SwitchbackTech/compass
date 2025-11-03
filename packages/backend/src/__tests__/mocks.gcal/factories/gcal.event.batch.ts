import { faker } from "@faker-js/faker";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
  mockRegularGcalEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { EventStatus } from "../../../../../core/src/types/event.types";

/* Batch of events, pre-organized as a convenience for testing */

export const mockAndCategorizeGcalEvents = (allDay = false) => {
  // Create a base recurring event
  const baseRecurringEvent = mockRecurringGcalBaseEvent(
    { summary: "Recurrence" },
    allDay,
    { count: faker.number.int({ min: 10, max: 20 }) },
  );

  // Create instances of the recurring event
  const instances = mockRecurringGcalInstances(baseRecurringEvent);

  // Create a regular event
  const regularEvent = mockRegularGcalEvent(
    { summary: "Regular Event" },
    allDay,
  );

  // Create a cancelled event
  const cancelledEvent = mockRegularGcalEvent(
    { status: EventStatus.CANCELLED, summary: "Cancelled Event" },
    allDay,
  );

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

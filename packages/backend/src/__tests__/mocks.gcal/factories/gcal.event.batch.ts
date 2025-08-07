import { gSchema$EventBase } from "@core/types/gcal";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
  mockRegularGcalEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";

/* Batch of events, pre-organized as a convenience for testing */

export const mockAndCategorizeGcalEvents = () => {
  // Create a base recurring event
  const baseRecurringEvent = mockRecurringGcalBaseEvent(
    { summary: "Recurrence" },
    false,
    { count: 3 },
  ) as gSchema$EventBase;

  // Create instances of the recurring event
  const instances = mockRecurringGcalInstances(baseRecurringEvent);

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

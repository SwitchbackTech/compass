import { gSchema$EventBase } from "@core/types/gcal";
import {
  generateGcalId,
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
  mockRegularGcalEvent,
} from "./gcal.event.factory";

/* Sets of events, pre-organized as a convenience for testing */

export const mockGcalEvents = (baseId?: string) => {
  // Create a base recurring event
  const baseRecurringEvent = mockRecurringGcalBaseEvent({
    id: baseId || generateGcalId(),
    summary: "Recurrence",
    recurrence: ["RRULE:FREQ=WEEKLY"],
  }) as gSchema$EventBase;
  console.log("mocked base with:", baseId);

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

  const instanceIds = instances.map((i) => i.id);
  console.log("mocked instanceIds:", instanceIds);

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

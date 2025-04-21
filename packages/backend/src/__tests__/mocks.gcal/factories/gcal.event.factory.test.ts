import { gSchema$EventInstance } from "@core/types/gcal";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
} from "./gcal.event.factory";

describe("mockRecurringInstances", () => {
  it("should not include 'recurrence'", () => {
    const base = mockRecurringGcalBaseEvent();
    const instances = mockRecurringGcalInstances(base, 2, 7);
    instances.forEach((instance) => {
      expect(instance).not.toHaveProperty("recurrence");
    });
  });
  it("should create the correct number of instances", () => {
    const base = mockRecurringGcalBaseEvent();
    const instances = mockRecurringGcalInstances(base, 2, 7);
    expect(instances).toHaveLength(2);
  });
  it("should include 'recurringEventId' that points to the base event", () => {
    const base = mockRecurringGcalBaseEvent();
    const instances = mockRecurringGcalInstances(base, 2, 7);
    instances.forEach((instance) => {
      expect(instance.recurringEventId).toBe(base.id);
    });
  });
  it("should make the first instance start and end at the same time as the base event", () => {
    const base = mockRecurringGcalBaseEvent();
    const instances = mockRecurringGcalInstances(base, 2, 7);
    const firstInstance = instances[0] as gSchema$EventInstance;

    expect(firstInstance.start?.dateTime).toBe(base.start?.dateTime);
    expect(firstInstance.end?.dateTime).toBe(base.end?.dateTime);
  });
  it("should make instances start and end in the future from the base time (except for the first one)", () => {
    const base = mockRecurringGcalBaseEvent();
    const instances = mockRecurringGcalInstances(base, 2, 7);
    const baseStart = new Date(base.start?.dateTime as string);
    instances.forEach((instance, index) => {
      if (index === 0) return; // first instance is the same as the base
      const instanceStart = new Date(instance.start?.dateTime as string);
      expect(instanceStart.getTime()).toBeGreaterThan(baseStart.getTime());

      const instanceEnd = new Date(instance.end?.dateTime as string);
      const baseEnd = new Date(base.end?.dateTime as string);
      expect(instanceEnd.getTime()).toBeGreaterThan(baseEnd.getTime());
    });
  });
});

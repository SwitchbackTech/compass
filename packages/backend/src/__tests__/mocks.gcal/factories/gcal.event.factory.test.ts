import { gSchema$EventInstance } from "@core/types/gcal";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";

describe("mockRecurringInstances", () => {
  it("should not include 'recurrence'", () => {
    const base = mockRecurringGcalBaseEvent({}, false, { count: 2 });
    const instances = mockRecurringGcalInstances(base);
    instances.forEach((instance) => {
      expect(instance).not.toHaveProperty("recurrence");
    });
  });

  it("should create the correct number of instances", () => {
    const base = mockRecurringGcalBaseEvent({}, false, { count: 2 });
    const instances = mockRecurringGcalInstances(base);
    expect(instances).toHaveLength(2);
  });

  it("should include 'recurringEventId' that points to the base event", () => {
    const base = mockRecurringGcalBaseEvent({}, false, { count: 2 });
    const instances = mockRecurringGcalInstances(base);
    instances.forEach((instance) => {
      expect(instance.recurringEventId).toBe(base.id);
    });
  });

  it("should make the first instance start and end at the same time as the base event", () => {
    const base = mockRecurringGcalBaseEvent({}, false, { count: 2 });
    const instances = mockRecurringGcalInstances(base);
    const firstInstance = instances[0] as gSchema$EventInstance;

    expect(firstInstance.start?.dateTime).toBe(base.start?.dateTime);
    expect(firstInstance.end?.dateTime).toBe(base.end?.dateTime);
  });

  it("should make instances start and end in the future from the base time (except for the first one)", () => {
    const base = mockRecurringGcalBaseEvent({}, false, { count: 2 });
    const instances = mockRecurringGcalInstances(base);
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

  it("should create recurring instances", () => {
    const event = mockRecurringGcalBaseEvent({}, false, { count: 3 });
    const instances = mockRecurringGcalInstances(event);
    expect(instances).toHaveLength(3);
  });

  it("should use RFC3339_OFFSET for start and end times", () => {
    const event = mockRecurringGcalBaseEvent({}, false, { count: 3 });
    const instances = mockRecurringGcalInstances(event);
    const hasTZOffset = (ts: string) => {
      return (
        // @ts-expect-error assuming string has enough length
        ts[ts.length - 3] === ":" && ["+", "-"].includes(ts[ts.length - 6])
      );
    };
    instances.forEach((instance) => {
      expect(hasTZOffset(instance.start?.dateTime as string)).toBe(true);
      expect(hasTZOffset(instance.end?.dateTime as string)).toBe(true);
    });
  });
});

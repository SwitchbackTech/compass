import {
  mockRecurringBaseEvent,
  mockRecurringInstances,
} from "./gcal.event.factory";

describe("mockRecurringInstances", () => {
  it("should not include 'recurrence'", () => {
    const base = mockRecurringBaseEvent();
    const instances = mockRecurringInstances(base, 2, 7);
    instances.forEach((instance) => {
      expect(instance).not.toHaveProperty("recurrence");
    });
  });
  it("should create the correct number of instances", () => {
    const base = mockRecurringBaseEvent();
    const instances = mockRecurringInstances(base, 2, 7);
    expect(instances).toHaveLength(2);
  });
  it("should include 'recurringEventId' that points to the base event", () => {
    const base = mockRecurringBaseEvent();
    const instances = mockRecurringInstances(base, 2, 7);
    instances.forEach((instance) => {
      expect(instance.recurringEventId).toBe(base.id);
    });
  });
  it("should make instances times in the future from the base time", () => {
    const base = mockRecurringBaseEvent();
    const instances = mockRecurringInstances(base, 2, 7);
    const baseStart = new Date(base.start?.dateTime as string);
    instances.forEach((instance) => {
      const instanceStart = new Date(instance.start?.dateTime as string);
      expect(instanceStart.getTime()).toBeGreaterThan(baseStart.getTime());

      const instanceEnd = new Date(instance.end?.dateTime as string);
      const baseEnd = new Date(base.end?.dateTime as string);
      expect(instanceEnd.getTime()).toBeGreaterThan(baseEnd.getTime());
    });
  });
});

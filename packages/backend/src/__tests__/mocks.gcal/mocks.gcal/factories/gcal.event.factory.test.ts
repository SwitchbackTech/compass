import {
  mockRecurringEvent,
  mockRecurringInstances,
} from "./gcal.event.factory";

describe("mockRecurringInstances", () => {
  it("should create recurring instances", () => {
    const event = mockRecurringEvent();
    const instances = mockRecurringInstances(event, 3, 7);
    expect(instances).toHaveLength(3);
  });
  it("should use RFC3339_OFFSET for start and end times", () => {
    const event = mockRecurringEvent();
    const instances = mockRecurringInstances(event, 3, 7);
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

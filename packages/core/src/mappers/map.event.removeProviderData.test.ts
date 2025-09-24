import { Schema_Event } from "@core/types/event.types";
import { MapEvent } from "./map.event";

describe("MapEvent.removeProviderData", () => {
  const createSampleEvent = (
    overrides?: Partial<Schema_Event>,
  ): Schema_Event => ({
    _id: "test-event-id",
    title: "Sample Event",
    startDate: "2025-01-15T10:00:00.000Z",
    endDate: "2025-01-15T11:00:00.000Z",
    isAllDay: false,
    isSomeday: false,
    user: "test-user-id",
    origin: "compass" as any,
    priority: "high" as any,
    gEventId: "google-event-id-123",
    gRecurringEventId: "google-recurring-event-id-456",
    description: "This is a sample event for testing",
    ...overrides,
  });

  it("should remove _id, gEventId, and gRecurringEventId from event", () => {
    const originalEvent = createSampleEvent();

    const result = MapEvent.removeProviderData(originalEvent);

    expect(result).not.toHaveProperty("_id");
    expect(result).not.toHaveProperty("gEventId");
    expect(result).not.toHaveProperty("gRecurringEventId");

    // Should preserve other fields
    expect(result.title).toBe("Sample Event");
    expect(result.startDate).toBe("2025-01-15T10:00:00.000Z");
    expect(result.endDate).toBe("2025-01-15T11:00:00.000Z");
    expect(result.isAllDay).toBe(false);
    expect(result.user).toBe("test-user-id");
    expect(result.origin).toBe("compass");
    expect(result.priority).toBe("high");
    expect(result.description).toBe("This is a sample event for testing");
  });

  it("should handle event without provider-specific fields gracefully", () => {
    const eventWithoutProviderData = createSampleEvent({
      gEventId: undefined,
      gRecurringEventId: undefined,
    });

    const result = MapEvent.removeProviderData(eventWithoutProviderData);

    expect(result).not.toHaveProperty("_id");
    expect(result).not.toHaveProperty("gEventId");
    expect(result).not.toHaveProperty("gRecurringEventId");

    expect(result.title).toBe("Sample Event");
    expect(result.user).toBe("test-user-id");
  });

  it("should handle recurrence correctly - preserve rule but remove eventId", () => {
    const recurringEvent = createSampleEvent({
      recurrence: {
        eventId: "recurring-event-id",
        rule: ["FREQ=WEEKLY;BYDAY=MO,WE,FR"],
      },
    });

    const result = MapEvent.removeProviderData(recurringEvent);

    expect(result.recurrence).toEqual({
      rule: ["FREQ=WEEKLY;BYDAY=MO,WE,FR"],
    });
    expect(result.recurrence).not.toHaveProperty("eventId");
  });

  it("should handle event without recurrence rule", () => {
    const eventWithoutRecurrence = createSampleEvent({
      recurrence: undefined,
    });

    const result = MapEvent.removeProviderData(eventWithoutRecurrence);

    expect(result).not.toHaveProperty("recurrence");
  });

  it("should handle event with eventId but no rule in recurrence", () => {
    const eventWithEventIdOnly = createSampleEvent({
      recurrence: {
        eventId: "recurring-event-id",
      } as any,
    });

    const result = MapEvent.removeProviderData(eventWithEventIdOnly);

    // When there's an eventId, recurrence should be included but rule will be undefined
    expect(result.recurrence).toEqual({ rule: undefined });
  });
});

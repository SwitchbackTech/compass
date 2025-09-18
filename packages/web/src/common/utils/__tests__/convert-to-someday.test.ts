import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { validateSomedayEvent } from "../../validators/someday.event.validator";
import {
  isSafeSomedayEvent,
  validateSomedayEventsSafely,
} from "../someday.util";

describe("convert to someday event", () => {
  it("should convert a regular event to someday event successfully", () => {
    // Arrange: Create a regular calendar event
    const regularEvent: Schema_Event = {
      _id: "test-id",
      title: "Test Event",
      description: "Test Description",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
      user: "user-id",
      isAllDay: false,
      isSomeday: false, // This is the key - it starts as false
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
    };

    // Act: Convert to someday event (simulating the convert function)
    const somedayDraft = {
      ...regularEvent,
      isAllDay: false,
      isSomeday: true, // Set to true
      startDate: "2024-01-01",
      endDate: "2024-01-07",
      order: 0, // Set order
    };

    // Assert: Should validate successfully
    expect(() => validateSomedayEvent(somedayDraft)).not.toThrow();

    const result = validateSomedayEvent(somedayDraft);
    expect(result.isSomeday).toBe(true);
    expect(result.order).toBe(0);
  });

  it("should fail when isSomeday is false", () => {
    // Arrange: Create an event with isSomeday: false
    const eventWithFalseIsSomeday: Schema_Event = {
      _id: "test-id",
      title: "Test Event",
      description: "Test Description",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
      user: "user-id",
      isAllDay: false,
      isSomeday: false, // This should cause validation to fail
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      order: 0,
    };

    // Act & Assert: Should throw validation error
    expect(() => validateSomedayEvent(eventWithFalseIsSomeday)).toThrow();
  });

  it("should fail when order is undefined", () => {
    // Arrange: Create an event without order
    const eventWithoutOrder: Schema_Event = {
      _id: "test-id",
      title: "Test Event",
      description: "Test Description",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
      user: "user-id",
      isAllDay: false,
      isSomeday: true,
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      // order is missing/undefined
    };

    // Act & Assert: Should throw validation error
    expect(() => validateSomedayEvent(eventWithoutOrder)).toThrow();
  });
});

describe("safe someday event validation", () => {
  it("should safely identify valid someday events", () => {
    const validSomedayEvent: Schema_Event = {
      _id: "test-id",
      title: "Test Event",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
      user: "user-id",
      isAllDay: false,
      isSomeday: true,
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      order: 0,
    };

    expect(isSafeSomedayEvent(validSomedayEvent)).toBe(true);
  });

  it("should safely identify invalid someday events", () => {
    const invalidSomedayEvent: Schema_Event = {
      _id: "test-id",
      title: "Test Event",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
      user: "user-id",
      isAllDay: false,
      isSomeday: false, // Invalid
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      order: 0,
    };

    expect(isSafeSomedayEvent(invalidSomedayEvent)).toBe(false);
  });

  it("should safely filter mixed array of events", () => {
    const validEvent: Schema_Event = {
      _id: "valid-id",
      title: "Valid Event",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
      user: "user-id",
      isAllDay: false,
      isSomeday: true,
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      order: 0,
    };

    const invalidEvent: Schema_Event = {
      _id: "invalid-id",
      title: "Invalid Event",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
      user: "user-id",
      isAllDay: false,
      isSomeday: false, // Invalid
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      // No order
    };

    const result = validateSomedayEventsSafely([validEvent, invalidEvent]);

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("valid-id");
  });
});

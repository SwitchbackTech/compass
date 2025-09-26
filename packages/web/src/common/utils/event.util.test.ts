import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import {
  Schema_GridEvent,
  Schema_WebEvent,
} from "@web/common/types/web.event.types";
import {
  isEventInRange,
  prepEvtBeforeSubmit,
} from "@web/common/utils/event.util";
import { _assembleGridEvent } from "@web/ducks/events/sagas/saga.util";

describe("isEventInRange", () => {
  it("returns true if event is in range", () => {
    const event = { start: "2022-03-15", end: "2022-03-15" };
    const dates = {
      start: "2022-03-14",
      end: "2022-03-19",
    };
    expect(isEventInRange(event, dates)).toBe(true);
  });

  it("returns false if event is not in range", () => {
    const event = { start: "2022-03-15", end: "2022-03-15" };
    const dates = {
      start: "2022-03-16",
      end: "2022-03-19",
    };
    expect(isEventInRange(event, dates)).toBe(false);
  });
});

describe("_assembleGridEvent", () => {
  it("should successfully convert Someday event to Grid event by adding position field", () => {
    // Create a mock Someday event (without position field)
    const somedayEvent = createMockStandaloneEvent({
      isSomeday: true,
    }) as Schema_WebEvent;

    const generator = _assembleGridEvent(somedayEvent);

    // First, it calls getEventById
    const getEventStep = generator.next();
    expect(getEventStep.done).toBe(false);

    // Mock returning the Someday event
    const validateStep = generator.next({ ...somedayEvent, isSomeday: false });

    // This should now succeed because the fix adds the required position field
    expect(validateStep.done).toBe(true);
    const result = validateStep.value as Schema_GridEvent;

    // Verify that position field is now present
    expect(result.position).toBeDefined();
    expect(result.position.isOverlapping).toBe(false);
    expect(result.position.widthMultiplier).toBe(1);
    expect(result.position.horizontalOrder).toBe(1);
  });
});

describe("prepEvtBeforeSubmit", () => {
  it("should handle all-day events without position field", () => {
    // Create a mock all-day event (without position field) using valid data format
    const allDayEvent: Schema_WebEvent = {
      _id: new ObjectId().toString(),
      title: "All Day Event",
      isAllDay: true,
      isSomeday: false,
      startDate: "2023-01-01T00:00:00.000Z",
      endDate: "2023-01-01T23:59:59.999Z",
      origin: Origin.COMPASS,
      priority: Priorities.RELATIONS,
      // Explicitly omit position field to simulate all-day events
    };

    const userId = "test-user-id";

    // This should not throw an error even though position is missing
    expect(() => prepEvtBeforeSubmit(allDayEvent, userId)).not.toThrow();

    const result = prepEvtBeforeSubmit(allDayEvent, userId);

    // Verify that the result has the position field added
    expect(result.position).toBeDefined();
    expect(result.position.isOverlapping).toBe(false);
    expect(result.position.widthMultiplier).toBe(1);
    expect(result.position.horizontalOrder).toBe(1);
    expect(result.position.dragOffset).toEqual({ y: 0 });
    expect(result.position.initialX).toBeNull();
    expect(result.position.initialY).toBeNull();

    // Verify other fields are preserved
    expect(result.title).toBe("All Day Event");
    expect(result.isAllDay).toBe(true);
    expect(result.user).toBe(userId);
  });

  it("should handle timed events that already have position field", () => {
    // Create a mock timed event (with position field) using valid data format
    const timedEvent: Schema_WebEvent = {
      _id: new ObjectId().toString(),
      title: "Timed Event",
      isAllDay: false,
      isSomeday: false,
      startDate: "2023-01-01T10:00:00.000Z",
      endDate: "2023-01-01T11:00:00.000Z",
      origin: Origin.COMPASS,
      priority: Priorities.SELF,
      position: {
        isOverlapping: true,
        widthMultiplier: 0.5,
        horizontalOrder: 2,
        dragOffset: { y: 10 },
        initialX: 100,
        initialY: 200,
      },
    };

    const userId = "test-user-id";

    const result = prepEvtBeforeSubmit(timedEvent, userId);

    // Verify that the existing position field is preserved
    expect(result.position.isOverlapping).toBe(true);
    expect(result.position.widthMultiplier).toBe(0.5);
    expect(result.position.horizontalOrder).toBe(2);
    expect(result.position.dragOffset).toEqual({ y: 10 });
    expect(result.position.initialX).toBe(100);
    expect(result.position.initialY).toBe(200);

    // Verify other fields are preserved
    expect(result.title).toBe("Timed Event");
    expect(result.isAllDay).toBe(false);
    expect(result.user).toBe(userId);
  });
});

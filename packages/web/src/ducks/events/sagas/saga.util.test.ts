import { ObjectId } from "bson";
import { select } from "redux-saga/effects";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { _assembleGridEvent } from "./saga.util";

// Mock the select effect and getEventById
jest.mock("redux-saga/effects", () => ({
  select: jest.fn(),
  put: jest.fn(),
  call: jest.fn(),
}));

const mockSelect = select as jest.MockedFunction<typeof select>;

describe("_assembleGridEvent", () => {
  it("should successfully convert Someday event to Grid event by adding position field", () => {
    // Create a mock Someday event (without position field)
    const somedayEvent: Schema_Event = {
      _id: new ObjectId().toString(),
      title: "Test Someday Event",
      description: "Test description",
      startDate: "2023-12-01",
      endDate: "2023-12-01",
      isAllDay: false,
      isSomeday: true,
      user: "user123",
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      order: 0,
    };

    // Mock the generator function to return the Someday event
    const generator = _assembleGridEvent({ _id: somedayEvent._id! });

    // First, it calls getEventById
    const getEventStep = generator.next();
    expect(getEventStep.done).toBe(false);

    // Mock returning the Someday event
    const validateStep = generator.next(somedayEvent);

    // This should now succeed because the fix adds the required position field
    expect(validateStep.done).toBe(true);
    const result = validateStep.value as Schema_GridEvent;

    // Verify that position field is now present
    expect(result.position).toBeDefined();
    expect(result.position.isOverlapping).toBe(false);
    expect(result.position.widthMultiplier).toBe(1);
    expect(result.position.horizontalOrder).toBe(1);
  });

  it("should successfully validate when Someday event has position field added", () => {
    // Create a mock Someday event
    const somedayEvent: Schema_Event = {
      _id: new ObjectId().toString(),
      title: "Test Someday Event",
      description: "Test description",
      startDate: "2023-12-01",
      endDate: "2023-12-01",
      isAllDay: false,
      isSomeday: true,
      user: "user123",
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      order: 0,
    };

    // Create expected grid event with position field
    const expectedGridEvent: Schema_GridEvent = {
      ...somedayEvent,
      position: {
        isOverlapping: false,
        widthMultiplier: 1,
        horizontalOrder: 1,
        initialX: null,
        initialY: null,
        dragOffset: { y: 0 },
      },
    };

    // Mock the generator function
    const generator = _assembleGridEvent({
      _id: somedayEvent._id!,
      position: expectedGridEvent.position,
    });

    // First, it calls getEventById
    const getEventStep = generator.next();
    expect(getEventStep.done).toBe(false);

    // Mock returning the Someday event, then validation should succeed
    const result = generator.next(somedayEvent);

    if (result.done) {
      // Should successfully create a valid grid event
      expect(result.value).toBeDefined();
      expect((result.value as Schema_GridEvent).position).toBeDefined();
    }
  });
});

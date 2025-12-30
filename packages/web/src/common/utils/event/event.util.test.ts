import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import {
  Schema_GridEvent,
  Schema_WebEvent,
} from "@web/common/types/web.event.types";
import { addId, isEventInRange } from "@web/common/utils/event/event.util";
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

describe("addId", () => {
  it("should add a raw MongoID and set isOptimistic flag", () => {
    const event = createMockStandaloneEvent() as Schema_GridEvent;
    const result = addId(event);

    expect(result._id).toBeDefined();
    expect(result._id).not.toMatch(/^optimistic-/);
    expect((result as any).isOptimistic).toBe(true);
  });
});

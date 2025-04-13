import { ObjectId } from "mongodb";
import { Event_Core } from "@core/types/event.types";
import { createMockBaseEvent } from "@backend/__tests__/mocks.ccal/ccal.event.factory";
import { createMockInstance } from "@backend/__tests__/mocks.ccal/ccal.event.factory";
import { assignIds } from "./import.all.util";

describe("assignIds", () => {
  it("assigns Mongo ObjectIds to events and links instances to base events", () => {
    // Create a base event with a Google ID
    const baseEvent = createMockBaseEvent();
    baseEvent.gEventId = "google_base_id";
    delete baseEvent._id;

    // Create instances that reference the base event's Google ID
    const instance1 = createMockInstance("google_base_id");
    const instance2 = createMockInstance("google_base_id");
    // delete _ids to simulate a newly mapped event
    delete instance1._id;
    delete instance2._id;

    const events = [baseEvent, instance1, instance2];
    assignIds(events as Event_Core[]);

    // Verify all events have ObjectIds
    for (const event of events) {
      expect(event?._id).toBeDefined();
      expect(event._id).toBeInstanceOf(ObjectId);
    }

    // Verify instances are linked to the base event
    const baseEventId = baseEvent._id;
    expect(baseEventId).toBeDefined();
    if (baseEventId) {
      expect(instance1.recurrence?.eventId).toBe(baseEventId.toString());
      expect(instance2.recurrence?.eventId).toBe(baseEventId.toString());
    }
  });
});

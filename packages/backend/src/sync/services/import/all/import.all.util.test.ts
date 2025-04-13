import { ObjectId } from "mongodb";
import { Event_Core } from "@core/types/event.types";
import { createMockBaseEvent } from "@backend/__tests__/mocks.ccal/ccal.event.factory";
import { createMockInstance } from "@backend/__tests__/mocks.ccal/ccal.event.factory";
import { assignIds } from "./import.all.util";

const getEventsWithoutIds = () => {
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

  const eventsWithoutIds = [baseEvent, instance1, instance2];
  return eventsWithoutIds;
};

describe("assignIds", () => {
  it("assigns Mongo ObjectIds to events", () => {
    const events = getEventsWithoutIds() as Event_Core[];
    assignIds(events);

    // Verify all events have ObjectIds
    for (const event of events) {
      expect(event?._id).toBeDefined();
      expect(event._id).toBeInstanceOf(ObjectId);
    }
  });
  it("links instances to base events", () => {
    const events = getEventsWithoutIds() as Event_Core[]; // no ids originally
    assignIds(events); // adds ids

    const baseEvent = events.filter((event) => event.recurrence?.rule);
    expect(baseEvent).toHaveLength(1);

    const instances = events.filter((event) => event.recurrence?.eventId);
    expect(instances).toHaveLength(2);

    for (const instance of instances) {
      const baseEventId = baseEvent[0]!._id?.toString();
      expect(instance.recurrence?.eventId).toBe(baseEventId);
    }
  });
});

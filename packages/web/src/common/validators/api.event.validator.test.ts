import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { validateApiEvent } from "./api.event.validator";

describe("validateApiEvent", () => {
  const _id = new ObjectId().toString();
  const apiEvent = () => ({
    _id,
    title: "Meeting",
    startDate: "2026-07-07T16:45:00-06:00",
    endDate: "2026-07-07T17:30:00-06:00",
    origin: Origin.COMPASS,
    priority: Priorities.WORK,
    gEventId: "g-1",
    user: "user123",
  });

  it("strips client-only fields the backend has no use for", () => {
    const parsed = validateApiEvent({
      ...apiEvent(),
      // Grid layout state and local-store markers ride along on cached
      // events; none of it belongs in a request body.
      position: {
        isOverlapping: false,
        totalEventsInGroup: 1,
        widthMultiplier: 1,
        horizontalOrder: 1,
        dragOffset: { x: 0, y: 0 },
        initialX: null,
        initialY: null,
      },
      hasFlipped: false,
      isOpen: true,
      row: 2,
      order: 3,
      __compassDemoEvent: true,
    } as never);

    expect(parsed).toEqual(apiEvent());
  });

  it("accepts a valid event unchanged", () => {
    const event = apiEvent();
    expect(validateApiEvent(event)).toEqual(event);
  });

  it("rejects an event the backend would reject", () => {
    // Same schema as the backend controller, so a client-side failure means
    // the request would have 400'd anyway.
    expect(() =>
      validateApiEvent({ ...apiEvent(), _id: "not-an-object-id" }),
    ).toThrow();
  });
});

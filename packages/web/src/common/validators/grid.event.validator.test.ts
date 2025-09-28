import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_GridEvent } from "../types/web.event.types";
import { validateGridEvent } from "./grid.event.validator";

describe("validateGridEvent", () => {
  it("strips unexpected properties", () => {
    const event = {
      _id: new ObjectId().toString(),
      startDate: "2023-01-01",
      endDate: "2023-01-02",
      origin: Origin.COMPASS,
      priority: Priorities.RELATIONS,
      user: "user123",
      unexpectedProperty: "unexpectedValue",
      position: {
        dragOffset: { y: 0 },
        horizontalOrder: 0,
        initialX: 0,
        initialY: 0,
        isOverlapping: false,
        widthMultiplier: 1,
      },
    };

    const parsedEvent = validateGridEvent(event);
    expect(parsedEvent).not.toHaveProperty("unexpectedProperty");
  });

  it("validates a correct event", () => {
    const event: Omit<Schema_GridEvent, "recurrence"> = {
      _id: new ObjectId().toString(),
      endDate: "2023-01-02",
      hasFlipped: true,
      isOpen: true,
      row: 10,
      startDate: "2023-01-01",
      origin: Origin.COMPASS,
      priority: Priorities.RELATIONS,
      user: "user123",
      position: {
        dragOffset: { y: 0 },
        horizontalOrder: 0,
        initialX: 0,
        initialY: 0,
        isOverlapping: false,
        widthMultiplier: 1,
      },
    };

    const parsedEvent = validateGridEvent(event);
    expect(parsedEvent).toEqual(event);
  });

  it("invalidates when types are incorrect", () => {
    const event: Omit<Partial<Schema_GridEvent>, "recurrence"> = {
      startDate: "2022-10-22",
      endDate: "2023-01-02",
      origin: Origin.UNSURE,
      priority: Priorities.SELF,
      user: "user1",
      hasFlipped: "true" as unknown as boolean, // invalid
      position: {
        dragOffset: { y: 0 },
        horizontalOrder: 0,
        initialX: 0,
        initialY: 0,
        isOverlapping: false,
        widthMultiplier: 1,
      },
    };

    expect(() => validateGridEvent(event)).toThrow();
  });
});

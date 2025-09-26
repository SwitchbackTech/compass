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
    };

    const parsedEvent = validateGridEvent(event);
    expect(parsedEvent).not.toHaveProperty("unexpectedProperty");
  });
  it("validates a correct event", () => {
    const event: Schema_GridEvent = {
      _id: new ObjectId().toString(),
      endDate: "2023-01-02",
      hasFlipped: true,
      isOpen: true,
      row: 10,
      startDate: "2023-01-01",
      origin: Origin.COMPASS,
      priority: Priorities.RELATIONS,
      user: "user123",
    };

    const parsedEvent = validateGridEvent(event);
    expect(parsedEvent).toEqual(event);
  });

  it("invalidates when types are incorrect", () => {
    const event = {
      startDate: "2022-10-22",
      endDate: "2023-01-02",
      origin: Origin.UNSURE,
      priority: Priorities.SELF,
      user: "user1",
      hasFlipped: "true", // invalid
    } as unknown as Schema_GridEvent;

    expect(() => validateGridEvent(event)).toThrow();
  });
});

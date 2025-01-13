import { validateEvent } from "./event.validator";
import { Origin, Priorities } from "../constants/core.constants";
import { Schema_Event } from "../types/event.types";

describe("validateEvent", () => {
  it("strips unexpected properties", () => {
    const event = {
      startDate: "2023-01-01",
      endDate: "2023-01-02",
      origin: Origin.COMPASS,
      priority: Priorities.RELATIONS,
      user: "user123",
      unexpectedProperty: "unexpectedValue",
    };

    const parsedEvent = validateEvent(event);
    expect(parsedEvent).not.toHaveProperty("unexpectedProperty");
  });
  it("validates a correct event", () => {
    const event: Schema_Event = {
      startDate: "2023-01-01",
      endDate: "2023-01-02",
      origin: Origin.COMPASS,
      priority: Priorities.RELATIONS,
      user: "user123",
    };

    const parsedEvent = validateEvent(event);
    expect(parsedEvent).toEqual(event);
  });

  it("invalidates when properties are missing", () => {
    const event = {
      startDate: "2023-01-01",
      endDate: "2023-01-02",
      origin: Origin.GOOGLE,
    };

    expect(() => validateEvent(event)).toThrow();
  });

  it("invalidates when types are incorrect", () => {
    const event = {
      startDate: 20230101,
      endDate: "2023-01-02",
      origin: "INVALID_ORIGIN",
      priority: "INVALID_PRIORITY",
      user: 123,
    } as unknown as Schema_Event;

    expect(() => validateEvent(event)).toThrow();
  });

  it("invalidates when date format is invalid", () => {
    const event: Schema_Event = {
      startDate: "01-01-2023", // wrong format
      endDate: "2023-02-21",
      origin: Origin.GOOGLE_IMPORT,
      priority: Priorities.WORK,
      user: "user123",
    };

    expect(() => validateEvent(event)).toThrow();
  });
});

it("invalidates when datetime format is invalid", () => {
  const event: Schema_Event = {
    startDate: "2023-01-01T05:00:00", //missing offset
    endDate: "2023-01-02T15:00:00+02:00",
    origin: Origin.COMPASS,
    priority: Priorities.RELATIONS,
    user: "user123",
  };

  expect(() => validateEvent(event)).toThrow();
});

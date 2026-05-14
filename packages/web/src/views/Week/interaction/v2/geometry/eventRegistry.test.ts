import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  getRegisteredWeekEvent,
  registerWeekEventElement,
} from "./eventRegistry";
import { describe, expect, it } from "bun:test";

const createEvent = (id: string): Schema_GridEvent =>
  ({
    _id: id,
    isAllDay: false,
  }) as Schema_GridEvent;

describe("week interaction event registry", () => {
  it("returns the registered element and event by id", () => {
    const element = document.createElement("div");
    const event = createEvent("event-1");
    const unregister = registerWeekEventElement("event-1", {
      element,
      event,
      kind: "timed",
    });

    expect(getRegisteredWeekEvent("event-1")).toEqual({
      element,
      event,
      kind: "timed",
    });

    unregister();
  });

  it("does not unregister a newer element for the same event", () => {
    const firstElement = document.createElement("div");
    const secondElement = document.createElement("div");
    const firstEvent = createEvent("event-2");
    const secondEvent = createEvent("event-2");
    const unregisterFirst = registerWeekEventElement("event-2", {
      element: firstElement,
      event: firstEvent,
      kind: "timed",
    });
    const unregisterSecond = registerWeekEventElement("event-2", {
      element: secondElement,
      event: secondEvent,
      kind: "timed",
    });

    unregisterFirst();

    expect(getRegisteredWeekEvent("event-2")).toEqual({
      element: secondElement,
      event: secondEvent,
      kind: "timed",
    });

    unregisterSecond();
  });
});

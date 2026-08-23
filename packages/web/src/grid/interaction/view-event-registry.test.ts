import {
  calendarEventIdElementSelector,
  calendarEventIdValueSelector,
  createViewInteractionRegistry,
  readCalendarEventIdFromElement,
} from "./view-event-registry";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("calendar event id DOM helpers", () => {
  it("reads a day or week interaction id from an element or its ancestor", () => {
    const weekCard = document.createElement("div");
    weekCard.setAttribute("data-week-interaction-event-id", "week-event");
    const child = document.createElement("span");
    weekCard.append(child);
    document.body.append(weekCard);

    expect(readCalendarEventIdFromElement(child)).toBe("week-event");
    expect(calendarEventIdElementSelector()).toContain(
      "data-day-interaction-event-id",
    );
    expect(calendarEventIdValueSelector("week-event")).toContain(
      '[data-week-interaction-event-id="week-event"]',
    );
  });
});

describe("createViewInteractionRegistry", () => {
  it("namespaces the id/type attributes by view name", () => {
    const day = createViewInteractionRegistry("day");
    const week = createViewInteractionRegistry("week");

    expect(day.idAttribute).toBe("data-day-interaction-event-id");
    expect(day.typeAttribute).toBe("data-day-interaction-event-type");
    expect(week.idAttribute).toBe("data-week-interaction-event-id");
    expect(week.typeAttribute).toBe("data-week-interaction-event-type");
  });

  it("keeps each view's registry from resolving the other view's elements", () => {
    const day = createViewInteractionRegistry("day");
    const week = createViewInteractionRegistry("week");

    const dayEl = document.body.appendChild(document.createElement("div"));
    const weekEl = document.body.appendChild(document.createElement("div"));

    day.registry.register({
      element: dayEl,
      eventId: "shared-id",
      eventType: "timed",
    });
    week.registry.register({
      element: weekEl,
      eventId: "shared-id",
      eventType: "timed",
    });

    expect(day.registry.resolve("shared-id", "timed")).toBe(dayEl);
    expect(week.registry.resolve("shared-id", "timed")).toBe(weekEl);
    expect(dayEl.hasAttribute(week.idAttribute)).toBe(false);
    expect(weekEl.hasAttribute(day.idAttribute)).toBe(false);
  });

  it("getInteractionTargetAttributes returns nothing for an undefined eventId", () => {
    const day = createViewInteractionRegistry("day");

    expect(
      day.getInteractionTargetAttributes({
        eventId: undefined,
        eventType: "timed",
      }),
    ).toEqual({});
  });

  it("getInteractionTargetAttributes stamps both attributes for a defined eventId", () => {
    const day = createViewInteractionRegistry("day");

    expect(
      day.getInteractionTargetAttributes({
        eventId: "event-1",
        eventType: "all-day",
      }),
    ).toEqual({
      "data-day-interaction-event-id": "event-1",
      "data-day-interaction-event-type": "all-day",
    });
  });

  it("createRegistry produces a fresh, independent registry each call", () => {
    const day = createViewInteractionRegistry("day");
    const isolated = day.createRegistry();

    const el = document.body.appendChild(document.createElement("div"));
    isolated.register({ element: el, eventId: "isolated", eventType: "timed" });

    expect(isolated.resolve("isolated", "timed")).toBe(el);
    expect(day.registry.resolve("isolated", "timed")).toBeNull();
  });

  it("exposes targeting against the view's shared registry", () => {
    const day = createViewInteractionRegistry("day");
    const el = document.body.appendChild(document.createElement("button"));
    Object.defineProperty(el, "offsetParent", {
      configurable: true,
      get: () => document.body,
    });
    el.setAttribute(day.idAttribute, "event-1");
    el.setAttribute(day.typeAttribute, "timed");
    day.registry.register({
      element: el,
      eventId: "event-1",
      eventType: "timed",
    });

    expect(day.targeting.getFirstVisibleGridEventTarget()).toMatchObject({
      eventId: "event-1",
      eventType: "timed",
    });
  });
});

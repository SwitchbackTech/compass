import { dayEventRegistry } from "@web/views/Day/interaction/registry/day-event.registry";
import {
  clearHoveredDayGridEventTarget,
  focusDayGridEventTarget,
  getFirstVisibleDayGridEventTarget,
  getFocusedDayGridEventTarget,
  getHoveredDayGridEventTarget,
  listVisibleDayGridEventTargets,
  setHoveredDayGridEventTarget,
} from "./day-event.targeting";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  clearHoveredDayGridEventTarget();
  dayEventRegistry.clear();
  document.body.innerHTML = "";
});

const addEventButton = ({
  eventId,
  eventType = "timed",
  isVisible = true,
}: {
  eventId?: string;
  eventType?: "all-day" | "timed";
  isVisible?: boolean;
}) => {
  const button = document.createElement("button");
  if (isVisible) {
    Object.defineProperty(button, "offsetParent", {
      configurable: true,
      get: () => document.body,
    });
  }
  document.body.appendChild(button);

  if (eventId) {
    dayEventRegistry.register({
      element: button,
      eventId,
      eventType,
    });
  }

  return button;
};

describe("dayGridEventTargeting", () => {
  it("prefers the focused calendar event", () => {
    addEventButton({ eventId: "first" });
    const focused = addEventButton({
      eventId: "focused",
      eventType: "all-day",
    });
    focused.focus();

    expect(getFocusedDayGridEventTarget()).toMatchObject({
      element: focused,
      eventId: "focused",
      eventType: "all-day",
    });
  });

  it("uses the hovered calendar event when nothing is focused", () => {
    const hovered = addEventButton({ eventId: "hovered" });
    setHoveredDayGridEventTarget(hovered);

    expect(getHoveredDayGridEventTarget()).toMatchObject({
      element: hovered,
      eventId: "hovered",
      eventType: "timed",
    });
  });

  it("falls back to the first visible registered event", () => {
    addEventButton({});
    addEventButton({ eventId: "hidden", isVisible: false });
    const firstVisible = addEventButton({ eventId: "visible" });

    expect(getFirstVisibleDayGridEventTarget()).toMatchObject({
      element: firstVisible,
      eventId: "visible",
      eventType: "timed",
    });
  });

  it("focuses a returned calendar target", () => {
    const button = addEventButton({ eventId: "target" });
    const target = getFirstVisibleDayGridEventTarget();

    if (!target) throw new Error("expected target");
    focusDayGridEventTarget(target);

    expect(document.activeElement).toBe(button);
  });

  it("lists every visible registered event", () => {
    addEventButton({ eventId: "hidden", isVisible: false });
    const first = addEventButton({ eventId: "first" });
    const second = addEventButton({ eventId: "second" });

    expect(listVisibleDayGridEventTargets()).toEqual([
      expect.objectContaining({ element: first, eventId: "first" }),
      expect.objectContaining({ element: second, eventId: "second" }),
    ]);
  });
});

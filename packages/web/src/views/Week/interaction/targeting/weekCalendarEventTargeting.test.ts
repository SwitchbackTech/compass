import { weekEventRegistry } from "@web/views/Week/interaction/registry/weekEventRegistry";
import {
  clearHoveredCalendarEventTarget,
  focusCalendarEventTarget,
  getFirstVisibleCalendarEventTarget,
  getFocusedCalendarEventTarget,
  getHoveredCalendarEventTarget,
  setHoveredCalendarEventTarget,
} from "./weekCalendarEventTargeting";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  clearHoveredCalendarEventTarget();
  weekEventRegistry.clear();
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
    weekEventRegistry.register({
      element: button,
      eventId,
      eventType,
    });
  }

  return button;
};

describe("weekCalendarEventTargeting", () => {
  it("prefers the focused calendar event", () => {
    addEventButton({ eventId: "first" });
    const focused = addEventButton({
      eventId: "focused",
      eventType: "all-day",
    });
    focused.focus();

    expect(getFocusedCalendarEventTarget()).toMatchObject({
      element: focused,
      eventId: "focused",
      eventType: "all-day",
    });
  });

  it("uses the hovered calendar event when nothing is focused", () => {
    const hovered = addEventButton({ eventId: "hovered" });
    setHoveredCalendarEventTarget(hovered);

    expect(getHoveredCalendarEventTarget()).toMatchObject({
      element: hovered,
      eventId: "hovered",
      eventType: "timed",
    });
  });

  it("falls back to the first visible registered event", () => {
    addEventButton({});
    addEventButton({ eventId: "hidden", isVisible: false });
    const firstVisible = addEventButton({ eventId: "visible" });

    expect(getFirstVisibleCalendarEventTarget()).toMatchObject({
      element: firstVisible,
      eventId: "visible",
      eventType: "timed",
    });
  });

  it("focuses a returned calendar target", () => {
    const button = addEventButton({ eventId: "target" });
    const target = getFirstVisibleCalendarEventTarget();

    if (!target) throw new Error("expected target");
    focusCalendarEventTarget(target);

    expect(document.activeElement).toBe(button);
  });
});

import { weekEventRegistry } from "@web/views/Week/interaction/registry/week-event.registry";
import {
  focusWeekGridEventTarget,
  getFirstVisibleWeekGridEventTarget,
  getFocusedWeekGridEventTarget,
  listVisibleWeekGridEventTargets,
} from "./week-event.targeting";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
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

describe("weekGridEventTargeting", () => {
  it("prefers the focused calendar event", () => {
    addEventButton({ eventId: "first" });
    const focused = addEventButton({
      eventId: "focused",
      eventType: "all-day",
    });
    focused.focus();

    expect(getFocusedWeekGridEventTarget()).toMatchObject({
      element: focused,
      eventId: "focused",
      eventType: "all-day",
    });
  });

  it("falls back to the first visible registered event", () => {
    addEventButton({});
    addEventButton({ eventId: "hidden", isVisible: false });
    const firstVisible = addEventButton({ eventId: "visible" });

    expect(getFirstVisibleWeekGridEventTarget()).toMatchObject({
      element: firstVisible,
      eventId: "visible",
      eventType: "timed",
    });
  });

  it("focuses a returned calendar target", () => {
    const button = addEventButton({ eventId: "target" });
    const target = getFirstVisibleWeekGridEventTarget();

    if (!target) throw new Error("expected target");
    focusWeekGridEventTarget(target);

    expect(document.activeElement).toBe(button);
  });

  it("lists every visible registered event", () => {
    addEventButton({ eventId: "hidden", isVisible: false });
    const first = addEventButton({ eventId: "first" });
    const second = addEventButton({ eventId: "second" });

    expect(listVisibleWeekGridEventTargets()).toEqual([
      expect.objectContaining({ element: first, eventId: "first" }),
      expect.objectContaining({ element: second, eventId: "second" }),
    ]);
  });
});

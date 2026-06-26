import {
  getIsDraggingEvent,
  setIsDraggingEvent,
  subscribeToIsDraggingEvent,
} from "./eventDragCursorState";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  setIsDraggingEvent(false);
});

describe("eventDragCursorState", () => {
  it("exposes and updates the drag signal", () => {
    expect(getIsDraggingEvent()).toBe(false);

    setIsDraggingEvent(true);
    expect(getIsDraggingEvent()).toBe(true);

    setIsDraggingEvent(false);
    expect(getIsDraggingEvent()).toBe(false);
  });

  it("notifies subscribers only when the value changes", () => {
    let notifications = 0;
    const unsubscribe = subscribeToIsDraggingEvent(() => {
      notifications += 1;
    });

    setIsDraggingEvent(true);
    setIsDraggingEvent(true); // no-op, value unchanged
    setIsDraggingEvent(false);

    expect(notifications).toBe(2);

    unsubscribe();
    setIsDraggingEvent(true);
    expect(notifications).toBe(2);
  });
});

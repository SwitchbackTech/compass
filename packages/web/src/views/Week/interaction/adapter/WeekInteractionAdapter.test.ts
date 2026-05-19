import { createWeekInteractionAdapter } from "./WeekInteractionAdapter";
import { describe, expect, it } from "bun:test";

const pointerEvent = () =>
  new PointerEvent("pointerdown", {
    button: 0,
    isPrimary: true,
    pointerId: 1,
  });

describe("WeekInteractionAdapter", () => {
  it("refuses pointer ownership when no Week event target is registered", () => {
    const adapter = createWeekInteractionAdapter();

    expect(adapter.handlePointerDown(pointerEvent())).toEqual({
      reason: "no-week-interaction-target",
      shouldOwn: false,
    });
  });
});

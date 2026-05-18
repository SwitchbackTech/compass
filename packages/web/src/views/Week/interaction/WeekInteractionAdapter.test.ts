import { WeekInteractionAdapter } from "./WeekInteractionAdapter";
import { describe, expect, it } from "bun:test";

const pointerEvent = () => new PointerEvent("pointerdown", { pointerId: 1 });

describe("WeekInteractionAdapter", () => {
  it("refuses pointer ownership in passive mode", () => {
    const adapter = new WeekInteractionAdapter({ mode: "passive" });

    expect(adapter.handlePointerDown(pointerEvent())).toEqual({
      reason: "passive-week-adapter",
      shouldOwn: false,
    });
  });
});

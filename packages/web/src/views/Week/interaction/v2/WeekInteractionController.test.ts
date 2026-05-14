import { WeekInteractionController } from "./WeekInteractionController";
import { describe, expect, it } from "bun:test";

describe("WeekInteractionController", () => {
  it("refuses pointer ownership while passive", () => {
    const controller = new WeekInteractionController();

    expect(controller.canOwnPointerDown()).toBe(false);
  });
});

import { render, screen } from "@testing-library/react";
import { WeekInteractionBoundary } from "./WeekInteractionBoundary";
import { WeekInteractionController } from "./WeekInteractionController";
import { describe, expect, it, mock } from "bun:test";

describe("WeekInteractionBoundary", () => {
  it("calls the controller on pointerdown without blocking legacy behavior when passive", () => {
    const controller = new WeekInteractionController();
    const handlePointerDown = mock(() => false);
    controller.handlePointerDown = handlePointerDown;

    render(
      <WeekInteractionBoundary controller={controller}>
        <button type="button">Existing event</button>
      </WeekInteractionBoundary>,
    );

    const event = new MouseEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    });
    screen.getByRole("button", { name: "Existing event" }).dispatchEvent(event);

    expect(handlePointerDown).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });
});

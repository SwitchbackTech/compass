import { render, screen } from "@testing-library/react";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { WeekInteractionBoundary } from "./WeekInteractionBoundary";
import { WeekInteractionController } from "./WeekInteractionController";
import { type WeekInteractionPointerUpResult } from "./WeekInteractionSession";
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

  it("opens unchanged clicks through the commit adapter", () => {
    const event = { _id: "event-1" } as Schema_GridEvent;
    const pointerUpResult = {
      event,
      eventId: "event-1",
      type: "click",
    } satisfies WeekInteractionPointerUpResult;
    const controller = new WeekInteractionController();
    controller.handlePointerDown = mock(() => true);
    controller.isHandlingPointer = mock(() => true);
    controller.handlePointerUp = mock(() => pointerUpResult);
    const openExistingEvent = mock();

    render(
      <WeekInteractionBoundary
        commitAdapter={{
          openExistingEvent,
          submitMovedEvent: mock(),
        }}
        controller={controller}
      >
        <button type="button">Existing event</button>
      </WeekInteractionBoundary>,
    );

    screen
      .getByRole("button", { name: "Existing event" })
      .dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
      );
    window.dispatchEvent(
      new MouseEvent("pointerup", { bubbles: true, cancelable: true }),
    );

    expect(openExistingEvent).toHaveBeenCalledWith(event);
  });

  it("submits moved timed drag results through the commit adapter", () => {
    const event = { _id: "event-1" } as Schema_GridEvent;
    const pointerUpResult = {
      event,
      eventId: "event-1",
      hasMoved: true,
      type: "timedDragEnd",
    } satisfies WeekInteractionPointerUpResult;
    const controller = new WeekInteractionController();
    controller.handlePointerDown = mock(() => true);
    controller.isHandlingPointer = mock(() => true);
    controller.handlePointerUp = mock(() => pointerUpResult);
    const submitMovedEvent = mock();

    render(
      <WeekInteractionBoundary
        commitAdapter={{
          openExistingEvent: mock(),
          submitMovedEvent,
        }}
        controller={controller}
      >
        <button type="button">Existing event</button>
      </WeekInteractionBoundary>,
    );

    screen
      .getByRole("button", { name: "Existing event" })
      .dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
      );
    window.dispatchEvent(
      new MouseEvent("pointerup", { bubbles: true, cancelable: true }),
    );

    expect(submitMovedEvent).toHaveBeenCalledWith(event, {
      hadFormOpenBeforeInteraction: false,
    });
  });
});

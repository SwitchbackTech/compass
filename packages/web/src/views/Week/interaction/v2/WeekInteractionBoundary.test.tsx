import { render, screen } from "@testing-library/react";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  createWeekInteractionCommitAdapter,
  WeekInteractionBoundary,
} from "./WeekInteractionBoundary";
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
      formEventIdAtPointerDown: null,
      hadFormOpenBeforeInteraction: false,
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

  it("closes an already-open form when V2 drag motion activates", () => {
    const controller = new WeekInteractionController();
    controller.handlePointerDown = mock(() => true);
    controller.isHandlingPointer = mock(() => true);
    controller.getSession = mock()
      .mockReturnValueOnce({
        eventId: "event-1",
        formEventIdAtPointerDown: "event-1",
        formOpenAtPointerDown: true,
        phase: "pending",
        pointerId: 1,
      })
      .mockReturnValueOnce({
        eventId: "event-1",
        formEventIdAtPointerDown: "event-1",
        formOpenAtPointerDown: true,
        phase: "motion",
        pointerId: 1,
      }) as WeekInteractionController["getSession"];
    controller.handlePointerMove = mock();
    const closeFormForInteraction = mock();

    render(
      <WeekInteractionBoundary
        commitAdapter={{
          closeFormForInteraction,
          openExistingEvent: mock(),
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
      new MouseEvent("pointermove", { bubbles: true, cancelable: true }),
    );

    expect(closeFormForInteraction).toHaveBeenCalledTimes(1);
  });

  it("keeps form-open moved drags out of the immediate save path", () => {
    const event = { _id: "event-1" } as Schema_GridEvent;
    const pointerUpResult = {
      event,
      eventId: "event-1",
      formEventIdAtPointerDown: "event-1",
      hadFormOpenBeforeInteraction: true,
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
      hadFormOpenBeforeInteraction: true,
    });
  });

  it("routes recurring moved events to the existing recurrence scope flow", () => {
    const event = {
      _id: "event-1",
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
    } as Schema_GridEvent;
    const requestUpdateScopeForDraft = mock();
    const submit = mock();
    const adapter = createWeekInteractionCommitAdapter({
      closeForm: mock(),
      dispatchStart: mock(),
      requestUpdateScopeForDraft,
      setDraft: mock(),
      setIsFormOpen: mock(),
      submit,
    });

    adapter.submitMovedEvent(event, { hadFormOpenBeforeInteraction: false });

    expect(requestUpdateScopeForDraft).toHaveBeenCalledWith(event);
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits non-recurring moved events without opening recurrence scope", () => {
    const event = { _id: "event-1" } as Schema_GridEvent;
    const requestUpdateScopeForDraft = mock();
    const submit = mock();
    const adapter = createWeekInteractionCommitAdapter({
      closeForm: mock(),
      dispatchStart: mock(),
      requestUpdateScopeForDraft,
      setDraft: mock(),
      setIsFormOpen: mock(),
      submit,
    });

    adapter.submitMovedEvent(event, { hadFormOpenBeforeInteraction: false });

    expect(submit).toHaveBeenCalledWith(event);
    expect(requestUpdateScopeForDraft).not.toHaveBeenCalled();
  });
});

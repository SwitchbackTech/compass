import { fireEvent, render, screen } from "@testing-library/react";
import { type PointerEvent as ReactPointerEvent } from "react";
import {
  CalendarInteractionPointerCaptureBoundary,
  type CalendarPointerCaptureAdapter,
} from "./CalendarInteractionPointerCaptureBoundary";
import { describe, expect, it, mock } from "bun:test";

const createOwningAdapter = (): CalendarPointerCaptureAdapter => {
  return {
    ...createNonOwningAdapter(),
    handlePointerDown: () => ({
      reason: "test-owner",
      shouldOwn: true,
    }),
  };
};

const createCancellationAwareAdapter = () => {
  const disconnectCancellationEvents = mock();

  return {
    ...createNonOwningAdapter(),
    cancel: mock(),
    connectCancellationEvents: mock(() => disconnectCancellationEvents),
    disconnectCancellationEvents,
  };
};

const createNonOwningAdapter = (): CalendarPointerCaptureAdapter => ({
  cancel: () => undefined,
  connectCancellationEvents: () => () => undefined,
  handlePointerCancel: () => false,
  handlePointerDown: () => ({
    reason: "test-non-owner",
    shouldOwn: false,
  }),
  handlePointerMove: () => false,
  handlePointerUp: () => false,
});

describe("CalendarInteractionPointerCaptureBoundary", () => {
  it("does not block child pointer handlers when the adapter declines ownership", () => {
    const adapter = createNonOwningAdapter();
    const onPointerDown = mock(
      (event: ReactPointerEvent<HTMLButtonElement>) => {
        expect(event.defaultPrevented).toBe(false);
      },
    );

    render(
      <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
        <button onPointerDown={onPointerDown} type="button">
          event
        </button>
      </CalendarInteractionPointerCaptureBoundary>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "event" }));

    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });

  it("can stop propagation once an adapter owns a pointerdown", () => {
    const adapter = createOwningAdapter();
    const onPointerDown = mock();

    render(
      <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
        <button onPointerDown={onPointerDown} type="button">
          event
        </button>
      </CalendarInteractionPointerCaptureBoundary>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "event" }));

    expect(onPointerDown).not.toHaveBeenCalled();
  });

  it("captures an owned pointer and forwards window-level continuation events", () => {
    const adapter: CalendarPointerCaptureAdapter = {
      ...createOwningAdapter(),
      handlePointerMove: mock(() => true),
      handlePointerUp: mock(() => true),
    };

    render(
      <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
        <button type="button">event</button>
      </CalendarInteractionPointerCaptureBoundary>,
    );

    const eventButton = screen.getByRole("button", { name: "event" });
    const boundary = eventButton.parentElement as HTMLDivElement;
    boundary.setPointerCapture = mock();
    boundary.releasePointerCapture = mock();

    fireEvent.pointerDown(eventButton, { pointerId: 42 });
    fireEvent.pointerMove(window, { pointerId: 42 });
    fireEvent.pointerUp(window, { pointerId: 42 });
    fireEvent.pointerMove(window, { pointerId: 42 });

    expect(boundary.setPointerCapture).toHaveBeenCalledWith(42);
    expect(adapter.handlePointerMove).toHaveBeenCalledTimes(1);
    expect(adapter.handlePointerUp).toHaveBeenCalledTimes(1);
    expect(boundary.releasePointerCapture).toHaveBeenCalledWith(42);
  });

  it("stops child pointer continuation handlers once the adapter consumes them", () => {
    const adapter: CalendarPointerCaptureAdapter = {
      ...createNonOwningAdapter(),
      handlePointerCancel: mock(() => true),
      handlePointerMove: mock(() => true),
      handlePointerUp: mock(() => true),
    };
    const onPointerCancel = mock();
    const onPointerMove = mock();
    const onPointerUp = mock();

    render(
      <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
        <button
          onPointerCancel={onPointerCancel}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          type="button"
        >
          event
        </button>
      </CalendarInteractionPointerCaptureBoundary>,
    );

    const eventButton = screen.getByRole("button", { name: "event" });

    fireEvent.pointerMove(eventButton);
    fireEvent.pointerUp(eventButton);
    fireEvent.pointerCancel(eventButton);

    expect(adapter.handlePointerMove).toHaveBeenCalledTimes(1);
    expect(adapter.handlePointerUp).toHaveBeenCalledTimes(1);
    expect(adapter.handlePointerCancel).toHaveBeenCalledTimes(1);
    expect(onPointerMove).not.toHaveBeenCalled();
    expect(onPointerUp).not.toHaveBeenCalled();
    expect(onPointerCancel).not.toHaveBeenCalled();
  });

  it("connects global cancellation events while mounted and disconnects them on unmount", () => {
    const adapter = createCancellationAwareAdapter();

    const { unmount } = render(
      <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
        <button type="button">event</button>
      </CalendarInteractionPointerCaptureBoundary>,
    );

    expect(adapter.connectCancellationEvents).toHaveBeenCalledTimes(1);
    expect(adapter.disconnectCancellationEvents).not.toHaveBeenCalled();

    unmount();

    expect(adapter.disconnectCancellationEvents).toHaveBeenCalledTimes(1);
  });

  it("cancels any active interaction when unmounted", () => {
    const adapter = createCancellationAwareAdapter();

    const { unmount } = render(
      <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
        <button type="button">event</button>
      </CalendarInteractionPointerCaptureBoundary>,
    );

    expect(adapter.cancel).not.toHaveBeenCalled();

    unmount();

    expect(adapter.cancel).toHaveBeenCalledTimes(1);
  });
});

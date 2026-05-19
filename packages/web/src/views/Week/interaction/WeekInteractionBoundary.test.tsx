import { fireEvent, render, screen } from "@testing-library/react";
import { type PointerEvent as ReactPointerEvent } from "react";
import { type WeekInteractionAdapter } from "./adapter/WeekInteractionAdapter";
import { WeekInteractionBoundary } from "./WeekInteractionBoundary";
import { describe, expect, it, mock } from "bun:test";

const createOwningWeekInteractionAdapter = (): WeekInteractionAdapter => {
  return {
    ...createNonOwningWeekInteractionAdapter(),
    handlePointerDown: () => ({
      reason: "test-owner",
      shouldOwn: true,
    }),
  };
};

const createCancellationAwareWeekInteractionAdapter = () => {
  const disconnectCancellationEvents = mock();

  return {
    ...createNonOwningWeekInteractionAdapter(),
    cancel: mock(),
    connectCancellationEvents: mock(() => disconnectCancellationEvents),
    disconnectCancellationEvents,
  };
};

const createNonOwningWeekInteractionAdapter = (): WeekInteractionAdapter => ({
  cancel: () => undefined,
  connectCancellationEvents: () => () => undefined,
  handlePointerCancel: () => false,
  handlePointerDown: () => ({
    reason: "test-non-owner",
    shouldOwn: false,
  }),
  handlePointerMove: () => false,
  handlePointerUp: () => false,
  ownsPointer: () => false,
  rebuildLayoutAfterNavigation: () => undefined,
});

describe("WeekInteractionBoundary", () => {
  it("does not block child pointer handlers when the adapter declines ownership", () => {
    const adapter = createNonOwningWeekInteractionAdapter();
    const onPointerDown = mock(
      (event: ReactPointerEvent<HTMLButtonElement>) => {
        expect(event.defaultPrevented).toBe(false);
      },
    );

    render(
      <WeekInteractionBoundary adapter={adapter}>
        <button onPointerDown={onPointerDown} type="button">
          event
        </button>
      </WeekInteractionBoundary>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "event" }));

    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });

  it("can stop propagation once a future adapter owns a pointerdown", () => {
    const adapter = createOwningWeekInteractionAdapter();
    const onPointerDown = mock();

    render(
      <WeekInteractionBoundary adapter={adapter}>
        <button onPointerDown={onPointerDown} type="button">
          event
        </button>
      </WeekInteractionBoundary>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "event" }));

    expect(onPointerDown).not.toHaveBeenCalled();
  });

  it("connects global cancellation events while mounted and disconnects them on unmount", () => {
    const adapter = createCancellationAwareWeekInteractionAdapter();

    const { unmount } = render(
      <WeekInteractionBoundary adapter={adapter}>
        <button type="button">event</button>
      </WeekInteractionBoundary>,
    );

    expect(adapter.connectCancellationEvents).toHaveBeenCalledTimes(1);
    expect(adapter.disconnectCancellationEvents).not.toHaveBeenCalled();

    unmount();

    expect(adapter.disconnectCancellationEvents).toHaveBeenCalledTimes(1);
  });

  it("cancels any active interaction when unmounted", () => {
    const adapter = createCancellationAwareWeekInteractionAdapter();

    const { unmount } = render(
      <WeekInteractionBoundary adapter={adapter}>
        <button type="button">event</button>
      </WeekInteractionBoundary>,
    );

    expect(adapter.cancel).not.toHaveBeenCalled();

    unmount();

    expect(adapter.cancel).toHaveBeenCalledTimes(1);
  });
});

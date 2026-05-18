import { fireEvent, render, screen } from "@testing-library/react";
import { type PointerEvent as ReactPointerEvent } from "react";
import { WeekInteractionAdapter } from "./WeekInteractionAdapter";
import { WeekInteractionBoundary } from "./WeekInteractionBoundary";
import { describe, expect, it, mock } from "bun:test";

class OwningWeekInteractionAdapter extends WeekInteractionAdapter {
  override handlePointerDown(event: PointerEvent) {
    super.handlePointerDown(event);

    return {
      reason: "test-owner",
      shouldOwn: true,
    };
  }
}

class CancellationAwareWeekInteractionAdapter extends WeekInteractionAdapter {
  disconnectCancellationEvents = mock();
  connectCancellationEvents = mock(() => this.disconnectCancellationEvents);
}

describe("WeekInteractionBoundary", () => {
  it("does not block child pointer handlers in passive mode", () => {
    const adapter = new WeekInteractionAdapter({ mode: "passive" });
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
    const adapter = new OwningWeekInteractionAdapter();
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
    const adapter = new CancellationAwareWeekInteractionAdapter();

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
});

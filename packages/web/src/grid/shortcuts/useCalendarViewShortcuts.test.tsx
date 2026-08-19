import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { useCalendarViewShortcuts } from "./useCalendarViewShortcuts";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const wrapper = ({ children }: PropsWithChildren) => (
  <HotkeysProvider>{children}</HotkeysProvider>
);

beforeEach(() => {
  HotkeyManager.resetInstance();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("useCalendarViewShortcuts", () => {
  it("invokes owner callbacks for navigation and create keys", () => {
    const onPrevPeriod = mock();
    const onNextPeriod = mock();
    const onCreateTimedEvent = mock();
    const onCreateAllDayEvent = mock();

    renderHook(
      () =>
        useCalendarViewShortcuts({
          onPrevPeriod,
          onNextPeriod,
          onCreateTimedEvent,
          onCreateAllDayEvent,
        }),
      { wrapper },
    );

    pressKey("j");
    pressKey("k");
    pressKey("c");
    pressKey("a");

    expect(onPrevPeriod).toHaveBeenCalledTimes(1);
    expect(onNextPeriod).toHaveBeenCalledTimes(1);
    expect(onCreateTimedEvent).toHaveBeenCalledTimes(1);
    expect(onCreateAllDayEvent).toHaveBeenCalledTimes(1);
  });

  it("creates a timed event with C", async () => {
    const onCreateTimedEvent = mock();

    renderHook(() => useCalendarViewShortcuts({ onCreateTimedEvent }), {
      wrapper,
    });
    pressKey("C");

    await waitFor(() => {
      expect(onCreateTimedEvent).toHaveBeenCalled();
    });
  });

  it("does not create an all-day event when typing in an input", async () => {
    const onCreateAllDayEvent = mock();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useCalendarViewShortcuts({ onCreateAllDayEvent }), {
      wrapper,
    });
    pressKey("A", {}, input);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onCreateAllDayEvent).not.toHaveBeenCalled();
  });

  it("routes Shift+J/K to the window-shift handlers when the view provides them", () => {
    const onShiftViewBackward = mock();
    const onShiftViewForward = mock();

    renderHook(
      () =>
        useCalendarViewShortcuts({ onShiftViewBackward, onShiftViewForward }),
      { wrapper },
    );

    pressKey("J", {
      keyDownInit: { shiftKey: true },
      keyUpInit: { shiftKey: true },
    });
    pressKey("K", {
      keyDownInit: { shiftKey: true },
      keyUpInit: { shiftKey: true },
    });

    expect(onShiftViewBackward).toHaveBeenCalledTimes(1);
    expect(onShiftViewForward).toHaveBeenCalledTimes(1);
  });
});

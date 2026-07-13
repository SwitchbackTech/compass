import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { useDayViewShortcuts } from "./useDayViewShortcuts";
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

describe("useDayViewShortcuts create", () => {
  it("creates a timed event with C", async () => {
    const onCreateTimedEvent = mock();

    renderHook(() => useDayViewShortcuts({ onCreateTimedEvent }), { wrapper });
    pressKey("C");

    await waitFor(() => {
      expect(onCreateTimedEvent).toHaveBeenCalled();
    });
  });

  it("creates an all-day event with A", async () => {
    const onCreateAllDayEvent = mock();

    renderHook(() => useDayViewShortcuts({ onCreateAllDayEvent }), {
      wrapper,
    });
    pressKey("A");

    await waitFor(() => {
      expect(onCreateAllDayEvent).toHaveBeenCalled();
    });
  });

  it("does not create an all-day event when typing in an input", async () => {
    const onCreateAllDayEvent = mock();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useDayViewShortcuts({ onCreateAllDayEvent }), {
      wrapper,
    });
    pressKey("A", {}, input);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onCreateAllDayEvent).not.toHaveBeenCalled();
  });
});

describe("useDayViewShortcuts focus", () => {
  it("focuses the sidebar with U", async () => {
    const onFocusSidebar = mock();

    renderHook(() => useDayViewShortcuts({ onFocusSidebar }), { wrapper });
    pressKey("U");

    await waitFor(() => {
      expect(onFocusSidebar).toHaveBeenCalled();
    });
  });
});

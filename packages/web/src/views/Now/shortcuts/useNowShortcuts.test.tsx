import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { MemoryRouter } from "react-router-dom";
import {
  CompassDOMEvents,
  compassEventEmitter,
  pressKey,
} from "@web/common/utils/dom/event-emitter.util";
import { useNowShortcuts } from "./useNowShortcuts";
import { beforeEach, describe, expect, it, mock } from "bun:test";

function wrapper({ children }: PropsWithChildren) {
  return (
    <HotkeysProvider>
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        {children}
      </MemoryRouter>
    </HotkeysProvider>
  );
}

describe("useNowShortcuts", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    compassEventEmitter.removeAllListeners(
      CompassDOMEvents.FOCUS_TASK_DESCRIPTION,
    );
  });

  it("uses E to focus the task description", async () => {
    const onFocusDescription = mock();
    compassEventEmitter.on(
      CompassDOMEvents.FOCUS_TASK_DESCRIPTION,
      onFocusDescription,
    );
    renderHook(() => useNowShortcuts(), { wrapper });

    pressKey("e");

    await waitFor(() => {
      expect(onFocusDescription).toHaveBeenCalledTimes(1);
    });
  });

  it("does not use D for the task description shortcut", async () => {
    const onFocusDescription = mock();
    compassEventEmitter.on(
      CompassDOMEvents.FOCUS_TASK_DESCRIPTION,
      onFocusDescription,
    );
    renderHook(() => useNowShortcuts(), { wrapper });

    pressKey("d");

    await waitFor(() => {
      expect(onFocusDescription).not.toHaveBeenCalled();
    });
  });

  it("toggles the sidebar with [", async () => {
    const onToggleSidebar = mock();
    renderHook(() => useNowShortcuts({ onToggleSidebar }), { wrapper });

    pressKey("[");

    await waitFor(() => {
      expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    });
  });
});

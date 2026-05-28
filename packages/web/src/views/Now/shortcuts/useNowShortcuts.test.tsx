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

  it("uses E D sequence to focus the task description", async () => {
    const onFocusDescription = mock();
    compassEventEmitter.on(
      CompassDOMEvents.FOCUS_TASK_DESCRIPTION,
      onFocusDescription,
    );
    renderHook(() => useNowShortcuts(), { wrapper });

    pressKey("e");
    pressKey("d");

    await waitFor(() => {
      expect(onFocusDescription).toHaveBeenCalledTimes(1);
    });
  });

  it("does not focus description when pressing D alone", async () => {
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

  it("navigates to day view when Escape is pressed outside an input", async () => {
    const onEscape = mock();
    renderHook(() => useNowShortcuts({ onEscape }), { wrapper });

    pressKey("Escape");

    await waitFor(() => {
      expect(onEscape).toHaveBeenCalledTimes(1);
    });
  });

  it("navigates to today when T is pressed", async () => {
    const onGoToToday = mock();
    renderHook(() => useNowShortcuts({ onGoToToday }), { wrapper });

    pressKey("t");

    await waitFor(() => {
      expect(onGoToToday).toHaveBeenCalledTimes(1);
    });
  });

  it("does not navigate when Escape is pressed inside a textarea", async () => {
    const onEscape = mock();
    renderHook(() => useNowShortcuts({ onEscape }), { wrapper });

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    try {
      textarea.focus();

      pressKey("Escape", {}, textarea);

      await waitFor(() => {
        expect(onEscape).not.toHaveBeenCalled();
      });
    } finally {
      document.body.removeChild(textarea);
    }
  });

  it("uses E R sequence to edit reminder", async () => {
    const onEditReminder = mock();
    renderHook(() => useNowShortcuts({ onEditReminder }), { wrapper });

    pressKey("e");
    pressKey("r");

    await waitFor(() => {
      expect(onEditReminder).toHaveBeenCalledTimes(1);
    });
  });

  it("does not edit reminder when pressing E alone", async () => {
    const onEditReminder = mock();
    renderHook(() => useNowShortcuts({ onEditReminder }), { wrapper });

    pressKey("e");

    await waitFor(() => {
      expect(onEditReminder).not.toHaveBeenCalled();
    });
  });
});

import { act, createElement } from "react";
import { useNavigate } from "react-router-dom";
import { HotkeyManager } from "@tanstack/react-hotkeys";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { EDIT_MODE_TIMEOUT_MS } from "@web/hotkeys/hooks/useEditMode";
import { EditModeProvider } from "@web/hotkeys/providers/EditModeProvider";
import { useNowShortcuts } from "@web/views/Now/shortcuts/useNowShortcuts";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();
const EditModeWrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(EditModeProvider, null, children);

describe("useNowShortcuts", () => {
  const mockTask1 = createMockTask();
  const mockTask2 = createMockTask();

  beforeEach(() => {
    jest.clearAllMocks();
    HotkeyManager.resetInstance();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe("global navigation shortcuts", () => {
    it("should navigate to Day when 'Escape' is pressed", async () => {
      renderHook(useNowShortcuts, { wrapper: EditModeWrapper });

      pressKey("Escape");

      expect(mockNavigate).toHaveBeenCalledWith("/day");
    });

    it("should not handle unknown keys", async () => {
      renderHook(useNowShortcuts, { wrapper: EditModeWrapper });

      pressKey("x");

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("task navigation shortcuts", () => {
    const defaultProps = {
      focusedTask: mockTask1,
      availableTasks: [mockTask1, mockTask2],
      onPreviousTask: jest.fn(),
      onNextTask: jest.fn(),
      onCompleteTask: jest.fn(),
    };

    it("should call onPreviousTask when 'j' is pressed", () => {
      renderHook(() => useNowShortcuts(defaultProps), {
        wrapper: EditModeWrapper,
      });

      pressKey("j");

      expect(defaultProps.onPreviousTask).toHaveBeenCalled();
    });

    it("should call onNextTask when 'k' is pressed", () => {
      renderHook(() => useNowShortcuts(defaultProps), {
        wrapper: EditModeWrapper,
      });

      pressKey("k");

      expect(defaultProps.onNextTask).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'j'", () => {
      renderHook(() => useNowShortcuts(defaultProps), {
        wrapper: EditModeWrapper,
      });

      pressKey("J");

      expect(defaultProps.onPreviousTask).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'k'", () => {
      renderHook(() => useNowShortcuts(defaultProps), {
        wrapper: EditModeWrapper,
      });

      pressKey("K");

      expect(defaultProps.onNextTask).toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there is no focused task", () => {
      const props = { ...defaultProps, focusedTask: null };

      renderHook(() => useNowShortcuts(props), { wrapper: EditModeWrapper });

      pressKey("j");

      expect(props.onPreviousTask).not.toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there are no available tasks", () => {
      const props = { ...defaultProps, availableTasks: [] };

      renderHook(() => useNowShortcuts(props), { wrapper: EditModeWrapper });

      pressKey("k");

      expect(props.onNextTask).not.toHaveBeenCalled();
    });

    it("should handle task shortcuts when focusedTask exists and availableTasks has items", () => {
      renderHook(() => useNowShortcuts(defaultProps), {
        wrapper: EditModeWrapper,
      });

      pressKey("j");

      expect(defaultProps.onPreviousTask).toHaveBeenCalled();
    });

    it("should call onCompleteTask when 'Enter' is pressed", () => {
      renderHook(() => useNowShortcuts(defaultProps), {
        wrapper: EditModeWrapper,
      });

      pressKey("Enter");

      expect(defaultProps.onCompleteTask).toHaveBeenCalled();
    });

    it("should not handle Enter shortcut when there is no focused task", () => {
      const props = { ...defaultProps, focusedTask: null };

      renderHook(() => useNowShortcuts(props), { wrapper: EditModeWrapper });

      pressKey("Enter");

      expect(props.onCompleteTask).not.toHaveBeenCalled();
    });
  });

  describe("editable element handling", () => {
    const defaultProps = {
      focusedTask: mockTask1,
      availableTasks: [mockTask1, mockTask2],
      onPreviousTask: jest.fn(),
      onNextTask: jest.fn(),
      onCompleteTask: jest.fn(),
    };

    it("should not handle shortcuts when typing in input elements", () => {
      renderHook(() => useNowShortcuts(defaultProps), {
        wrapper: EditModeWrapper,
      });

      const input = document.createElement("input");

      document.body.appendChild(input);

      input.focus();

      pressKey("j", {}, input);

      expect(defaultProps.onPreviousTask).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in textarea elements", () => {
      renderHook(() => useNowShortcuts(defaultProps), {
        wrapper: EditModeWrapper,
      });

      const textarea = document.createElement("textarea");

      document.body.appendChild(textarea);

      textarea.focus();

      pressKey("k", {}, textarea);

      expect(defaultProps.onNextTask).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in contenteditable elements", () => {
      renderHook(() => useNowShortcuts(defaultProps), {
        wrapper: EditModeWrapper,
      });

      const div = document.createElement("div");

      div.setAttribute("contenteditable", "true");
      Object.defineProperty(div, "isContentEditable", { value: true });

      document.body.appendChild(div);

      div.focus();

      pressKey("j", {}, div);

      expect(defaultProps.onPreviousTask).not.toHaveBeenCalled();
    });
  });

  describe("edit mode shortcuts", () => {
    it("should not focus description when 'd' is pressed alone", () => {
      const emitSpy = jest.spyOn(compassEventEmitter, "emit");

      renderHook(useNowShortcuts, { wrapper: EditModeWrapper });

      act(() => {
        pressKey("d");
      });

      expect(emitSpy).not.toHaveBeenCalledWith(
        CompassDOMEvents.FOCUS_TASK_DESCRIPTION,
      );
    });

    it("should focus description when 'e' then 'd' is pressed", () => {
      const emitSpy = jest.spyOn(compassEventEmitter, "emit");

      renderHook(useNowShortcuts, { wrapper: EditModeWrapper });

      act(() => {
        pressKey("e");
      });

      act(() => {
        pressKey("d");
      });

      expect(emitSpy).toHaveBeenCalledWith(
        CompassDOMEvents.FOCUS_TASK_DESCRIPTION,
      );
    });

    it("should clear edit mode after focusing description", () => {
      const emitSpy = jest.spyOn(compassEventEmitter, "emit");

      renderHook(useNowShortcuts, { wrapper: EditModeWrapper });

      act(() => {
        pressKey("e");
      });

      act(() => {
        pressKey("d");
      });

      emitSpy.mockClear();

      act(() => {
        pressKey("d");
      });

      expect(emitSpy).not.toHaveBeenCalledWith(
        CompassDOMEvents.FOCUS_TASK_DESCRIPTION,
      );
    });

    it("should exit edit mode after the timeout", () => {
      jest.useFakeTimers();
      const emitSpy = jest.spyOn(compassEventEmitter, "emit");

      renderHook(useNowShortcuts, { wrapper: EditModeWrapper });

      act(() => {
        pressKey("e");
        jest.advanceTimersByTime(EDIT_MODE_TIMEOUT_MS);
      });

      act(() => {
        pressKey("d");
      });

      expect(emitSpy).not.toHaveBeenCalledWith(
        CompassDOMEvents.FOCUS_TASK_DESCRIPTION,
      );
    });
  });
});

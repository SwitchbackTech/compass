import { renderHook } from "@testing-library/react";
import {
  KeyboardShortcutsConfig,
  useTodayViewShortcuts,
} from "./useTodayViewShortcuts";

describe("useKeyboardShortcuts", () => {
  let mockConfig: KeyboardShortcutsConfig;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    mockConfig = {
      onAddTask: jest.fn(),
      onEditTask: jest.fn(),
      onCompleteTask: jest.fn(),
      onFocusTasks: jest.fn(),
      onPrevTask: jest.fn(),
      onEscape: jest.fn(),
      isAddingTask: false,
      isEditingTask: false,
      hasFocusedTask: false,
      isInInput: false,
    };

    addEventListenerSpy = jest.spyOn(window, "addEventListener");
    removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should add keydown event listener on mount", () => {
    renderHook(() => useTodayViewShortcuts(mockConfig));
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should remove keydown event listener on unmount", () => {
    const { unmount } = renderHook(() => useTodayViewShortcuts(mockConfig));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should call onAddTask when 't' is pressed", () => {
    renderHook(() => useTodayViewShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "t" });
    window.dispatchEvent(event);

    expect(mockConfig.onAddTask).toHaveBeenCalled();
  });

  it("should not call onAddTask when already adding a task", () => {
    mockConfig.isAddingTask = true;
    renderHook(() => useTodayViewShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "t" });
    window.dispatchEvent(event);

    expect(mockConfig.onAddTask).not.toHaveBeenCalled();
  });

  it("should call onCompleteTask when Enter is pressed with focused task", () => {
    mockConfig.hasFocusedTask = true;
    renderHook(() => useTodayViewShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "Enter" });
    window.dispatchEvent(event);

    expect(mockConfig.onCompleteTask).toHaveBeenCalled();
  });

  it("should not call onCompleteTask when editing task", () => {
    mockConfig.hasFocusedTask = true;
    mockConfig.isEditingTask = true;
    renderHook(() => useTodayViewShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "Enter" });
    window.dispatchEvent(event);

    expect(mockConfig.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should call onEscape when Escape is pressed", () => {
    renderHook(() => useTodayViewShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    window.dispatchEvent(event);

    expect(mockConfig.onEscape).toHaveBeenCalled();
  });

  it("should not intercept shortcuts when in input field", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useTodayViewShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "t", bubbles: true });
    input.dispatchEvent(event);

    expect(mockConfig.onAddTask).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("should handle Escape even when in input field", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useTodayViewShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    input.dispatchEvent(event);

    expect(mockConfig.onEscape).toHaveBeenCalled();

    document.body.removeChild(input);
  });
});

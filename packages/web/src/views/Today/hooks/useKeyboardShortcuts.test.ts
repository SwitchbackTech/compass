import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  let mockConfig: ReturnType<typeof jest.fn>;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    mockConfig = {
      onAddTask: jest.fn(),
      onEditTask: jest.fn(),
      onCompleteTask: jest.fn(),
      onFocusTasks: jest.fn(),
      onNextTask: jest.fn(),
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
    renderHook(() => useKeyboardShortcuts(mockConfig));
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should remove keydown event listener on unmount", () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(mockConfig));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should call onAddTask when 't' is pressed", () => {
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "t" });
    window.dispatchEvent(event);

    expect(mockConfig.onAddTask).toHaveBeenCalled();
  });

  it("should not call onAddTask when already adding a task", () => {
    mockConfig.isAddingTask = true;
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "t" });
    window.dispatchEvent(event);

    expect(mockConfig.onAddTask).not.toHaveBeenCalled();
  });

  it("should call onEditTask when 'e' is pressed and task is focused", () => {
    mockConfig.hasFocusedTask = true;
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "e" });
    window.dispatchEvent(event);

    expect(mockConfig.onEditTask).toHaveBeenCalled();
  });

  it("should not call onEditTask when no task is focused", () => {
    mockConfig.hasFocusedTask = false;
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "e" });
    window.dispatchEvent(event);

    expect(mockConfig.onEditTask).not.toHaveBeenCalled();
  });

  it("should call onFocusTasks when 'u' is pressed", () => {
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "u" });
    window.dispatchEvent(event);

    expect(mockConfig.onFocusTasks).toHaveBeenCalled();
  });

  it("should call onNextTask when 'j' is pressed with focused task", () => {
    mockConfig.hasFocusedTask = true;
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "j" });
    window.dispatchEvent(event);

    expect(mockConfig.onNextTask).toHaveBeenCalled();
  });

  it("should call onPrevTask when 'k' is pressed with focused task", () => {
    mockConfig.hasFocusedTask = true;
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "k" });
    window.dispatchEvent(event);

    expect(mockConfig.onPrevTask).toHaveBeenCalled();
  });

  it("should not call onNextTask when editing task", () => {
    mockConfig.hasFocusedTask = true;
    mockConfig.isEditingTask = true;
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "j" });
    window.dispatchEvent(event);

    expect(mockConfig.onNextTask).not.toHaveBeenCalled();
  });

  it("should call onCompleteTask when Enter is pressed with focused task", () => {
    mockConfig.hasFocusedTask = true;
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "Enter" });
    window.dispatchEvent(event);

    expect(mockConfig.onCompleteTask).toHaveBeenCalled();
  });

  it("should not call onCompleteTask when editing task", () => {
    mockConfig.hasFocusedTask = true;
    mockConfig.isEditingTask = true;
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "Enter" });
    window.dispatchEvent(event);

    expect(mockConfig.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should call onEscape when Escape is pressed", () => {
    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    window.dispatchEvent(event);

    expect(mockConfig.onEscape).toHaveBeenCalled();
  });

  it("should not intercept shortcuts when in input field", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", { key: "t", bubbles: true });
    input.dispatchEvent(event);

    expect(mockConfig.onAddTask).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("should handle Escape even when in input field", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts(mockConfig));

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    input.dispatchEvent(event);

    expect(mockConfig.onEscape).toHaveBeenCalled();

    document.body.removeChild(input);
  });
});

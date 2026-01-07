import { fireEvent } from "@testing-library/react";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { useKeyboardEvent } from "@web/common/hooks/useKeyboardEvent";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";

// Mock isEditable
jest.mock("@web/views/Day/util/day.shortcut.util", () => ({
  isEditable: jest.fn(),
}));

const mockIsEditable = jest.requireMock(
  "@web/views/Day/util/day.shortcut.util",
).isEditable;

describe("useKeyboardEvent", () => {
  const mockHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEditable.mockReturnValue(false);
  });

  it("should call handler when key combination matches (keyup default)", () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyUp(window, { key: "a" });

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("should call handler when key combination matches (keydown)", () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keydown",
      }),
    );

    fireEvent.keyDown(window, { key: "a" });

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("should not call handler when key combination does not match", () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    fireEvent.keyDown(window, { key: "b" });
    fireEvent.keyUp(window, { key: "b" });

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should handle multi-key combinations", () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: [getModifierKey(), "a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    fireEvent.keyDown(window, { key: getModifierKey() });
    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    fireEvent.keyUp(window, { key: "a", ctrlKey: true });

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("should respect exactMatch = true (default)", () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        exactMatch: true,
        eventType: "keyup",
      }),
    );

    fireEvent.keyDown(window, { key: "Shift" });
    fireEvent.keyDown(window, { key: "a", shiftKey: true });
    fireEvent.keyUp(window, { key: "a", shiftKey: true });

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should respect exactMatch = false", () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        exactMatch: false,
        eventType: "keyup",
      }),
    );

    // ... (comments)
  });

  it("should not call handler when editing if listenWhileEditing is false (default)", () => {
    mockIsEditable.mockReturnValue(true);

    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyUp(window, { key: "a" });

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should call handler when editing if listenWhileEditing is true", () => {
    mockIsEditable.mockReturnValue(true);

    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        listenWhileEditing: true,
        eventType: "keyup",
      }),
    );

    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyUp(window, { key: "a" });

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("should not call handler when the app is locked", () => {
    document.body.setAttribute("data-app-locked", "true");

    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyUp(window, { key: "a" });

    expect(mockHandler).not.toHaveBeenCalled();

    document.body.removeAttribute("data-app-locked");
  });
});

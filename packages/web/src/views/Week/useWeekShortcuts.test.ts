import { useNavigate } from "react-router-dom";
import { renderHook } from "@testing-library/react";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useWeekShortcuts } from "./useWeekShortcuts";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

// Mock the shortcut utility
jest.mock("../Day/util/shortcut.util", () => ({
  isEditable: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockIsEditable = jest.requireMock("../Day/util/shortcut.util").isEditable;

// Mock addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(window, "removeEventListener", {
  value: mockRemoveEventListener,
  writable: true,
});

describe("useWeekShortcuts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockIsEditable.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should add and remove event listeners on mount and unmount", () => {
    const { unmount } = renderHook(() => useWeekShortcuts());

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should navigate to NOW route when '1' key is pressed", () => {
    renderHook(() => useWeekShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "1",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.NOW);
  });

  it("should navigate to DAY route when '2' key is pressed", () => {
    renderHook(() => useWeekShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "2",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("should not handle navigation when target is editable", () => {
    mockIsEditable.mockReturnValue(true);
    renderHook(() => useWeekShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];

    // Test with '1' key
    const mockEvent1 = {
      key: "1",
      preventDefault: jest.fn(),
      target: document.createElement("input"),
    };

    keydownHandler(mockEvent1);

    expect(mockEvent1.preventDefault).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    // Test with '2' key
    const mockEvent2 = {
      key: "2",
      preventDefault: jest.fn(),
      target: document.createElement("textarea"),
    };

    keydownHandler(mockEvent2);

    expect(mockEvent2.preventDefault).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should not handle navigation for other keys", () => {
    renderHook(() => useWeekShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const otherKeys = ["3", "a", "Enter", "Escape", "Tab", "ArrowUp"];

    otherKeys.forEach((key) => {
      const mockEvent = {
        key,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("should handle null target gracefully", () => {
    renderHook(() => useWeekShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "1",
      preventDefault: jest.fn(),
      target: null,
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.NOW);
  });

  it("should call isEditable with the correct target", () => {
    renderHook(() => useWeekShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockTarget = document.createElement("div");
    const mockEvent = {
      key: "1",
      preventDefault: jest.fn(),
      target: mockTarget,
    };

    keydownHandler(mockEvent);

    expect(mockIsEditable).toHaveBeenCalledWith(mockTarget);
  });
});

import { useNavigate } from "react-router-dom";
import { renderHook } from "@testing-library/react";
import { useNowShortcuts } from "./useNowShortcuts";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

// Mock the shortcut utility
jest.mock("@web/views/Day/util/shortcut.util", () => ({
  isEditable: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockIsEditable = jest.requireMock(
  "@web/views/Day/util/shortcut.util",
).isEditable;

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

describe("useNowShortcuts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockIsEditable.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should add and remove event listeners on mount and unmount", () => {
    const { unmount } = renderHook(() => useNowShortcuts());

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

  it("should navigate to Now when '1' is pressed", () => {
    renderHook(() => useNowShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "1",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/now");
  });

  it("should navigate to Today when '2' is pressed", () => {
    renderHook(() => useNowShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "2",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/day");
  });

  it("should navigate to Week (root) when '3' is pressed", () => {
    renderHook(() => useNowShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "3",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should not handle unknown keys", () => {
    renderHook(() => useNowShortcuts());

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "x",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

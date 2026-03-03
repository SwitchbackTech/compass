import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { useKeyboardEvent } from "@web/common/hooks/useKeyboardEvent";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";

// Mock TanStack Hotkeys
jest.mock("@tanstack/react-hotkeys", () => ({
  useHotkeys: jest.fn(),
}));

const mockUseHotkeys = jest.requireMock("@tanstack/react-hotkeys").useHotkeys;

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

  it("should register hotkey with correct key combination (keyup default)", () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      "a",
      expect.any(Function),
      expect.objectContaining({
        keydown: false,
        keyup: true,
        enabled: true,
      }),
      expect.any(Array),
    );
  });

  it("should register hotkey with correct key combination (keydown)", () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keydown",
      }),
    );

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      "a",
      expect.any(Function),
      expect.objectContaining({
        keydown: true,
        keyup: false,
        enabled: true,
      }),
      expect.any(Array),
    );
  });

  it("should handle multi-key combinations", () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: [getModifierKey(), "a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    // getModifierKey() returns "Control" or "Meta", which normalizes to "ctrl" or "meta"
    const modifierKey = getModifierKey();
    const expectedKey = modifierKey === "Meta" ? "meta+a" : "ctrl+a";

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      expectedKey,
      expect.any(Function),
      expect.objectContaining({
        keydown: false,
        keyup: true,
        enabled: true,
      }),
      expect.any(Array),
    );
  });

  it("should call handler when hotkey is triggered and not editing", () => {
    mockIsEditable.mockReturnValue(false);

    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    // Get the registered handler
    const registeredHandler = mockUseHotkeys.mock.calls[0][1];
    const mockEvent = {
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    } as unknown as KeyboardEvent;

    registeredHandler(mockEvent);

    expect(mockHandler).toHaveBeenCalledWith(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should not call handler when editing if listenWhileEditing is false", () => {
    mockIsEditable.mockReturnValue(true);

    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        listenWhileEditing: false,
        eventType: "keyup",
      }),
    );

    // Get the registered handler
    const registeredHandler = mockUseHotkeys.mock.calls[0][1];
    const mockEvent = {
      preventDefault: jest.fn(),
      target: document.createElement("input"),
    } as unknown as KeyboardEvent;

    registeredHandler(mockEvent);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should call handler when editing if listenWhileEditing is true", () => {
    mockIsEditable.mockReturnValue(true);
    const mockBlur = jest.fn();

    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        listenWhileEditing: true,
        eventType: "keyup",
      }),
    );

    // Get the registered handler
    const registeredHandler = mockUseHotkeys.mock.calls[0][1];
    const mockElement = document.createElement("input");
    mockElement.blur = mockBlur;

    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
      configurable: true,
    });

    const mockEvent = {
      preventDefault: jest.fn(),
      target: mockElement,
    } as unknown as KeyboardEvent;

    registeredHandler(mockEvent);

    expect(mockHandler).toHaveBeenCalledWith(mockEvent);
    expect(mockBlur).toHaveBeenCalled();
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

    // Get the registered handler
    const registeredHandler = mockUseHotkeys.mock.calls[0][1];
    const mockEvent = {
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    } as unknown as KeyboardEvent;

    registeredHandler(mockEvent);

    expect(mockHandler).not.toHaveBeenCalled();

    document.body.removeAttribute("data-app-locked");
  });
});

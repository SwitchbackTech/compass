import { renderHook, waitFor } from "@web/__tests__/__mocks__/mock.render";
import { useKeyboardEvent } from "@web/common/hooks/useKeyboardEvent";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";

// Mock isEditable
jest.mock("@web/views/Day/util/day.shortcut.util", () => ({
  isEditable: jest.fn(),
}));

const mockIsEditable = jest.requireMock(
  "@web/views/Day/util/day.shortcut.util",
).isEditable;

/**
 * Helper function to dispatch a keyboard event to the document
 */
function dispatchKeyEvent(
  key: string,
  type: "keydown" | "keyup",
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
    composed: true,
    ...options,
  });
  document.dispatchEvent(event);
}

describe("useKeyboardEvent", () => {
  const mockHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEditable.mockReturnValue(false);
    document.body.removeAttribute("data-app-locked");
  });

  it("should call handler when key is pressed (keyup)", async () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    dispatchKeyEvent("a", "keydown");
    dispatchKeyEvent("a", "keyup");

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(expect.any(KeyboardEvent));
    });
  });

  it("should call handler when key is pressed (keydown)", async () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keydown",
      }),
    );

    dispatchKeyEvent("a", "keydown");

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("should not call handler when a different key is pressed", async () => {
    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    dispatchKeyEvent("b", "keydown");
    dispatchKeyEvent("b", "keyup");

    await waitFor(() => {
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  it("should handle multi-key combinations with modifier keys", async () => {
    const modifierKey = getModifierKey();
    const isCtrl = modifierKey === "Control";

    renderHook(() =>
      useKeyboardEvent({
        combination: [modifierKey, "a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    // Press modifier key first
    dispatchKeyEvent(modifierKey, "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });

    // Then press 'a' while holding modifier
    dispatchKeyEvent("a", "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });
    dispatchKeyEvent("a", "keyup", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  it("should not call handler when editing if listenWhileEditing is false", async () => {
    mockIsEditable.mockReturnValue(true);

    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        listenWhileEditing: false,
        eventType: "keyup",
      }),
    );

    dispatchKeyEvent("a", "keydown");
    dispatchKeyEvent("a", "keyup");

    await waitFor(() => {
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  it("should call handler and blur element when editing if listenWhileEditing is true", async () => {
    mockIsEditable.mockReturnValue(true);
    const mockBlur = jest.fn();
    const mockElement = document.createElement("input");
    mockElement.blur = mockBlur;

    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
      configurable: true,
    });

    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        listenWhileEditing: true,
        eventType: "keyup",
      }),
    );

    dispatchKeyEvent("a", "keydown");
    dispatchKeyEvent("a", "keyup");

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalled();
      expect(mockBlur).toHaveBeenCalled();
    });
  });

  it("should not call handler when the app is locked", async () => {
    document.body.setAttribute("data-app-locked", "true");

    renderHook(() =>
      useKeyboardEvent({
        combination: ["a"],
        handler: mockHandler,
        eventType: "keyup",
      }),
    );

    dispatchKeyEvent("a", "keydown");
    dispatchKeyEvent("a", "keyup");

    await waitFor(() => {
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});

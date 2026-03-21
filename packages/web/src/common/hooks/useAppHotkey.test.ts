import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { renderHook, waitFor } from "@web/__tests__/__mocks__/mock.render";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";

function dispatchKeyEvent(
  key: string,
  type: "keydown" | "keyup",
  options: KeyboardEventInit = {},
  target: Document | HTMLElement = document,
) {
  target.dispatchEvent(
    new KeyboardEvent(type, {
      key,
      bubbles: true,
      cancelable: true,
      composed: true,
      ...options,
    }),
  );
}

describe("useAppHotkey", () => {
  const mockHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
  });

  it("calls the handler for keydown hotkeys", async () => {
    renderHook(() => useAppHotkey("A", mockHandler));

    dispatchKeyEvent("a", "keydown");

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(expect.any(KeyboardEvent));
    });
  });

  it("calls the handler for keyup hotkeys", async () => {
    renderHook(() => useAppHotkeyUp("A", mockHandler));

    dispatchKeyEvent("a", "keydown");
    dispatchKeyEvent("a", "keyup");

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("supports modifier hotkeys", async () => {
    const modifierKey = resolveModifier("Mod");
    const isCtrl = modifierKey === "Control";

    renderHook(() => useAppHotkeyUp("Mod+A", mockHandler));

    dispatchKeyEvent("a", "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });
    dispatchKeyEvent("a", "keyup", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("ignores input events by default for single-key shortcuts", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useAppHotkeyUp("A", mockHandler));

    dispatchKeyEvent("a", "keydown", {}, input);
    dispatchKeyEvent("a", "keyup", {}, input);

    await waitFor(() => {
      expect(mockHandler).not.toHaveBeenCalled();
    });

    document.body.removeChild(input);
  });

  it("can listen inside inputs when ignoreInputs is false", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() =>
      useAppHotkeyUp("A", mockHandler, {
        ignoreInputs: false,
      }),
    );

    dispatchKeyEvent("a", "keydown", {}, input);
    dispatchKeyEvent("a", "keyup", {}, input);

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    document.body.removeChild(input);
  });

  it("blurs the active element before handling the shortcut when requested", async () => {
    const input = document.createElement("input");
    const blurSpy = jest.spyOn(input, "blur");
    document.body.appendChild(input);
    input.focus();

    renderHook(() =>
      useAppHotkey("Escape", mockHandler, {
        ignoreInputs: false,
        blurOnTrigger: true,
      }),
    );

    dispatchKeyEvent("Escape", "keydown", {}, input);

    await waitFor(() => {
      expect(blurSpy).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    document.body.removeChild(input);
  });

  it("does not call the handler when the app is locked", async () => {
    document.body.dataset.appLocked = "true";

    renderHook(() => useAppHotkey("A", mockHandler));

    dispatchKeyEvent("a", "keydown");

    await waitFor(() => {
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});

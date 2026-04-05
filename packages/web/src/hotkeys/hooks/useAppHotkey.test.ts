import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { act, renderHook, waitFor } from "@web/__tests__/__mocks__/mock.render";
import {
  HOTKEY_SEQUENCE_TIMEOUT_MS,
  resetHotkeySequenceControllerForTests,
  useAppHotkey,
  useAppHotkeySequence,
  useAppHotkeyUp,
  useIsHotkeySequencePending,
} from "@web/hotkeys/hooks/useAppHotkey";

function dispatchSequence(sequence: string[]) {
  sequence.forEach((key) => {
    dispatchKeyEvent(key, "keydown");
    dispatchKeyEvent(key, "keyup");
  });
}

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
    resetHotkeySequenceControllerForTests();
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

  it("suppresses a conflicting single-key hotkey while a sequence is pending", async () => {
    const mockSingleHandler = jest.fn();
    const mockSequenceHandler = jest.fn();

    renderHook(() => {
      useAppHotkeyUp("D", mockSingleHandler);
      useAppHotkeySequence(["E", "D"], mockSequenceHandler);
    });

    dispatchSequence(["e", "d"]);

    await waitFor(() => {
      expect(mockSequenceHandler).toHaveBeenCalledTimes(1);
      expect(mockSingleHandler).not.toHaveBeenCalled();
    });
  });

  it("still fires non-conflicting single-key hotkeys while a sequence is pending", async () => {
    const mockSingleHandler = jest.fn();
    const mockSequenceHandler = jest.fn();

    renderHook(() => {
      useAppHotkeyUp("A", mockSingleHandler);
      useAppHotkeySequence(["E", "D"], mockSequenceHandler);
    });

    dispatchKeyEvent("e", "keydown");
    dispatchKeyEvent("e", "keyup");
    dispatchKeyEvent("a", "keydown");
    dispatchKeyEvent("a", "keyup");

    await waitFor(() => {
      expect(mockSingleHandler).toHaveBeenCalledTimes(1);
      expect(mockSequenceHandler).not.toHaveBeenCalled();
    });
  });
});

describe("useAppHotkeySequence", () => {
  const mockHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    HotkeyManager.resetInstance();
    resetHotkeySequenceControllerForTests();
    document.body.removeAttribute("data-app-locked");
  });

  it("calls the handler when the sequence is pressed in order", async () => {
    renderHook(() => useAppHotkeySequence(["E", "D"], mockHandler));

    dispatchSequence(["e", "d"]);

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("reports pending state while waiting for the next key", async () => {
    const { result } = renderHook(() => {
      useAppHotkeySequence(["E", "D"], mockHandler);
      return useIsHotkeySequencePending(["E", "D"]);
    });

    expect(result.current).toBe(false);

    act(() => {
      dispatchKeyEvent("e", "keydown");
      dispatchKeyEvent("e", "keyup");
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    act(() => {
      dispatchKeyEvent("d", "keydown");
      dispatchKeyEvent("d", "keyup");
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("clears pending state after the timeout", async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => {
      useAppHotkeySequence(["E", "D"], mockHandler);
      return useIsHotkeySequencePending(["E", "D"]);
    });

    act(() => {
      dispatchKeyEvent("e", "keydown");
      dispatchKeyEvent("e", "keyup");
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    act(() => {
      jest.advanceTimersByTime(HOTKEY_SEQUENCE_TIMEOUT_MS);
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("clears pending state after unmount", async () => {
    const registration = renderHook(() => {
      useAppHotkeySequence(["E", "D"], mockHandler);
      return useIsHotkeySequencePending(["E", "D"]);
    });

    act(() => {
      dispatchKeyEvent("e", "keydown");
      dispatchKeyEvent("e", "keyup");
    });

    await waitFor(() => {
      expect(registration.result.current).toBe(true);
    });

    act(() => {
      registration.unmount();
    });

    const observer = renderHook(() => useIsHotkeySequencePending(["E", "D"]));

    expect(observer.result.current).toBe(false);
  });

  it("restarts matching after a mismatch on the current key", async () => {
    renderHook(() => useAppHotkeySequence(["E", "D"], mockHandler));

    dispatchSequence(["e", "e", "d"]);

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("does not call the handler when the app is locked", async () => {
    document.body.dataset.appLocked = "true";

    renderHook(() => useAppHotkeySequence(["E", "D"], mockHandler));

    dispatchSequence(["e", "d"]);

    await waitFor(() => {
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  it("ignores sequence when focused in an input by default", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useAppHotkeySequence(["E", "D"], mockHandler));

    dispatchKeyEvent("e", "keydown", {}, input);
    dispatchKeyEvent("e", "keyup", {}, input);
    dispatchKeyEvent("d", "keydown", {}, input);
    dispatchKeyEvent("d", "keyup", {}, input);

    await waitFor(() => {
      expect(mockHandler).not.toHaveBeenCalled();
    });

    document.body.removeChild(input);
  });
});

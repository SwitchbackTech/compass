import { act, cleanup, renderHook } from "@testing-library/react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import {
  clearFloatingLayerReasons,
  setFloatingLayerReason,
} from "@web/shortcuts/floating-layer";
import {
  quickTimeActions,
  useQuickTimeStore,
} from "@web/shortcuts/quick-time/quick-time.store";
import { useQuickTimeCreate } from "@web/shortcuts/quick-time/useQuickTimeCreate";
import { DIGIT_AMBIGUOUS_COMMIT_MS } from "@web/shortcuts/shift-hint/assign-shift-hint-keys";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const TARGET_DAY = dayjs().startOf("day");

const keydown = (key: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
    ...init,
  });

/** Digits are matched by physical code, so a digit press must carry one. */
const digit = (value: string) => keydown(value, { code: `Digit${value}` });

const mountConsumer = () => {
  const createAt = mock((_start: Dayjs) => {});
  const { result } = renderHook(() =>
    useQuickTimeCreate({
      createAt: (start) => createAt(start),
      getTargetDay: () => TARGET_DAY,
    }),
  );

  const type = (keys: string[]) =>
    act(() => {
      for (const key of keys) result.current.tryConsumeKey(digit(key));
    });

  return { createAt, result, type };
};

const startedAt = (createAt: ReturnType<typeof mock>) =>
  (createAt.mock.calls[0]?.[0] as Dayjs | undefined)?.format("HH:mm") ?? null;

describe("useQuickTimeCreate", () => {
  beforeEach(() => {
    clearAppLockReasons();
    clearFloatingLayerReasons();
    quickTimeActions.clear();
  });

  afterEach(() => {
    cleanup();
    clearAppLockReasons();
    clearFloatingLayerReasons();
    quickTimeActions.clear();
  });

  it("creates on the fourth digit, which cannot grow further", () => {
    const { createAt, type } = mountConsumer();

    type(["1", "7", "0", "0"]);

    expect(createAt).toHaveBeenCalledTimes(1);
    expect(startedAt(createAt)).toBe("17:00");
    expect(useQuickTimeStore.getState().digits).toBe("");
  });

  it("consumes each digit so it reaches no other handler", () => {
    const { result } = mountConsumer();

    act(() => {
      expect(result.current.tryConsumeKey(digit("1"))).toBe(true);
    });
    expect(useQuickTimeStore.getState().digits).toBe("1");
  });

  it("commits a short sequence on Enter without waiting", () => {
    const { createAt, result, type } = mountConsumer();

    type(["1", "7"]);
    act(() => {
      expect(result.current.tryConsumeKey(keydown("Enter"))).toBe(true);
    });

    expect(startedAt(createAt)).toBe("17:00");
  });

  it("abandons the sequence on Escape", () => {
    const { createAt, result, type } = mountConsumer();

    type(["1", "7"]);
    act(() => {
      expect(result.current.tryConsumeKey(keydown("Escape"))).toBe(true);
    });

    expect(createAt).not.toHaveBeenCalled();
    expect(useQuickTimeStore.getState().digits).toBe("");
  });

  it("leaves Escape alone when nothing is buffered, so jump mode still exits", () => {
    const { result } = mountConsumer();

    act(() => {
      expect(result.current.tryConsumeKey(keydown("Escape"))).toBe(false);
    });
  });

  it("lets another command run after abandoning a half-typed time", () => {
    const { createAt, result, type } = mountConsumer();

    type(["1", "1"]);
    act(() => {
      expect(result.current.tryConsumeKey(keydown("h"))).toBe(false);
    });

    expect(createAt).not.toHaveBeenCalled();
    expect(useQuickTimeStore.getState().digits).toBe("");
  });

  it("ignores a bare Shift so shifted digit layouts still buffer", () => {
    const { result, type } = mountConsumer();

    type(["1"]);
    act(() => {
      expect(
        result.current.tryConsumeKey(keydown("Shift", { shiftKey: true })),
      ).toBe(false);
    });

    expect(useQuickTimeStore.getState().digits).toBe("1");
  });

  it("stands down while the app is locked", () => {
    const { result } = mountConsumer();

    setAppLockReason("commandPalette", true);
    act(() => {
      expect(result.current.tryConsumeKey(digit("1"))).toBe(false);
    });

    expect(useQuickTimeStore.getState().digits).toBe("");
  });

  it("stands down while a floating layer owns the keyboard", () => {
    const { result } = mountConsumer();

    setFloatingLayerReason("contextMenu", true);
    act(() => {
      expect(result.current.tryConsumeKey(digit("1"))).toBe(false);
    });

    expect(useQuickTimeStore.getState().digits).toBe("");
  });

  it("ignores a Mod chord, which belongs to page jump", () => {
    const { result } = mountConsumer();

    act(() => {
      expect(
        result.current.tryConsumeKey(
          keydown("1", { code: "Digit1", metaKey: true }),
        ),
      ).toBe(false);
    });

    expect(useQuickTimeStore.getState().digits).toBe("");
  });
});

describe("useQuickTimeCreate deferred commit", () => {
  afterEach(() => {
    cleanup();
    quickTimeActions.clear();
  });

  it("commits a still-growable sequence once the window lapses", async () => {
    const { createAt, type } = mountConsumer();

    type(["0"]);
    expect(createAt).not.toHaveBeenCalled();

    await act(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, DIGIT_AMBIGUOUS_COMMIT_MS + 50);
        }),
    );

    expect(startedAt(createAt)).toBe("00:00");
  });
});

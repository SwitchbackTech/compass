import { act, cleanup, renderHook } from "@testing-library/react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import {
  clearFloatingLayerReasons,
  setFloatingLayerReason,
} from "@web/shortcuts/floating-layer";
import { DIGIT_AMBIGUOUS_COMMIT_MS } from "@web/shortcuts/shift-hint/assign-shift-hint-keys";
import {
  eventJumpActions,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import { useShiftHoldEventHints } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";
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

const dispatch = (event: KeyboardEvent) => {
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
};

const mountOwner = () => {
  const createAt = mock((_start: Dayjs) => {});
  renderHook(() =>
    useShiftHoldEventHints({
      createAtTime: (start) => createAt(start),
      focus: () => {},
      getQuickTimeDay: () => TARGET_DAY,
      listVisible: () => [],
      timedEvents: [],
    }),
  );

  const type = (keys: string[]) => {
    for (const key of keys) dispatch(digit(key));
  };

  return { createAt, type };
};

const startedAt = (createAt: ReturnType<typeof mock>) =>
  (createAt.mock.calls[0]?.[0] as Dayjs | undefined)?.format("HH:mm") ?? null;

describe("typed-time ownership", () => {
  beforeEach(() => {
    clearAppLockReasons();
    clearFloatingLayerReasons();
    eventJumpActions.reset();
  });

  afterEach(() => {
    cleanup();
    clearAppLockReasons();
    clearFloatingLayerReasons();
    eventJumpActions.reset();
  });

  it("creates on the fourth digit, which cannot grow further", () => {
    const { createAt, type } = mountOwner();

    type(["1", "7", "0", "0"]);

    expect(createAt).toHaveBeenCalledTimes(1);
    expect(startedAt(createAt)).toBe("17:00");
    expect(useEventJumpStore.getState().quickTimeDigits).toBe("");
  });

  it("consumes each digit so it reaches no other handler", () => {
    mountOwner();

    const event = dispatch(digit("1"));

    expect(event.defaultPrevented).toBe(true);
    expect(useEventJumpStore.getState().quickTimeDigits).toBe("1");
  });

  it("commits a short sequence on Enter without waiting", () => {
    const { createAt, type } = mountOwner();

    type(["1", "7"]);
    const event = dispatch(keydown("Enter"));

    expect(event.defaultPrevented).toBe(true);
    expect(startedAt(createAt)).toBe("17:00");
  });

  it("abandons the sequence on Escape", () => {
    const { createAt, type } = mountOwner();

    type(["1", "7"]);
    const event = dispatch(keydown("Escape"));

    expect(event.defaultPrevented).toBe(true);
    expect(createAt).not.toHaveBeenCalled();
    expect(useEventJumpStore.getState().quickTimeDigits).toBe("");
  });

  it("leaves Escape alone when nothing is buffered", () => {
    mountOwner();

    const event = dispatch(keydown("Escape"));

    expect(event.defaultPrevented).toBe(false);
  });

  it("lets another command run after abandoning a half-typed time", () => {
    const { createAt, type } = mountOwner();

    type(["1", "1"]);
    const event = dispatch(keydown("h"));

    expect(event.defaultPrevented).toBe(true);
    expect(createAt).not.toHaveBeenCalled();
    expect(useEventJumpStore.getState()).toMatchObject({
      isActive: true,
      quickTimeDigits: "",
    });
  });

  it("ignores a bare Shift so shifted digit layouts still buffer", () => {
    const { type } = mountOwner();

    type(["1"]);
    const event = dispatch(keydown("Shift", { shiftKey: true }));

    expect(event.defaultPrevented).toBe(false);
    expect(useEventJumpStore.getState().quickTimeDigits).toBe("1");
  });

  it("stands down while the app is locked", () => {
    mountOwner();

    setAppLockReason("commandPalette", true);
    const event = dispatch(digit("1"));

    expect(event.defaultPrevented).toBe(false);
    expect(useEventJumpStore.getState().quickTimeDigits).toBe("");
  });

  it("stands down while a floating layer owns the keyboard", () => {
    mountOwner();

    setFloatingLayerReason("contextMenu", true);
    const event = dispatch(digit("1"));

    expect(event.defaultPrevented).toBe(false);
    expect(useEventJumpStore.getState().quickTimeDigits).toBe("");
  });

  it("ignores a Mod chord, which belongs to page jump", () => {
    mountOwner();

    const event = dispatch(keydown("1", { code: "Digit1", metaKey: true }));

    expect(event.defaultPrevented).toBe(false);
    expect(useEventJumpStore.getState().quickTimeDigits).toBe("");
  });

  it("keeps digit precedence while event jump is active with no day prefix", () => {
    mountOwner();
    dispatch(keydown("h"));

    const event = dispatch(digit("1"));

    expect(event.defaultPrevented).toBe(true);
    expect(useEventJumpStore.getState()).toMatchObject({
      isActive: true,
      quickTimeDigits: "1",
    });
  });
});

describe("typed-time deferred commit", () => {
  afterEach(() => {
    cleanup();
    eventJumpActions.reset();
  });

  it("commits a still-growable sequence once the window lapses", async () => {
    const { createAt, type } = mountOwner();

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

  describe("with an empty-grid click parked", () => {
    const CLICKED_DAY = TARGET_DAY.add(2, "day");

    const parkIntent = (timeKey: string, hour: number) =>
      eventJumpActions.setPointerDraftIntent({
        date: CLICKED_DAY.format("YYYY-MM-DD"),
        start: CLICKED_DAY.hour(hour).minute(30).format(),
        timeKey,
      });

    it("lands on the clicked instant, not a re-resolved one", () => {
      parkIntent("1130", 23);
      const { createAt, type } = mountOwner();

      type(["1", "1", "3", "0"]);

      expect(startedAt(createAt)).toBe("23:30");
      expect(useEventJumpStore.getState().pointerDraftDateKey).toBeNull();
    });

    it("retargets a different sequence to the clicked day", () => {
      parkIntent("1130", 23);
      const { createAt, type } = mountOwner();

      type(["1", "7", "0", "0"]);

      const start = createAt.mock.calls[0]?.[0] as Dayjs;
      expect(start.format("YYYY-MM-DD HH:mm")).toBe(
        `${CLICKED_DAY.format("YYYY-MM-DD")} 17:00`,
      );
    });
  });
});

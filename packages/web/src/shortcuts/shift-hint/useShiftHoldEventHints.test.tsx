import { act, cleanup, renderHook } from "@testing-library/react";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type GridEvent } from "@web/common/types/web.event.types";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import {
  keyboardOnlyActions,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import {
  eventJumpActions,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import {
  SHIFT_DOUBLE_TAP_MAX_GAP_MS,
  SHIFT_TAP_MAX_HOLD_MS,
} from "@web/shortcuts/shift-hint/shift-hold-detector";
import { useShiftHoldEventHints } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";
import { resetSharedShiftTapGesture } from "@web/shortcuts/shift-tap-gesture";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const EVENT_A = EventIdSchema.parse("aaaaaaaaaaaaaaaaaaaaaaaa");
const EVENT_B = EventIdSchema.parse("bbbbbbbbbbbbbbbbbbbbbbbb");
const EVENT_C = EventIdSchema.parse("cccccccccccccccccccccccc");

const dispatch = (
  type: "keydown" | "keyup",
  key: string,
  init: KeyboardEventInit = {},
) => {
  document.dispatchEvent(
    new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
      ...init,
    }),
  );
};

const tapShift = () => {
  dispatch("keydown", "Shift");
  dispatch("keyup", "Shift");
};

/** Past the double-tap window, so the next tap is treated as fresh. */
const waitPastDoubleTapWindow = async () => {
  await act(async () => {
    await Bun.sleep(SHIFT_DOUBLE_TAP_MAX_GAP_MS + 5);
  });
};

const timedFixture = (id: string, startDate: string): GridEvent =>
  ({
    _id: id,
    startDate,
    endDate: startDate,
    title: id,
    isAllDay: false,
  }) as GridEvent;

describe("useShiftHoldEventHints", () => {
  beforeEach(() => {
    clearAppLockReasons();
    eventJumpActions.reset();
    keyboardOnlyActions.exit();
    resetSharedShiftTapGesture();
  });

  afterEach(() => {
    cleanup();
    clearAppLockReasons();
    eventJumpActions.reset();
    keyboardOnlyActions.exit();
    resetSharedShiftTapGesture();
    document.body.innerHTML = "";
  });

  const mountHints = (mode: "week" | "day" = "week") => {
    const focus = mock((_target: { eventId: string }) => {});
    const elements = [EVENT_A, EVENT_B, EVENT_C].map((id) => {
      const el = document.createElement("button");
      el.textContent = id;
      el.getBoundingClientRect = () =>
        ({
          x: 40,
          y: 80,
          top: 80,
          left: 40,
          bottom: 110,
          right: 200,
          width: 160,
          height: 30,
          toJSON: () => ({}),
        }) as DOMRect;
      document.body.appendChild(el);
      return el;
    });

    // Wednesday / Thursday / Friday so prefixes are W / R / F.
    const timedEvents = [
      timedFixture(EVENT_A, "2026-08-05T09:00:00.000Z"),
      timedFixture(EVENT_B, "2026-08-05T11:00:00.000Z"),
      timedFixture(EVENT_C, "2026-08-06T13:00:00.000Z"),
    ];

    const { result } = renderHook(() =>
      useShiftHoldEventHints({
        focus: (target) => focus(target),
        listVisible: () => [
          { eventId: EVENT_A, eventType: "timed", element: elements[0]! },
          { eventId: EVENT_B, eventType: "timed", element: elements[1]! },
          { eventId: EVENT_C, eventType: "timed", element: elements[2]! },
        ],
        mode,
        timedEvents,
      }),
    );

    return { focus, result, elements };
  };

  it("toggles hints on a quick Shift tap and focuses via day prefix", () => {
    const { focus, result, elements } = mountHints();

    act(() => {
      tapShift();
    });

    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(result.current.hints.map((hint) => hint.hint)).toEqual([
      "w1",
      "w2",
      "r1",
    ]);
    expect(useEventJumpStore.getState().announcement).toBe("Event jump on");

    act(() => {
      dispatch("keydown", "w");
    });

    expect(focus).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: EVENT_A, element: elements[0] }),
    );
    expect(useEventJumpStore.getState().activeDayKeys).toEqual(["2026-08-05"]);
    expect(useEventJumpStore.getState().isActive).toBe(true);

    act(() => {
      dispatch("keydown", "2");
    });

    expect(focus).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: EVENT_B, element: elements[1] }),
    );
    expect(useEventJumpStore.getState().isActive).toBe(true);
  });

  it("shows hints on Shift keydown before release", () => {
    const { result } = mountHints();

    act(() => {
      dispatch("keydown", "Shift");
    });

    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(result.current.hints).toHaveLength(3);

    act(() => {
      dispatch("keyup", "Shift");
    });

    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(result.current.hints).toHaveLength(3);
  });

  it("cancels optimistic hints when Shift is held past the tap threshold", async () => {
    const { result } = mountHints();

    act(() => {
      dispatch("keydown", "Shift");
    });
    expect(result.current.hints).toHaveLength(3);

    await act(async () => {
      await Bun.sleep(SHIFT_TAP_MAX_HOLD_MS + 20);
    });
    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);

    act(() => {
      dispatch("keyup", "Shift");
    });
    expect(useEventJumpStore.getState().isActive).toBe(false);
  });

  it("does not toggle on a quick Shift chord (Shift+J)", () => {
    const { result } = mountHints();

    act(() => {
      dispatch("keydown", "Shift");
      dispatch("keydown", "j", { shiftKey: true });
      dispatch("keyup", "j", { shiftKey: true });
      dispatch("keyup", "Shift");
    });

    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("stays inert while app-locked", () => {
    setAppLockReason("test-modal", true);
    const { result } = mountHints();

    act(() => {
      tapShift();
    });

    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("does not activate while keyboard-only mode is on", () => {
    keyboardOnlyActions.enter();
    const { result } = mountHints();

    act(() => {
      tapShift();
    });

    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
  });

  it("clears hints when Shift is tapped again or Escape is pressed", async () => {
    const { result } = mountHints();

    act(() => {
      tapShift();
    });
    expect(result.current.hints).toHaveLength(3);

    // Wait past the double-tap window so the next Shift is a toggle-off,
    // not a double-tap that hands off to keyboard-only instead.
    await waitPastDoubleTapWindow();
    act(() => {
      tapShift();
    });
    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);

    // Wait so re-entry is a fresh tap, not Shift-Shift double-tap.
    await waitPastDoubleTapWindow();
    act(() => {
      tapShift();
    });
    expect(useEventJumpStore.getState().isActive).toBe(true);

    act(() => {
      dispatch("keydown", "Escape");
    });
    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("keeps mode on when arrows are pressed after selecting a day", () => {
    const { focus, result } = mountHints();

    act(() => {
      tapShift();
      dispatch("keydown", "w");
    });
    expect(focus).toHaveBeenCalled();
    expect(useEventJumpStore.getState().isActive).toBe(true);

    act(() => {
      dispatch("keydown", "ArrowDown");
    });
    expect(useEventJumpStore.getState().isActive).toBe(true);
  });

  it("cancels the just-activated hints on a following Shift-Shift", () => {
    mountHints();

    act(() => {
      tapShift();
      tapShift();
    });

    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(useEventJumpStore.getState().announcement).toBe("");
  });
});

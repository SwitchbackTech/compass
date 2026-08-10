/**
 * Shift-hint and keyboard-only mode share one Shift-tap gesture listener
 * (see shift-tap-gesture.ts). This covers the interaction between the two
 * real hooks mounted together - the scenario the old per-hook detectors
 * coordinated only by timing, and could race.
 */

import { act, renderHook } from "@testing-library/react";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type GridEvent } from "@web/common/types/web.event.types";
import { clearAppLockReasons } from "@web/shortcuts/app-lock";
import {
  initialKeyboardOnlyState,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import { useKeyboardOnlyMode } from "@web/shortcuts/keyboard-only/useKeyboardOnlyMode";
import {
  eventJumpActions,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import { SHIFT_DOUBLE_TAP_MAX_GAP_MS } from "@web/shortcuts/shift-hint/shift-hold-detector";
import { useShiftHoldEventHints } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";
import { resetSharedShiftTapGesture } from "@web/shortcuts/shift-tap-gesture";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const waitPastDoubleTapWindow = async () => {
  await act(async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, SHIFT_DOUBLE_TAP_MAX_GAP_MS + 10),
    );
  });
};

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

const EVENT_ID = EventIdSchema.parse("aaaaaaaaaaaaaaaaaaaaaaaa");

const timedFixture = (id: string, startDate: string): GridEvent =>
  ({
    _id: id,
    startDate,
    endDate: startDate,
    title: id,
    isAllDay: false,
  }) as GridEvent;

const mountBoth = () => {
  const element = document.createElement("button");
  document.body.appendChild(element);
  const timedEvents: GridEvent[] = [
    timedFixture(EVENT_ID, "2026-08-05T09:00:00.000Z"),
  ];

  renderHook(() => useKeyboardOnlyMode());
  return renderHook(() =>
    useShiftHoldEventHints({
      focus: () => {},
      listVisible: () => [{ eventId: EVENT_ID, eventType: "timed", element }],
      timedEvents,
    }),
  );
};

describe("shift-hint + keyboard-only integration", () => {
  beforeEach(() => {
    clearAppLockReasons();
    eventJumpActions.reset();
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
    resetSharedShiftTapGesture();
  });

  afterEach(() => {
    clearAppLockReasons();
    eventJumpActions.reset();
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
    resetSharedShiftTapGesture();
    document.body.innerHTML = "";
  });

  it("a single tap activates shift-hint only", () => {
    mountBoth();

    act(() => {
      tapShift();
    });

    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
  });

  it("Shift-Shift cancels the hints it just activated and enters keyboard-only instead", () => {
    mountBoth();

    act(() => {
      tapShift();
      tapShift();
    });

    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
  });

  it("Shift press still activates jump while keyboard-only is already on", async () => {
    const { result } = mountBoth();

    act(() => {
      tapShift();
      tapShift();
    });
    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
    expect(useEventJumpStore.getState().isActive).toBe(false);

    await waitPastDoubleTapWindow();
    act(() => {
      tapShift();
    });

    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(result.current.hints.length).toBeGreaterThan(0);
  });
});

/**
 * Event-jump (`s`) and Hardcore (`h`) are independent letter shortcuts.
 * Mounted together they must not steal each other's keys.
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
import { useShiftHoldEventHints } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

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

const press = (key: string) => {
  dispatch("keydown", key);
  dispatch("keyup", key);
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

  // Match production effect order: view (child) listeners register before
  // RootShell Hardcore, so jump is first on the capture path.
  const jump = renderHook(() =>
    useShiftHoldEventHints({
      focus: () => {},
      listVisible: () => [{ eventId: EVENT_ID, eventType: "timed", element }],
      timedEvents,
    }),
  );
  renderHook(() => useKeyboardOnlyMode());
  return jump;
};

describe("event-jump + keyboard-only integration", () => {
  beforeEach(() => {
    clearAppLockReasons();
    eventJumpActions.reset();
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
  });

  afterEach(() => {
    clearAppLockReasons();
    eventJumpActions.reset();
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
    document.body.innerHTML = "";
  });

  it("s activates event jump only", () => {
    mountBoth();

    act(() => {
      press("s");
    });

    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
  });

  it("h activates hardcore only", () => {
    mountBoth();

    act(() => {
      press("h");
    });

    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
  });

  it("s still activates jump while hardcore is already on", () => {
    const { result } = mountBoth();

    act(() => {
      press("h");
    });
    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
    expect(useEventJumpStore.getState().isActive).toBe(false);

    act(() => {
      press("s");
    });

    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(result.current.hints.length).toBeGreaterThan(0);
  });

  it("h clears active jump chips when entering hardcore", () => {
    const { result } = mountBoth();

    act(() => {
      press("s");
    });
    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(result.current.hints.length).toBeGreaterThan(0);

    act(() => {
      press("h");
    });

    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });
});

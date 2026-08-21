import { act, cleanup, renderHook } from "@testing-library/react";
import { EventIdSchema } from "@core/types/domain-primitives";
import { dispatchMissingKey } from "@web/__tests__/utils/keyboard.test.util";
import { type GridEvent } from "@web/common/types/web.event.types";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import {
  eventJumpActions,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import { useShiftHoldEventHints } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";
import {
  resetEditSequenceArm,
  useEditSequenceShortcut,
} from "@web/shortcuts/useEditSequenceShortcut";
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

const pressS = () => {
  dispatch("keydown", "s");
  dispatch("keyup", "s");
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
    resetEditSequenceArm();
  });

  afterEach(() => {
    cleanup();
    clearAppLockReasons();
    eventJumpActions.reset();
    resetEditSequenceArm();
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

  it("toggles hints on s and focuses via day prefix", () => {
    const { focus, result, elements } = mountHints();

    act(() => {
      pressS();
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

  it("does not activate on bare Shift or Shift+Tab", () => {
    const { result } = mountHints();

    act(() => {
      dispatch("keydown", "Shift");
      dispatch("keyup", "Shift");
      dispatch("keydown", "Tab", { shiftKey: true });
      dispatch("keyup", "Tab", { shiftKey: true });
    });

    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("does not activate on Shift+J", () => {
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
      pressS();
    });

    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("clears hints when Escape is pressed", () => {
    const { result } = mountHints();

    act(() => {
      pressS();
    });
    expect(result.current.hints).toHaveLength(3);

    act(() => {
      dispatch("keydown", "Escape");
    });
    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("toggles off with a second s in day view", () => {
    const { result } = mountHints("day");

    act(() => {
      pressS();
    });
    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(result.current.hints).toHaveLength(3);

    act(() => {
      pressS();
    });
    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("keeps mode on when arrows are pressed after selecting a day", () => {
    const { focus, result } = mountHints();

    act(() => {
      pressS();
      dispatch("keydown", "w");
    });
    expect(focus).toHaveBeenCalled();
    expect(useEventJumpStore.getState().isActive).toBe(true);

    act(() => {
      dispatch("keydown", "ArrowDown");
    });
    expect(useEventJumpStore.getState().isActive).toBe(true);
    expect(result.current.hints.length).toBeGreaterThan(0);
  });

  it("does not steal s while the e edit sequence is armed", () => {
    const onSequence = mock(() => {});
    renderHook(() => useEditSequenceShortcut({ onSequence }));
    const { result } = mountHints();

    act(() => {
      dispatch("keydown", "e");
      dispatch("keydown", "s");
    });

    expect(onSequence).toHaveBeenCalledWith("start");
    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("ignores KeyboardEvents with no key instead of throwing", () => {
    const { result } = mountHints();

    expect(() => {
      dispatchMissingKey("keydown");
      dispatchMissingKey("keyup");
    }).not.toThrow();

    expect(useEventJumpStore.getState().isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });
});

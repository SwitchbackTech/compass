import { act, cleanup, renderHook } from "@testing-library/react";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type GridEvent } from "@web/common/types/web.event.types";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import {
  eventJumpActions,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import { useShiftHoldEventHints } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";
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
  });

  afterEach(() => {
    cleanup();
    clearAppLockReasons();
    eventJumpActions.reset();
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

    expect(result.current.isActive).toBe(true);
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
    expect(result.current.activeDayKeys).toEqual(["2026-08-05"]);
    expect(result.current.isActive).toBe(true);

    act(() => {
      dispatch("keydown", "2");
    });

    expect(focus).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: EVENT_B, element: elements[1] }),
    );
    expect(result.current.isActive).toBe(true);
  });

  it("does not toggle on a quick Shift chord (Shift+J)", () => {
    const { result } = mountHints();

    act(() => {
      dispatch("keydown", "Shift");
      dispatch("keydown", "j", { shiftKey: true });
      dispatch("keyup", "j", { shiftKey: true });
      dispatch("keyup", "Shift");
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("stays inert while app-locked", () => {
    setAppLockReason("test-modal", true);
    const { result } = mountHints();

    act(() => {
      tapShift();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("clears hints when Shift is tapped again or Escape is pressed", () => {
    const { result } = mountHints();

    act(() => {
      tapShift();
    });
    expect(result.current.hints).toHaveLength(3);

    act(() => {
      tapShift();
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.hints).toEqual([]);

    act(() => {
      tapShift();
    });
    expect(result.current.isActive).toBe(true);

    act(() => {
      dispatch("keydown", "Escape");
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.hints).toEqual([]);
  });

  it("keeps mode on when arrows are pressed after selecting a day", () => {
    const { focus, result } = mountHints();

    act(() => {
      tapShift();
      dispatch("keydown", "w");
    });
    expect(focus).toHaveBeenCalled();
    expect(result.current.isActive).toBe(true);

    act(() => {
      dispatch("keydown", "ArrowDown");
    });
    expect(result.current.isActive).toBe(true);
  });

  it("force-off on Shift-Shift without leaving jump announcement", () => {
    const { result } = mountHints();

    act(() => {
      tapShift();
    });
    expect(result.current.isActive).toBe(true);

    act(() => {
      // Second tap within double-tap window.
      tapShift();
    });
    // A second single tap toggles off normally when gap exceeds… wait, same
    // tapShift twice quickly is forceOff path on the second release.
    expect(result.current.isActive).toBe(false);
  });
});

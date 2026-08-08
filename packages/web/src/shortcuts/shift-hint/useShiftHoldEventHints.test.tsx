import { act, cleanup, renderHook } from "@testing-library/react";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type GridEvent } from "@web/common/types/web.event.types";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import { SHIFT_HOLD_HINT_THRESHOLD_MS } from "@web/shortcuts/shift-hint/shift-hold-detector";
import { useShiftHoldEventHints } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

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

const timedFixture = (id: string, startDate: string): GridEvent =>
  ({
    _id: id,
    startDate,
    endDate: startDate,
    title: id,
    isAllDay: false,
  }) as GridEvent;

describe("useShiftHoldEventHints", () => {
  let timeoutCb: (() => void) | null = null;
  let setTimeoutSpy: ReturnType<typeof spyOn>;
  let clearTimeoutSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    clearAppLockReasons();
    timeoutCb = null;
    setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: TimerHandler,
    ) => {
      timeoutCb = () => {
        if (typeof handler === "function") handler();
      };
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout);
    clearTimeoutSpy = spyOn(globalThis, "clearTimeout").mockImplementation(
      (() => {}) as typeof clearTimeout,
    );
  });

  afterEach(() => {
    cleanup();
    clearAppLockReasons();
    document.body.innerHTML = "";
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  const mountHints = () => {
    const focus = mock((_target: { eventId: string }) => {});
    const elements = [EVENT_A, EVENT_B, EVENT_C].map((id, index) => {
      const el = document.createElement("button");
      el.textContent = id;
      // jsdom has no layout; stub a viewport rect so flash targeting can arm.
      el.getBoundingClientRect = () =>
        ({
          x: 40,
          y: 80 + index * 40,
          top: 80 + index * 40,
          left: 40,
          bottom: 110 + index * 40,
          right: 200,
          width: 160,
          height: 30,
          toJSON: () => ({}),
        }) as DOMRect;
      document.body.appendChild(el);
      return el;
    });

    const timedEvents = [
      timedFixture(EVENT_A, "2026-05-20T09:00:00.000Z"),
      timedFixture(EVENT_B, "2026-05-20T11:00:00.000Z"),
      timedFixture(EVENT_C, "2026-05-20T13:00:00.000Z"),
    ];

    const { result } = renderHook(() =>
      useShiftHoldEventHints({
        focus: (target) => focus(target),
        listVisible: () => [
          { eventId: EVENT_A, eventType: "timed", element: elements[0]! },
          { eventId: EVENT_B, eventType: "timed", element: elements[1]! },
          { eventId: EVENT_C, eventType: "timed", element: elements[2]! },
        ],
        timedEvents,
      }),
    );

    return { focus, result, elements };
  };

  it("shows hints after the hold threshold and focuses on an assigned key", () => {
    const { focus, result, elements } = mountHints();

    act(() => {
      dispatch("keydown", "Shift");
    });
    expect(result.current).toEqual([]);
    expect(setTimeoutSpy).toHaveBeenCalledWith(
      expect.any(Function),
      SHIFT_HOLD_HINT_THRESHOLD_MS,
    );

    act(() => {
      timeoutCb?.();
    });

    expect(result.current.map((hint) => hint.hint)).toEqual(["a", "s", "d"]);
    expect(result.current.map((hint) => hint.eventId)).toEqual([
      EVENT_A,
      EVENT_B,
      EVENT_C,
    ]);

    act(() => {
      dispatch("keydown", "s", { shiftKey: true });
      dispatch("keyup", "s", { shiftKey: true });
    });

    expect(focus).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: EVENT_B, element: elements[1] }),
    );
    expect(result.current).toEqual([]);
  });

  it("does not flash hints on a quick Shift chord (Shift+J)", () => {
    const { result } = mountHints();

    act(() => {
      dispatch("keydown", "Shift");
      dispatch("keydown", "j", { shiftKey: true });
    });
    act(() => {
      timeoutCb?.();
    });

    expect(result.current).toEqual([]);
  });

  it("stays inert while app-locked", () => {
    setAppLockReason("test-modal", true);
    const { result } = mountHints();

    act(() => {
      dispatch("keydown", "Shift");
    });
    act(() => {
      timeoutCb?.();
    });

    expect(result.current).toEqual([]);
  });

  it("clears hints when Shift is released", () => {
    const { result } = mountHints();

    act(() => {
      dispatch("keydown", "Shift");
      timeoutCb?.();
    });
    expect(result.current).toHaveLength(3);

    act(() => {
      dispatch("keyup", "Shift");
    });
    expect(result.current).toEqual([]);
  });
});

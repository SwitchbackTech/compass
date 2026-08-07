import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useMinuteTick } from "@web/common/hooks/useMinuteTick";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
  spyOn,
} from "bun:test";

const TICK_INTERVAL_MS = 60_000;

describe("useMinuteTick", () => {
  let intervalCallback: (() => void) | undefined;
  let setIntervalSpy: ReturnType<typeof spyOn>;
  let clearIntervalSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    setSystemTime(new Date("2026-02-05T00:00:00.000Z"));
    intervalCallback = undefined;
    setIntervalSpy = spyOn(globalThis, "setInterval").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        intervalCallback = () => callback();
      }

      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as unknown as typeof setInterval);
    clearIntervalSpy = spyOn(globalThis, "clearInterval").mockImplementation(
      () => {},
    );
  });

  afterEach(() => {
    setSystemTime();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it("returns the current time on mount", () => {
    const { result } = renderHook(() => useMinuteTick());

    expect(result.current.toISOString()).toBe("2026-02-05T00:00:00.000Z");
  });

  it("advances once per minute-tick without changing more often", () => {
    const { result } = renderHook(() => useMinuteTick());

    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      TICK_INTERVAL_MS,
    );

    setSystemTime(new Date("2026-02-05T00:01:00.000Z"));
    act(() => {
      intervalCallback?.();
    });

    expect(result.current.toISOString()).toBe("2026-02-05T00:01:00.000Z");
  });

  it("stops ticking after unmount", () => {
    const { unmount } = renderHook(() => useMinuteTick());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});

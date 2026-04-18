import { act, renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
  spyOn,
} from "bun:test";
import { useBufferedVisibility } from "./useBufferedVisibility";

describe("useBufferedVisibility", () => {
  let timeoutCallbacks: Array<{ callback: () => void; delay: number }> = [];
  let setTimeoutSpy: ReturnType<typeof spyOn>;
  let clearTimeoutSpy: ReturnType<typeof spyOn>;
  let currentTimeoutId = 0;
  const activeTimeouts = new Map<number, { callback: () => void; delay: number }>();

  beforeEach(() => {
    setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    timeoutCallbacks = [];
    currentTimeoutId = 0;
    activeTimeouts.clear();

    setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
      delay?: number,
    ) => {
      const id = ++currentTimeoutId;
      if (typeof callback === "function") {
        activeTimeouts.set(id, { callback, delay: delay ?? 0 });
      }
      return id;
    }) as typeof setTimeout);

    clearTimeoutSpy = spyOn(globalThis, "clearTimeout").mockImplementation(((
      id?: number,
    ) => {
      if (id !== undefined) {
        activeTimeouts.delete(id);
      }
    }) as typeof clearTimeout);
  });

  afterEach(() => {
    setSystemTime();
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  const advanceTimers = (ms: number) => {
    // Execute all timeouts that would have fired within the given time
    for (const [id, { callback, delay }] of activeTimeouts.entries()) {
      if (delay <= ms) {
        activeTimeouts.delete(id);
        callback();
      }
    }
  };

  it("returns initial visibility state", () => {
    const { result } = renderHook(() => useBufferedVisibility(true));
    expect(result.current).toBe(true);
  });

  it("shows immediately when shouldBeVisible becomes true", () => {
    const { result, rerender } = renderHook(
      ({ visible }) => useBufferedVisibility(visible),
      { initialProps: { visible: false } },
    );

    expect(result.current).toBe(false);

    rerender({ visible: true });

    expect(result.current).toBe(true);
  });

  it("delays hiding by buffer time", () => {
    const { result, rerender } = renderHook(
      ({ visible }) => useBufferedVisibility(visible),
      { initialProps: { visible: true } },
    );

    expect(result.current).toBe(true);

    rerender({ visible: false });

    // Still visible immediately after
    expect(result.current).toBe(true);

    // Still visible before buffer expires (40ms < 50ms default buffer)
    act(() => {
      advanceTimers(40);
    });
    expect(result.current).toBe(true);

    // Hidden after buffer expires (another 20ms = 60ms total > 50ms)
    act(() => {
      advanceTimers(60);
    });
    expect(result.current).toBe(false);
  });

  it("cancels hide when visibility returns before buffer expires", () => {
    const { result, rerender } = renderHook(
      ({ visible }) => useBufferedVisibility(visible),
      { initialProps: { visible: true } },
    );

    expect(result.current).toBe(true);

    // Toggle off
    rerender({ visible: false });
    expect(result.current).toBe(true);

    // Wait partial buffer time (30ms < 50ms, so not expired yet)
    act(() => {
      advanceTimers(30);
    });
    expect(result.current).toBe(true);

    // Toggle back on before buffer expires - this should clear the timeout
    rerender({ visible: true });

    // Wait past original buffer time - should not hide because we toggled back on
    act(() => {
      advanceTimers(60);
    });

    // Should still be visible (hide was cancelled)
    expect(result.current).toBe(true);
  });

  it("uses custom buffer time", () => {
    const { result, rerender } = renderHook(
      ({ visible }) => useBufferedVisibility(visible, 100),
      { initialProps: { visible: true } },
    );

    rerender({ visible: false });

    // Still visible at default buffer time (50ms < 100ms custom buffer)
    act(() => {
      advanceTimers(50);
    });
    expect(result.current).toBe(true);

    // Hidden after custom buffer time (another 60ms = 110ms total > 100ms)
    act(() => {
      advanceTimers(110);
    });
    expect(result.current).toBe(false);
  });

  it("handles rapid toggling without flash", () => {
    const { result, rerender } = renderHook(
      ({ visible }) => useBufferedVisibility(visible),
      { initialProps: { visible: true } },
    );

    // Simulate rapid state changes like OAuth → import transition
    rerender({ visible: false }); // authSuccess() clears isAuthenticating
    expect(result.current).toBe(true); // Still visible due to buffer

    act(() => {
      advanceTimers(10);
    });

    rerender({ visible: true }); // importing(true) sets importing
    expect(result.current).toBe(true); // Still visible, hide was cancelled

    // Wait well past buffer time
    act(() => {
      advanceTimers(100);
    });
    expect(result.current).toBe(true); // Remains visible
  });
});

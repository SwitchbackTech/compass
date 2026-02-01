import { act, renderHook } from "@testing-library/react";
import { useBufferedVisibility } from "./useBufferedVisibility";

describe("useBufferedVisibility", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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

    // Still visible before buffer expires
    act(() => {
      jest.advanceTimersByTime(40);
    });
    expect(result.current).toBe(true);

    // Hidden after buffer expires
    act(() => {
      jest.advanceTimersByTime(20);
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

    // Wait partial buffer time
    act(() => {
      jest.advanceTimersByTime(30);
    });
    expect(result.current).toBe(true);

    // Toggle back on before buffer expires
    rerender({ visible: true });

    // Wait past original buffer time
    act(() => {
      jest.advanceTimersByTime(50);
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

    // Still visible at default buffer time
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe(true);

    // Hidden after custom buffer time
    act(() => {
      jest.advanceTimersByTime(60);
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
      jest.advanceTimersByTime(10);
    });

    rerender({ visible: true }); // importing(true) sets importing
    expect(result.current).toBe(true); // Still visible, hide was cancelled

    // Wait well past buffer time
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true); // Remains visible
  });
});

import { renderHook } from "@testing-library/react";
import { useSomedayRefreshReserve } from "./useSomedayRefreshReserve";
import { describe, expect, it } from "bun:test";

describe("useSomedayRefreshReserve", () => {
  it("reserves the previous in-session row height while a refresh is empty", () => {
    const { rerender, result } = renderHook(
      ({ eventCount, isProcessing }) =>
        useSomedayRefreshReserve(eventCount, isProcessing),
      {
        initialProps: {
          eventCount: 2,
          isProcessing: false,
        },
      },
    );

    rerender({ eventCount: 0, isProcessing: true });

    expect(result.current.reservedMinHeight).toBe(68);
  });

  it("does not reserve height from a previous browser session", () => {
    window.localStorage.setItem("compass.someday.count.weekEvents", "5");

    const { result } = renderHook(() => useSomedayRefreshReserve(0, true));

    expect(result.current.reservedMinHeight).toBeUndefined();
  });

  it("animates rows only when they arrive after an in-session refresh", () => {
    const { rerender, result } = renderHook(
      ({ eventCount, isProcessing }) =>
        useSomedayRefreshReserve(eventCount, isProcessing),
      {
        initialProps: {
          eventCount: 0,
          isProcessing: true,
        },
      },
    );

    rerender({ eventCount: 3, isProcessing: false });

    expect(result.current.shouldAnimateRowEntrance).toBe(true);
  });
});

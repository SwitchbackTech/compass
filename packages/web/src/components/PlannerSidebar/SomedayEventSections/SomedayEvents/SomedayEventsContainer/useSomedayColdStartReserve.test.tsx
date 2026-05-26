import { renderHook, waitFor } from "@testing-library/react";
import { useSomedayColdStartReserve } from "./useSomedayColdStartReserve";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const cacheKey = "week";
const storageKey = `compass.someday.count.${cacheKey}`;

describe("useSomedayColdStartReserve", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("reserves space from the last-known count during an empty cold start", () => {
    window.localStorage.setItem(storageKey, "2");

    const { result } = renderHook(() =>
      useSomedayColdStartReserve(cacheKey, 0, true),
    );

    expect(result.current.reservedMinHeight).toBe(68);
    expect(result.current.shouldAnimateRowEntrance).toBe(false);
  });

  it("refreshes the cached count after the cold start when the list changes", async () => {
    window.localStorage.setItem(storageKey, "1");

    const { rerender, result } = renderHook(
      ({ eventCount, isProcessing }) =>
        useSomedayColdStartReserve(cacheKey, eventCount, isProcessing),
      {
        initialProps: {
          eventCount: 0,
          isProcessing: true,
        },
      },
    );

    rerender({ eventCount: 1, isProcessing: false });
    expect(result.current.shouldAnimateRowEntrance).toBe(true);

    await waitFor(() => {
      expect(result.current.reservedMinHeight).toBeUndefined();
      expect(window.localStorage.getItem(storageKey)).toBe("1");
    });

    rerender({ eventCount: 2, isProcessing: false });

    await waitFor(() => {
      expect(window.localStorage.getItem(storageKey)).toBe("2");
    });
  });

  it("disarms the row fade when the first load settles empty", async () => {
    const { rerender, result } = renderHook(
      ({ eventCount, isProcessing }) =>
        useSomedayColdStartReserve(cacheKey, eventCount, isProcessing),
      {
        initialProps: {
          eventCount: 0,
          isProcessing: true,
        },
      },
    );

    rerender({ eventCount: 0, isProcessing: false });

    await waitFor(() => {
      expect(window.localStorage.getItem(storageKey)).toBe("0");
      expect(result.current.shouldAnimateRowEntrance).toBe(false);
    });

    rerender({ eventCount: 1, isProcessing: false });

    expect(result.current.shouldAnimateRowEntrance).toBe(false);
  });
});

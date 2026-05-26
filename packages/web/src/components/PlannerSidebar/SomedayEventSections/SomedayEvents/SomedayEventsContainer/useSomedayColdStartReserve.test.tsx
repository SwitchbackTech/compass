import { renderHook, waitFor } from "@testing-library/react";
import {
  SOMEDAY_COLD_FADE_DURATION_MS,
  useSomedayColdStartReserve,
} from "./useSomedayColdStartReserve";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

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

  it("keeps the reserve release aligned with the cold-start fade duration", () => {
    expect(SOMEDAY_COLD_FADE_DURATION_MS).toBe(600);
  });

  it("reads the cached count only once per mount", () => {
    window.localStorage.setItem(storageKey, "2");
    const getItemSpy = spyOn(Storage.prototype, "getItem");

    const { rerender } = renderHook(
      ({ eventCount, isProcessing }) =>
        useSomedayColdStartReserve(cacheKey, eventCount, isProcessing),
      {
        initialProps: {
          eventCount: 0,
          isProcessing: true,
        },
      },
    );

    rerender({ eventCount: 0, isProcessing: true });
    rerender({ eventCount: 0, isProcessing: true });

    expect(getItemSpy).toHaveBeenCalledTimes(1);
    getItemSpy.mockRestore();
  });
});

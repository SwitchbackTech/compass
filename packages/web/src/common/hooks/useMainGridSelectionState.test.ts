import { renderHook } from "@testing-library/react";
import { act } from "react";
import {
  selecting$,
  useMainGridSelectionState,
} from "./useMainGridSelectionState";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("useMainGridSelectionState", () => {
  let setTimeoutSpy: ReturnType<typeof spyOn>;
  let timeoutCallback: (() => void) | null = null;

  beforeEach(() => {
    timeoutCallback = null;
    setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        timeoutCallback = callback;
      }
      return 1;
    }) as typeof setTimeout);

    act(() => {
      selecting$.next(false);
    });
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  it("should return false initially", () => {
    const { result } = renderHook(() => useMainGridSelectionState());
    expect(result.current.selecting).toBe(false);
  });

  it("should update when selecting$ emits true", () => {
    const { result } = renderHook(() => useMainGridSelectionState());

    act(() => {
      selecting$.next(true);
    });

    expect(result.current.selecting).toBe(true);
  });

  it("should update when selecting$ emits false", () => {
    act(() => {
      selecting$.next(true);
    });

    const { result } = renderHook(() => useMainGridSelectionState());

    expect(result.current.selecting).toBe(true);

    act(() => {
      selecting$.next(false);
    });

    // Execute the setTimeout callback that was captured
    act(() => {
      timeoutCallback?.();
    });

    expect(result.current.selecting).toBe(false);
  });
});

import { act } from "react";
import { renderHook } from "@testing-library/react";
import {
  selecting$,
  useMainGridSelectionState,
} from "./useMainGridSelectionState";

describe("useMainGridSelectionState", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    act(() => {
      selecting$.next(false);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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
      jest.advanceTimersByTime(10);
    });

    expect(result.current.selecting).toBe(false);
  });
});

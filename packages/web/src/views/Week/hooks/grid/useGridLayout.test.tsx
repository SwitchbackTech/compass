import { act, renderHook } from "@testing-library/react";
import { setWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import { useGridLayout } from "./useGridLayout";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const elementWithRect = (width: number, height = 780) => {
  const element = document.createElement("div");
  element.getBoundingClientRect = () =>
    ({
      bottom: height,
      height,
      left: 0,
      right: width,
      top: 0,
      width,
      x: 0,
      y: 0,
    }) as DOMRect;
  return element;
};

beforeEach(() => {
  setWeekInteractionMotionActive(false);
});

afterEach(() => {
  setWeekInteractionMotionActive(false);
});

describe("useGridLayout", () => {
  it("measures grid elements from callback refs and derives column widths", () => {
    const { result } = renderHook(() => useGridLayout());

    act(() => {
      result.current.gridRefs.allDayRef(elementWithRect(700));
      result.current.gridRefs.mainGridElementRef(elementWithRect(700));
    });

    // Expected values: hourHeight = 780 / 13 = 60, colWidths = 700 / 7 = 100 each
    expect(result.current.measurements.hourHeight).toBe(60);
    expect(result.current.measurements.colWidths).toEqual([
      100, 100, 100, 100, 100, 100, 100,
    ]);
  });

  it("does not update measurements when same dimensions are reported", () => {
    const { result } = renderHook(() => useGridLayout());

    act(() => {
      result.current.gridRefs.allDayRef(elementWithRect(700));
      result.current.gridRefs.mainGridElementRef(elementWithRect(700));
    });

    // Verify initial measurements are set
    expect(result.current.measurements.hourHeight).toBe(60);
    expect(result.current.measurements.colWidths).toEqual([
      100, 100, 100, 100, 100, 100, 100,
    ]);

    // Store references to current measurements
    const prevHourHeight = result.current.measurements.hourHeight;
    const prevColWidths = result.current.measurements.colWidths;

    // Call refs again with identical dimensions
    act(() => {
      result.current.gridRefs.allDayRef(elementWithRect(700));
      result.current.gridRefs.mainGridElementRef(elementWithRect(700));
    });

    // Measurements should be the same values
    expect(result.current.measurements.hourHeight).toBe(prevHourHeight);
    expect(result.current.measurements.colWidths).toEqual(prevColWidths);
  });
});

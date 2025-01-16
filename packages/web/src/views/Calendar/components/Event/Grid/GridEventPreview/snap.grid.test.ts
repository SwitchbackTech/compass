import {
  MeasureableElement,
  Measurements_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";

import { snapToGrid } from "./snap.grid";
describe("snapToGrid", () => {
  const measurements: Measurements_Grid = {
    mainGrid: {
      top: 100,
      left: 50,
      height: 0,
      width: 0,
      x: 0,
      y: 0,
      bottom: 0,
      right: 0,
      toJSON: function () {
        throw new Error("Function not implemented.");
      },
    },
    hourHeight: 60,
    colWidths: [100, 100, 100, 100, 100, 100, 100],
    allDayRow: null,
    remeasure: (elem: MeasureableElement) => {
      console.log("remeasuring element", elem);
    },
  };

  it("returns the cursor position if measurements are not available", () => {
    const result = snapToGrid(
      200,
      300,
      {
        mainGrid: null,
        allDayRow: null,
        colWidths: [],
        hourHeight: 0,
        remeasure: (elem: MeasureableElement) => {
          console.log("foo", elem);
        },
      },
      0
    );
    expect(result).toEqual([200, 300]);
  });

  it("returns the cursor position if cursor is not within the grid", () => {
    const result = snapToGrid(200, 50, measurements, 0);
    expect(result).toEqual([200, 50]);
  });

  it("snaps the cursor position to the nearest grid interval", () => {
    const result = snapToGrid(200, 150, measurements, 0);
    expect(result).toEqual([200, 160]);
  });

  it("accounts for scrolling when snapping the cursor position", () => {
    const result = snapToGrid(200, 150, measurements, 50);
    expect(result).toEqual([200, 110]);
  });

  it("handles snapping when cursor is within the grid", () => {
    const result = snapToGrid(200, 200, measurements, 0);
    expect(result).toEqual([200, 220]);
  });

  it("handles snapping when cursor is within the grid and scrolled", () => {
    const result = snapToGrid(200, 200, measurements, 50);
    expect(result).toEqual([200, 170]);
  });

  it("handles snapping when cursor is within the grid and scrolled with different column widths", () => {
    const customMeasurements: Measurements_Grid = {
      ...measurements,
      colWidths: [120, 120, 120, 120, 120, 120, 120],
    };
    const result = snapToGrid(250, 200, customMeasurements, 50);
    expect(result).toEqual([250, 170]);
  });
});

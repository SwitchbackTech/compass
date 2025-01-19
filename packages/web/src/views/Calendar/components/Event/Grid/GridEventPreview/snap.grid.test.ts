import {
  MeasureableElement,
  Measurements_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";

import { snapToGrid, MAIN_GRID_TIME_COLUMN_WIDTH } from "./snap.grid";
import { Coordinates } from "@web/common/types/util.types";

// 7 day main grid
describe("snapToGrid. 7 day grid", () => {
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
    colWidths: Array(7).fill(100) as number[],
    allDayRow: null,
    remeasure: (elem: MeasureableElement) => {
      console.log("remeasuring element", elem);
    },
  };

  const DEFAULT_X = 105;
  const DEFAULT_Y = 160;
  const mouseCoords: Coordinates = { x: DEFAULT_X, y: DEFAULT_Y };

  // Hack to tell TS that measurements.mainGrid is not null in below "it" blocks
  if (!measurements.mainGrid) return;
  const { mainGrid: measurementsMainGrid } = measurements;

  // Override main grid
  const mainGrid = {
    ...measurementsMainGrid,
    // Real "left" for main grid. See comment for MAIN_GRID_TIME_COLUMN_WIDTH in snap.grid.ts for why we do this
    left: measurementsMainGrid.left + MAIN_GRID_TIME_COLUMN_WIDTH,
  };

  afterEach(() => {
    // Reset mouse coords incase they were changed
    mouseCoords.x = DEFAULT_X;
    mouseCoords.y = DEFAULT_Y;
  });

  it("returns the cursor position if measurements are not available", () => {
    const result = snapToGrid(
      mouseCoords.x,
      mouseCoords.y,
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

    expect(result).toEqual({
      x: mouseCoords.x,
      y: mouseCoords.y,
    });
  });

  it("returns the cursor position if cursor is not within the grid", () => {
    const result = snapToGrid(mouseCoords.x, mouseCoords.y, measurements, 0);

    expect(result).toEqual({
      x: mouseCoords.x,
      y: mouseCoords.y,
    });
  });

  it("Snaps Y to correct time interval", () => {
    const result = snapToGrid(mouseCoords.x, mouseCoords.y, measurements, 0);

    const expectedX = mainGrid.left;

    expect(result).toEqual({ x: expectedX, y: DEFAULT_Y });

    // Move the cursor down a little
    mouseCoords.y = mouseCoords.y + 5;

    // Expect result to still be the same
    expect(result).toEqual({ x: expectedX, y: DEFAULT_Y });
  });

  it("Snaps X to correct day column", () => {
    let result = snapToGrid(mouseCoords.x, mouseCoords.y, measurements, 0);

    const expectedY = mouseCoords.y;
    const expectedX = mainGrid.left;

    expect(result).toEqual({ x: expectedX, y: expectedY });

    // Simulate moving the mouse to the right very very close to the next
    // column, but don't cross its boundary. We should remain in the same
    // column (because we didn't cross the boundary)
    mouseCoords.x =
      mouseCoords.x +
      measurements.colWidths[0] -
      // "1px". This helps us not cross the boundary
      1;

    // Expect to still be in the same column
    result = snapToGrid(mouseCoords.x, mouseCoords.y, measurements, 0);

    expect(result).toEqual({ x: expectedX, y: expectedY });
  });

  it("Snaps Y to correct time interval when scrolled", () => {
    // Scroll down a few hour rows. This can be changed to any number and we will
    // still always get the same result as long as we scroll down hour rows consistently.
    const HOURS_TO_SCROLL = 3;
    const scrollTop = measurements.hourHeight * HOURS_TO_SCROLL;

    const result = snapToGrid(
      mouseCoords.x,
      mouseCoords.y,
      measurements,
      scrollTop
    );

    const expectedY = DEFAULT_Y;
    const expectedX = mainGrid.left;

    expect(result).toEqual({ x: expectedX, y: expectedY });
  });

  it("Snaps X to correct day column when scrolled", () => {
    const scrollTop = measurements.hourHeight * 3;

    let result = snapToGrid(
      mouseCoords.x,
      mouseCoords.y,
      measurements,
      scrollTop
    );

    const expectedY = mouseCoords.y;
    const expectedX = mainGrid.left;

    expect(result).toEqual({ x: expectedX, y: expectedY });

    mouseCoords.x = mouseCoords.x + measurements.colWidths[0] - 1;

    result = snapToGrid(mouseCoords.x, mouseCoords.y, measurements, 0);

    expect(result).toEqual({ x: expectedX, y: expectedY });
  });

  it("Correctly updates Y to next time interval when cursor is moved to the next interval", () => {
    const result = snapToGrid(mouseCoords.x, mouseCoords.y, measurements, 0);

    const expectedX = mainGrid.left;

    expect(result).toEqual({ x: expectedX, y: DEFAULT_Y });

    mouseCoords.y = mouseCoords.y + measurements.hourHeight;

    const nextResult = snapToGrid(
      mouseCoords.x,
      mouseCoords.y,
      measurements,
      0
    );

    const expectedNextY = DEFAULT_Y + measurements.hourHeight;

    expect(nextResult).toEqual({ x: expectedX, y: expectedNextY });
  });

  it("Correctly updates X to next day column when cursor is moved to the next column", () => {
    const result = snapToGrid(mouseCoords.x, mouseCoords.y, measurements, 0);

    const expectedY = DEFAULT_Y;
    const expectedX = mainGrid.left;

    expect(result).toEqual({ x: expectedX, y: expectedY });

    // Move the cursor to the next column
    mouseCoords.x = mouseCoords.x + measurements.colWidths[0];

    const nextResult = snapToGrid(
      mouseCoords.x,
      mouseCoords.y,
      measurements,
      0
    );

    const expectedNextX = expectedX + measurements.colWidths[0];

    expect(nextResult).toEqual({ x: expectedNextX, y: expectedY });
  });

  it("Correctly updates Y to prev time interval when cursor is moved to the prev interval", () => {
    mouseCoords.y = mouseCoords.y + measurements.hourHeight;

    const result = snapToGrid(mouseCoords.x, mouseCoords.y, measurements, 0);

    const expectedY = DEFAULT_Y + measurements.hourHeight;
    const expectedX = mainGrid.left;

    expect(result).toEqual({ x: expectedX, y: expectedY });

    // Move the cursor up to the previous time interval
    mouseCoords.y = mouseCoords.y - measurements.hourHeight;

    const nextResult = snapToGrid(
      mouseCoords.x,
      mouseCoords.y,
      measurements,
      0
    );

    const expectedNextY = expectedY - measurements.hourHeight;

    expect(nextResult).toEqual({ x: expectedX, y: expectedNextY });
  });

  it("Correctly updates X to prev day column when cursor is moved to the prev column", () => {
    mouseCoords.x = mouseCoords.x + measurements.colWidths[0];

    const result = snapToGrid(mouseCoords.x, mouseCoords.y, measurements, 0);

    const expectedX = mainGrid.left + measurements.colWidths[0];

    expect(result).toEqual({ x: expectedX, y: DEFAULT_Y });

    // Move the cursor to the previous column
    mouseCoords.x = mouseCoords.x - measurements.colWidths[0];

    const nextResult = snapToGrid(
      mouseCoords.x,
      mouseCoords.y,
      measurements,
      0
    );

    const expectedNextX = expectedX - measurements.colWidths[0];

    expect(nextResult).toEqual({ x: expectedNextX, y: DEFAULT_Y });
  });
});

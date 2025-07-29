import { roundToPrev } from "@web/common/utils";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";

export interface SnappedCoords {
  x: number;
  y: number;
}

// `measurements.mainGrid.left` includes half the width of time column. It does not start at the first day column.
// due to that, we need to account for its width, otherwise snappedX will be off.
// Ideally we should fix how `mainGrid.left` is calculated to not include half the width of time column and
// include only the grid interactivity area (i.e. day columns).
// For now, we estimate the width of the time column to be 55px
export const MAIN_GRID_TIME_COLUMN_WIDTH = 55;

const snapYToGrid = (
  cursorY: number,
  measurements: Measurements_Grid,
  scrollTop: number,
): number => {
  if (!measurements.mainGrid) return cursorY; // TS guard

  // Calculate the cursor's Y position relative to the grid's top and account for scrolling
  const gridY = cursorY - measurements.mainGrid.top + scrollTop;

  // Convert the grid time interval to a fractional hour (assuming GRID_TIME_STEP is in minutes and will never be larger than 60)
  const fractionalHour = GRID_TIME_STEP / 60;

  // Calculate the height of a single grid time interval in pixels
  const intervalHeightInPixels = measurements.hourHeight * fractionalHour;

  // Snap the relative Y position to the nearest grid interval
  const snappedRelativeY = roundToPrev(gridY, intervalHeightInPixels);

  // Adjust snappedY to position the event relative to the page's viewport
  const snappedY = snappedRelativeY + measurements.mainGrid.top - scrollTop;

  return snappedY;
};

const snapXToGrid = (
  cursorX: number,
  measurements: Measurements_Grid,
): number => {
  if (!measurements.mainGrid) return cursorX; // TS guard

  // Calculate the cursor's X position relative to the grid's left and account for scrolling
  const gridX =
    cursorX - MAIN_GRID_TIME_COLUMN_WIDTH - measurements.mainGrid.left;

  // Width of a single grid column (right now it appears the width is the same for across all columns, even in
  // different view ports, so we can reliably use the first column width)
  const intervalWidthInPixels = measurements.colWidths[0];

  // Snap the relative X position to the nearest grid column
  const snappedRelativeX = roundToPrev(gridX, intervalWidthInPixels);

  if (snappedRelativeX < 0) {
    // We are not inside the 'real' main grid area (we are excluding the time column), return cursorX
    return cursorX;
  }

  // Adjust snappedX to position the event relative to the grid's left
  const snappedX =
    measurements.mainGrid.left + MAIN_GRID_TIME_COLUMN_WIDTH + snappedRelativeX;

  return snappedX;
};

export const snapToGrid = (
  cursorX: number,
  cursorY: number,
  measurements: Measurements_Grid,
  scrollTop: number,
): SnappedCoords => {
  if (!measurements.mainGrid) {
    return { x: cursorX, y: cursorY };
  }

  // Check if the cursor is within the bounds of the main grid
  const isCursorWithinGrid = cursorY > measurements.mainGrid.top;

  // Check if the cursor is within the bounds of the all-day row
  const isCursorWithinAllDayRow =
    !!measurements.allDayRow &&
    cursorY > measurements.allDayRow.top &&
    cursorY < measurements.allDayRow.bottom;

  let snappedY = cursorY;
  let snappedX = cursorX;

  if (isCursorWithinGrid) {
    snappedY = snapYToGrid(cursorY, measurements, scrollTop);
    snappedX = snapXToGrid(cursorX, measurements);
  } else if (isCursorWithinAllDayRow) {
    // Only snap horizontally when over the all-day row
    snappedX = snapXToGrid(cursorX, measurements);
  }

  return { x: snappedX, y: snappedY };
};

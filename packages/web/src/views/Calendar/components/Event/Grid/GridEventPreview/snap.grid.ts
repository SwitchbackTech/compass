import { roundToPrev } from "@web/common/utils";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";

export const snapToGrid = (
  cursorX: number,
  cursorY: number,
  measurements: Measurements_Grid,
  scrollTop: number
): [number, number] => {
  if (!measurements.mainGrid) {
    // Fallback in case measurements are not available
    return [cursorX, cursorY];
  }

  // Check if the cursor is within the bounds of the main grid
  const isCursorWithinGrid = cursorY > measurements.mainGrid.top;

  let snappedY = cursorY;

  if (isCursorWithinGrid) {
    // Calculate the cursor's Y position relative to the grid's top and account for scrolling
    const gridY = cursorY - measurements.mainGrid.top + scrollTop;

    // Convert the grid time interval to a fractional hour (assuming GRID_TIME_STEP is in minutes and will never be larger than 60)
    const fractionalHour = GRID_TIME_STEP / 60;

    // Calculate the height of a single grid time interval in pixels
    const intervalHeightInPixels = measurements.hourHeight * fractionalHour;

    // Snap the relative Y position to the nearest grid interval
    const snappedRelativeY = roundToPrev(gridY, intervalHeightInPixels);

    // Adjust snappedY to position the event relative to the grid's top
    snappedY = measurements.mainGrid.top - scrollTop + snappedRelativeY;
  }

  const snappedX = cursorX;

  return [snappedX, snappedY];
};

import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { getElemById } from "@web/common/utils/grid/grid.util";

export type TimedGridScrollDirection = "up" | "down";

/**
 * Pages the timed grid scroller by one viewport. Returns whether a grid
 * was found so callers can preventDefault only when the shortcut actually
 * applied.
 */
export const scrollTimedGridByPage = (
  direction: TimedGridScrollDirection,
): boolean => {
  const grid = getElemById(ID_GRID_MAIN);
  if (!grid) return false;

  const delta = grid.clientHeight;
  if (delta <= 0) return false;

  grid.scrollBy({ top: direction === "down" ? delta : -delta });
  return true;
};

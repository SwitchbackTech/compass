import { gridMarginLeftFor } from "@web/grid/grid.constants";
import { useTimeTravelZone } from "@web/timezone/time-travel.store";

export function useGridMarginLeft(): number {
  return gridMarginLeftFor(useTimeTravelZone() !== null);
}

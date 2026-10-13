import { NodeEnv } from "@core/constants/core.constants";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import {
  EVENT_ALLDAY_GAP,
  EVENT_ALLDAY_ROW_HEIGHT,
} from "@web/grid/grid.constants";

/** Empty click target below stacked chips (~one compact lane). */
export const ALL_DAY_ROW_SPARE_LANE_PX = 22;

export function isCompactAllDayRowHeightEnabled(
  nodeEnv: string = ENV_WEB.NODE_ENV,
): boolean {
  return nodeEnv !== NodeEnv.Production;
}

export function allDayLaneCount(rowsCount: number): number {
  return Math.max(1, rowsCount);
}

/** Pixel height of stacked all-day lanes, excluding the spare strip. */
export function allDayRowStackHeightPx(rowsCount: number): number {
  const lanes = allDayLaneCount(rowsCount);
  return 2 * EVENT_ALLDAY_GAP + lanes * EVENT_ALLDAY_ROW_HEIGHT;
}

/** Staging/non-prod all-day row height: stack plus spare empty lane. */
export function compactAllDayRowHeightPx(rowsCount: number): number {
  return allDayRowStackHeightPx(rowsCount) + ALL_DAY_ROW_SPARE_LANE_PX;
}

export function allDayLaneCountFromEvents(
  events: readonly GridEvent[],
): number {
  const rows = events
    .map(({ row }) => row)
    .filter((row): row is number => row !== undefined);
  return rows.length === 0 ? 1 : Math.max(...rows);
}

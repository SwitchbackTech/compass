import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { GRID_TIME_STEP, TIMED_VISIBLE_HOURS } from "@web/grid/grid.constants";
import {
  SMART_SCROLL_BOTTOM_INSET_PX,
  SMART_SCROLL_SPEED_PX,
} from "@web/grid/interaction/adapter.helpers";
import {
  buildAllDayGridLayoutCache,
  buildDragGridLayoutCache,
  buildTimedGridLayoutCache,
  type GridLayoutCache,
  type GridLayoutCacheOptions,
  type GridLayoutCacheSources,
  getNearestDayColumn,
  type SmartScrollCache,
} from "@web/grid/interaction/layout.cache";
import { type DragRow } from "@web/grid/interaction/types/timed-drag.types";
import { WEEK_EDGE_NAVIGATION_THRESHOLD_PX } from "../edge-navigation";

export type WeekLayoutCacheSources = GridLayoutCacheSources;

/**
 * The week renders a dynamic window of 1-7 day columns. The columns' dates
 * come from the same React render that painted them (weekProps weekDays via
 * the interaction runtime), so drag geometry and drop dates always agree
 * with what is on screen.
 */
export interface WeekLayoutCacheInput extends GridLayoutCacheSources {
  /** Local YYYY-MM-DD dates of the rendered day columns, in window order. */
  visibleDays: string[];
}

export type WeekLayoutCache = GridLayoutCache;
export type { SmartScrollCache };
export { getNearestDayColumn };

const weekLayoutCacheOptions = (
  sources: WeekLayoutCacheInput,
): GridLayoutCacheOptions & WeekLayoutCacheSources => ({
  ...sources,
  allDayColumnsElementId: ID_ALLDAY_COLUMNS,
  edgeThresholdPx: WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
  mainGridElementId: ID_GRID_MAIN,
  smartScroll: {
    bottomInsetPx: SMART_SCROLL_BOTTOM_INSET_PX,
    speedPx: SMART_SCROLL_SPEED_PX,
  },
  snapMinutes: GRID_TIME_STEP,
  timedColumnsElementId: ID_GRID_COLUMNS_TIMED,
  timedVisibleHours: TIMED_VISIBLE_HOURS,
  visibleDates: sources.visibleDays,
});

export const buildTimedWeekLayoutCache = (
  sources: WeekLayoutCacheInput,
): WeekLayoutCache | null =>
  buildTimedGridLayoutCache(weekLayoutCacheOptions(sources));

export const buildAllDayWeekLayoutCache = (
  sources: WeekLayoutCacheInput,
): WeekLayoutCache | null =>
  buildAllDayGridLayoutCache(weekLayoutCacheOptions(sources));

/** Both rows at once, so a drag can be dropped across them. */
export const buildDragWeekLayoutCache = (
  sources: WeekLayoutCacheInput,
  sourceRow: DragRow,
): WeekLayoutCache | null =>
  buildDragGridLayoutCache(weekLayoutCacheOptions(sources), sourceRow);

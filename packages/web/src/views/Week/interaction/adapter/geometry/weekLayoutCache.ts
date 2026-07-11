import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  buildAllDayCalendarLayoutCache,
  buildTimedCalendarLayoutCache,
  type CalendarDayColumnCache,
  type CalendarEdgeNavigationCache,
  type CalendarLayoutCache,
  type CalendarLayoutCacheSources,
  getNearestDayColumn,
  type SmartScrollCache,
} from "@web/layout/calendar-grid/interaction/calendarLayoutCache";
import {
  GRID_TIME_STEP,
  WEEK_TIMED_VISIBLE_HOURS,
} from "@web/views/Week/layout.constants";
import { WEEK_EDGE_NAVIGATION_THRESHOLD_PX } from "../weekEdgeNavigation";

const SMART_SCROLL_BOTTOM_INSET_PX = 100;
const SMART_SCROLL_SPEED_PX = 10;

export type WeekLayoutCacheSources = CalendarLayoutCacheSources;

/**
 * The week renders a dynamic window of 1-7 day columns. The columns' dates
 * come from the same React render that painted them (weekProps weekDays via
 * the interaction runtime), so drag geometry and drop dates always agree
 * with what is on screen.
 */
export interface WeekLayoutCacheInput extends CalendarLayoutCacheSources {
  /** Local YYYY-MM-DD dates of the rendered day columns, in window order. */
  visibleDays: string[];
}

export type WeekDayColumnCache = CalendarDayColumnCache;
export type WeekEdgeNavigationCache = CalendarEdgeNavigationCache;
export type WeekLayoutCache = CalendarLayoutCache;
export type { SmartScrollCache };
export { getNearestDayColumn };

export const buildTimedWeekLayoutCache = (
  sources: WeekLayoutCacheInput,
): WeekLayoutCache | null =>
  buildTimedCalendarLayoutCache({
    ...sources,
    edgeThresholdPx: WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
    mainGridElementId: ID_GRID_MAIN,
    smartScroll: {
      bottomInsetPx: SMART_SCROLL_BOTTOM_INSET_PX,
      speedPx: SMART_SCROLL_SPEED_PX,
    },
    snapMinutes: GRID_TIME_STEP,
    timedColumnsElementId: ID_GRID_COLUMNS_TIMED,
    timedVisibleHours: WEEK_TIMED_VISIBLE_HOURS,
    visibleDates: sources.visibleDays,
  });

export const buildAllDayWeekLayoutCache = (
  sources: WeekLayoutCacheInput,
): WeekLayoutCache | null =>
  buildAllDayCalendarLayoutCache({
    ...sources,
    allDayColumnsElementId: ID_ALLDAY_COLUMNS,
    edgeThresholdPx: WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
    snapMinutes: GRID_TIME_STEP,
    timedVisibleHours: WEEK_TIMED_VISIBLE_HOURS,
    visibleDates: sources.visibleDays,
  });

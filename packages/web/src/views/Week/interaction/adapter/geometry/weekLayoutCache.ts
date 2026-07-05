import {
  buildAllDayCalendarLayoutCache,
  buildTimedCalendarLayoutCache,
  type CalendarDayColumnCache,
  type CalendarEdgeNavigationCache,
  type CalendarLayoutCache,
  type CalendarLayoutCacheSources,
  getNearestDayColumn,
  type SmartScrollCache,
} from "@web/common/calendar-grid/interaction/calendarLayoutCache";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  GRID_TIME_STEP,
  WEEK_TIMED_VISIBLE_HOURS,
} from "@web/views/Week/layout.constants";
import { WEEK_EDGE_NAVIGATION_THRESHOLD_PX } from "../weekEdgeNavigation";

const SMART_SCROLL_BOTTOM_INSET_PX = 100;
const SMART_SCROLL_SPEED_PX = 10;
const DAYS_IN_WEEK = 7;

export type WeekLayoutCacheSources = CalendarLayoutCacheSources;
export type WeekDayColumnCache = CalendarDayColumnCache;
export type WeekEdgeNavigationCache = CalendarEdgeNavigationCache;
export type WeekLayoutCache = CalendarLayoutCache;
export type { SmartScrollCache };
export { getNearestDayColumn };

/**
 * The week renders a dynamic number of day columns (7 down to 1 in narrow
 * windows). The count is read from the CSS variable the grid components set
 * on their columns element so drag geometry always matches what is rendered.
 */
const readVisibleDateCount = (element: HTMLElement | null) => {
  const raw = element?.style.getPropertyValue("--calendar-column-count");
  const count = Number(raw);
  return Number.isInteger(count) && count > 0 ? count : DAYS_IN_WEEK;
};

export const buildTimedWeekLayoutCache = (
  sources: WeekLayoutCacheSources = {},
): WeekLayoutCache | null => {
  const timedColumnsElement =
    sources.timedColumnsElement ??
    document.getElementById(ID_GRID_COLUMNS_TIMED);

  return buildTimedCalendarLayoutCache({
    ...sources,
    edgeThresholdPx: WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
    mainGridElementId: ID_GRID_MAIN,
    smartScroll: {
      bottomInsetPx: SMART_SCROLL_BOTTOM_INSET_PX,
      speedPx: SMART_SCROLL_SPEED_PX,
    },
    snapMinutes: GRID_TIME_STEP,
    timedColumnsElement,
    timedColumnsElementId: ID_GRID_COLUMNS_TIMED,
    timedVisibleHours: WEEK_TIMED_VISIBLE_HOURS,
    visibleDateCount: readVisibleDateCount(timedColumnsElement),
  });
};

export const buildAllDayWeekLayoutCache = (
  sources: WeekLayoutCacheSources = {},
): WeekLayoutCache | null => {
  const allDayColumnsElement =
    sources.allDayColumnsElement ?? document.getElementById(ID_ALLDAY_COLUMNS);

  return buildAllDayCalendarLayoutCache({
    ...sources,
    allDayColumnsElement,
    allDayColumnsElementId: ID_ALLDAY_COLUMNS,
    edgeThresholdPx: WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
    snapMinutes: GRID_TIME_STEP,
    timedVisibleHours: WEEK_TIMED_VISIBLE_HOURS,
    visibleDateCount: readVisibleDateCount(allDayColumnsElement),
  });
};

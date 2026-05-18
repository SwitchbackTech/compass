import {
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  GRID_TIME_STEP,
  WEEK_TIMED_VISIBLE_HOURS,
} from "@web/views/Week/layout.constants";
import { type SmartScrollCache } from "../math/smartScroll";

const SMART_SCROLL_EDGE_THRESHOLD_PX = 50;
const SMART_SCROLL_BOTTOM_INSET_PX = 100;
const SMART_SCROLL_SPEED_PX = 10;
const DAYS_IN_WEEK = 7;

export interface WeekDayColumnCache {
  index: number;
  left: number;
  width: number;
}

export interface WeekEdgeNavigationCache {
  bottom: number;
  edgeThresholdPx: number;
  left: number;
  right: number;
  top: number;
}

export interface WeekLayoutCache {
  dayColumns: WeekDayColumnCache[];
  edgeNavigation: WeekEdgeNavigationCache;
  pixelsPerMinute: number;
  snapMinutes: number;
  smartScroll: SmartScrollCache;
}

export const buildTimedWeekLayoutCache = (): WeekLayoutCache | null => {
  const mainGrid = document.getElementById(ID_GRID_MAIN);

  if (!mainGrid) {
    return null;
  }

  const rect = mainGrid.getBoundingClientRect();
  const columnsRect = getTimedColumnsRect() ?? rect;
  const columnWidth = columnsRect.width / DAYS_IN_WEEK;
  const dayColumns: WeekDayColumnCache[] = Array.from(
    { length: DAYS_IN_WEEK },
    (_, index) => ({
      index,
      left: columnsRect.left + columnWidth * index,
      width: columnWidth,
    }),
  );

  return {
    dayColumns,
    edgeNavigation: {
      bottom: rect.bottom,
      edgeThresholdPx: SMART_SCROLL_EDGE_THRESHOLD_PX,
      left: columnsRect.left,
      right: columnsRect.right,
      top: rect.top,
    },
    pixelsPerMinute: rect.height / (WEEK_TIMED_VISIBLE_HOURS * 60),
    snapMinutes: GRID_TIME_STEP,
    smartScroll: {
      bottom: rect.bottom - SMART_SCROLL_BOTTOM_INSET_PX,
      edgeThresholdPx: SMART_SCROLL_EDGE_THRESHOLD_PX,
      element: mainGrid,
      initialScrollTop: mainGrid.scrollTop,
      maxScrollTop: Math.max(0, mainGrid.scrollHeight - mainGrid.clientHeight),
      speedPx: SMART_SCROLL_SPEED_PX,
      top: rect.top,
    },
  };
};

export const getNearestDayColumn = (
  columns: WeekDayColumnCache[],
  x: number,
) => {
  let nearest: WeekDayColumnCache | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const column of columns) {
    const center = column.left + column.width / 2;
    const distance = Math.abs(center - x);

    if (distance < nearestDistance) {
      nearest = column;
      nearestDistance = distance;
    }
  }

  return nearest;
};

const getTimedColumnsRect = () => {
  const columns = document.getElementById(ID_GRID_COLUMNS_TIMED);
  const rect = columns?.getBoundingClientRect();

  return rect && rect.width > 0 ? rect : null;
};

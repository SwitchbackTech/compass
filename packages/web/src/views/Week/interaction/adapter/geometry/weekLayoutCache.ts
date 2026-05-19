import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  GRID_TIME_STEP,
  WEEK_TIMED_VISIBLE_HOURS,
} from "@web/views/Week/layout.constants";
import { type SmartScrollCache } from "../math/smartScroll";
import { WEEK_EDGE_NAVIGATION_THRESHOLD_PX } from "../weekEdgeNavigation";

const SMART_SCROLL_BOTTOM_INSET_PX = 100;
const SMART_SCROLL_SPEED_PX = 10;
const DAYS_IN_WEEK = 7;

export interface WeekLayoutCacheSources {
  allDayColumnsElement?: HTMLElement | null;
  mainGridElement?: HTMLElement | null;
  timedColumnsElement?: HTMLElement | null;
}

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
  smartScroll?: SmartScrollCache;
}

export const buildTimedWeekLayoutCache = ({
  mainGridElement,
  timedColumnsElement,
}: WeekLayoutCacheSources = {}): WeekLayoutCache | null => {
  const mainGrid = mainGridElement ?? document.getElementById(ID_GRID_MAIN);

  if (!mainGrid) {
    return null;
  }

  const rect = mainGrid.getBoundingClientRect();
  const columnsRect =
    getElementRect(timedColumnsElement) ?? getTimedColumnsRect() ?? rect;
  const dayColumns = buildDayColumns(columnsRect);
  const initialScrollTop = mainGrid.scrollTop;
  const maxScrollTop = Math.max(
    0,
    mainGrid.scrollHeight - mainGrid.clientHeight,
  );

  return {
    dayColumns,
    edgeNavigation: {
      bottom: rect.bottom,
      edgeThresholdPx: WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
      left: columnsRect.left,
      right: columnsRect.right,
      top: rect.top,
    },
    pixelsPerMinute: rect.height / (WEEK_TIMED_VISIBLE_HOURS * 60),
    snapMinutes: GRID_TIME_STEP,
    smartScroll: {
      bottom: rect.bottom - SMART_SCROLL_BOTTOM_INSET_PX,
      edgeThresholdPx: WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
      element: mainGrid,
      initialScrollTop,
      maxScrollTop,
      speedPx: SMART_SCROLL_SPEED_PX,
      top: rect.top,
    },
  };
};

export const buildAllDayWeekLayoutCache = ({
  allDayColumnsElement,
}: WeekLayoutCacheSources = {}): WeekLayoutCache | null => {
  const allDayColumns =
    allDayColumnsElement ?? document.getElementById(ID_ALLDAY_COLUMNS);
  const rect = allDayColumns?.getBoundingClientRect();

  if (!rect || rect.width <= 0) {
    return null;
  }

  return {
    dayColumns: buildDayColumns(rect),
    edgeNavigation: {
      bottom: rect.bottom,
      edgeThresholdPx: WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
      left: rect.left,
      right: rect.right,
      top: rect.top,
    },
    pixelsPerMinute: 1,
    snapMinutes: GRID_TIME_STEP,
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

const getElementRect = (element: HTMLElement | null | undefined) => {
  const rect = element?.getBoundingClientRect();

  return rect && rect.width > 0 ? rect : null;
};

const buildDayColumns = (
  rect: Pick<DOMRect, "left" | "width">,
): WeekDayColumnCache[] => {
  const columnWidth = rect.width / DAYS_IN_WEEK;

  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => ({
    index,
    left: rect.left + columnWidth * index,
    width: columnWidth,
  }));
};

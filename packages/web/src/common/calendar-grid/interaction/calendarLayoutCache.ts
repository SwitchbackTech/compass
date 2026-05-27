export interface CalendarLayoutCacheSources {
  allDayColumnsElement?: HTMLElement | null;
  mainGridElement?: HTMLElement | null;
  timedColumnsElement?: HTMLElement | null;
}

export interface CalendarLayoutCacheOptions {
  allDayColumnsElementId?: string;
  edgeThresholdPx: number;
  mainGridElementId?: string;
  snapMinutes: number;
  smartScroll?: {
    bottomInsetPx: number;
    speedPx: number;
  };
  timedColumnsElementId?: string;
  timedVisibleHours: number;
  visibleDateCount: number;
}

export interface CalendarDayColumnCache {
  index: number;
  left: number;
  width: number;
}

export interface CalendarEdgeNavigationCache {
  bottom: number;
  edgeThresholdPx: number;
  left: number;
  right: number;
  top: number;
}

export interface SmartScrollCache {
  bottom: number;
  edgeThresholdPx: number;
  element: HTMLElement;
  initialScrollTop: number;
  maxScrollTop: number;
  speedPx: number;
  top: number;
}

export interface CalendarLayoutCache {
  dayColumns: CalendarDayColumnCache[];
  edgeNavigation: CalendarEdgeNavigationCache;
  pixelsPerMinute: number;
  snapMinutes: number;
  smartScroll?: SmartScrollCache;
}

interface BuildCalendarDayColumnsInput {
  left: number;
  visibleDateCount: number;
  width: number;
}

export const buildTimedCalendarLayoutCache = ({
  edgeThresholdPx,
  mainGridElement,
  mainGridElementId,
  smartScroll,
  snapMinutes,
  timedColumnsElement,
  timedColumnsElementId,
  timedVisibleHours,
  visibleDateCount,
}: CalendarLayoutCacheOptions &
  CalendarLayoutCacheSources): CalendarLayoutCache | null => {
  const mainGrid = mainGridElement ?? getElementById(mainGridElementId);

  if (!mainGrid) {
    return null;
  }

  const rect = mainGrid.getBoundingClientRect();
  const columnsRect =
    getElementRect(timedColumnsElement) ??
    getElementRect(getElementById(timedColumnsElementId)) ??
    rect;

  return {
    dayColumns: buildCalendarDayColumns(columnsRect, visibleDateCount),
    edgeNavigation: {
      bottom: rect.bottom,
      edgeThresholdPx,
      left: columnsRect.left,
      right: columnsRect.right,
      top: rect.top,
    },
    pixelsPerMinute: rect.height / (timedVisibleHours * 60),
    snapMinutes,
    smartScroll: smartScroll
      ? {
          bottom: rect.bottom - smartScroll.bottomInsetPx,
          edgeThresholdPx,
          element: mainGrid,
          initialScrollTop: mainGrid.scrollTop,
          maxScrollTop: Math.max(
            0,
            mainGrid.scrollHeight - mainGrid.clientHeight,
          ),
          speedPx: smartScroll.speedPx,
          top: rect.top,
        }
      : undefined,
  };
};

export const buildAllDayCalendarLayoutCache = ({
  allDayColumnsElement,
  allDayColumnsElementId,
  edgeThresholdPx,
  snapMinutes,
  visibleDateCount,
}: CalendarLayoutCacheOptions &
  CalendarLayoutCacheSources): CalendarLayoutCache | null => {
  const rect = getElementRect(
    allDayColumnsElement ?? getElementById(allDayColumnsElementId),
  );

  if (!rect) {
    return null;
  }

  return {
    dayColumns: buildCalendarDayColumns(rect, visibleDateCount),
    edgeNavigation: {
      bottom: rect.bottom,
      edgeThresholdPx,
      left: rect.left,
      right: rect.right,
      top: rect.top,
    },
    pixelsPerMinute: 1,
    snapMinutes,
  };
};

export function buildCalendarDayColumns(
  input: BuildCalendarDayColumnsInput,
): CalendarDayColumnCache[];
export function buildCalendarDayColumns(
  input: Pick<DOMRect, "left" | "width">,
  visibleDateCount: number,
): CalendarDayColumnCache[];
export function buildCalendarDayColumns(
  input: BuildCalendarDayColumnsInput | Pick<DOMRect, "left" | "width">,
  visibleDateCount?: number,
): CalendarDayColumnCache[] {
  const safeVisibleDateCount = Math.max(
    1,
    visibleDateCount ??
      (input as BuildCalendarDayColumnsInput).visibleDateCount,
  );
  const columnWidth = input.width / safeVisibleDateCount;

  return Array.from({ length: safeVisibleDateCount }, (_, index) => ({
    index,
    left: input.left + columnWidth * index,
    width: columnWidth,
  }));
}

export const getNearestCalendarDayColumn = (
  columns: CalendarDayColumnCache[],
  x: number,
) => {
  let nearest: CalendarDayColumnCache | null = null;
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

export const getNearestDayColumn = getNearestCalendarDayColumn;

const getElementById = (id: string | undefined) =>
  id ? document.getElementById(id) : null;

const getElementRect = (element: HTMLElement | null | undefined) => {
  const rect = element?.getBoundingClientRect();

  return rect && rect.width > 0 ? rect : null;
};
